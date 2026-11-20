import { describe, it, expect } from 'vitest';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { assertTransactional, discoverMigrations, migrate, MIGRATIONS_DIRECTORY, pendingMigrations } from '../migrate.mjs';
import { verifyBaseline } from '../migration-schema.mjs';

class MockClient {
  calls = [];
  history = [];
  historyExists = false;
  existingSchema = false;
  failMigration = false;
  failHistory = false;
  mismatch = false;
  extension = true;
  async query(text, values = []) {
    this.calls.push({ text, values });
    if (text.includes('pg_advisory_')) return { rows: [{}], rowCount: 1 };
    if (text.includes('to_regclass')) return { rows: [{ history: this.historyExists ? 'schema_migrations' : null }] };
    if (text.startsWith('SELECT 1 FROM pg_class')) return { rowCount: Number(this.existingSchema), rows: [] };
    if (text.includes('FROM pg_extension')) return { rowCount: Number(this.extension), rows: [] };
    if (text.includes('JOIN pg_attribute')) {
      return { rows: [{ table_name: 'users', type: this.mismatch && values[0] === 'public' ? 'text' : 'citext' }] };
    }
    if (text.includes('FROM pg_constraint') || text.includes('FROM pg_index')) return { rows: [] };
    if (text === 'BEGIN') this.snapshot = { history: [...this.history], historyExists: this.historyExists };
    if (text === 'ROLLBACK') Object.assign(this, this.snapshot);
    if (text.startsWith('CREATE TABLE public.schema_migrations')) this.historyExists = true;
    if (text.startsWith('INSERT INTO public.schema_migrations')) {
      if (this.failHistory) throw Error('sensitive history error');
      this.history.push({ version: values[0], name: values[1], checksum: values[2] });
    }
    if (text.startsWith('SELECT version, name, checksum')) return { rows: [...this.history] };
    if (this.failMigration && text.startsWith('-- 003-')) throw Error('secret: SQL failed');
    return { rows: [], rowCount: 0 };
  }
}

describe('tracked migration runner', () => {
  it('discovers immutable SQL with SHA-256 and excludes only optional 002 from pending work', async () => {
    const files = await discoverMigrations();
    expect(files.map((file) => file.version)).toEqual(['001', '002', '003', '004']);
    expect(files.every((file) => /^[a-f0-9]{64}$/.test(file.checksum))).toBe(true);
    expect(pendingMigrations(files, []).map((file) => file.version)).toEqual(['001', '003', '004']);
  });

  it('serializes inspection, executes each migration/history pair atomically, and is repeatable', async () => {
    const client = new MockClient();
    await expect(migrate(client)).resolves.toEqual(['001', '003', '004']);
    expect(client.calls[0].text).toContain('pg_advisory_lock(');
    expect(client.calls.at(-1).text).toContain('pg_advisory_unlock(');
    expect(client.history.map((entry) => entry.version)).toEqual(['001', '003', '004']);
    for (const version of ['001', '003', '004']) {
      const insertion = client.calls.findIndex((call) => call.text.startsWith('INSERT INTO') && call.values[0] === version);
      expect(client.calls[insertion - 2].text).toBe('BEGIN');
      expect(client.calls[insertion - 1].text).toContain(version === '004' ? 'ADD COLUMN image_key' : `-- ${version}-`);
      expect(client.calls[insertion + 1].text).toBe('COMMIT');
    }
    client.calls = [];
    await expect(migrate(client)).resolves.toEqual([]);
    expect(client.calls.some((call) => call.text === 'BEGIN')).toBe(false);
  });

  it('rolls back SQL failure, preserves earlier commits, and always unlocks', async () => {
    const client = new MockClient();
    client.failMigration = true;
    await expect(migrate(client)).rejects.toThrow('Falló la migración 003');
    expect(client.history.map((entry) => entry.version)).toEqual(['001']);
    expect(client.calls.at(-2).text).toBe('ROLLBACK');
    expect(client.calls.at(-1).text).toContain('pg_advisory_unlock(');
  });

  it('rolls back a migration if its history insertion fails', async () => {
    const client = new MockClient();
    client.failHistory = true;
    await expect(migrate(client)).rejects.toThrow('Falló la migración 001');
    expect(client.history).toEqual([]);
    expect(client.calls.at(-2).text).toBe('ROLLBACK');
  });

  it('refuses checksum drift before applying any pending SQL and releases the lock', async () => {
    const client = new MockClient();
    const [first] = await discoverMigrations();
    client.historyExists = true;
    client.history = [{ ...first, checksum: 'a'.repeat(64) }];
    await expect(migrate(client)).rejects.toThrow('checksum');
    expect(client.calls.some((call) => call.text === 'BEGIN')).toBe(false);
    expect(client.calls.at(-1).text).toContain('pg_advisory_unlock(');
  });

  it('rejects unknown history versions, renamed files, duplicate history, and required gaps', async () => {
    const files = await discoverMigrations();
    expect(() => pendingMigrations(files, [{ version: '099' }])).toThrow();
    expect(() => pendingMigrations(files, [{ ...files[0], name: '001-renamed.sql' }])).toThrow();
    expect(() => pendingMigrations(files, [files[0], files[0]])).toThrow();
    expect(() => pendingMigrations(files, [files[2]])).toThrow('anterior pendiente');
    expect(pendingMigrations(files, [files[0], files[1]]).map((file) => file.version)).toEqual(['003', '004']);
  });

  it('refuses untracked existing schemas without creating history or running IF NOT EXISTS SQL', async () => {
    const client = new MockClient();
    client.existingSchema = true;
    await expect(migrate(client)).rejects.toThrow('--baseline=003');
    expect(client.historyExists).toBe(false);
    expect(client.calls.some((call) => call.text.includes('CREATE TABLE'))).toBe(false);
  });

  it('verifies an explicit baseline before history creation, then applies later SQL', async () => {
    const client = new MockClient();
    client.existingSchema = true;
    await expect(migrate(client, { baseline: '003' })).resolves.toEqual(['004']);
    expect(client.history.map((entry) => entry.version)).toEqual(['001', '003', '004']);
    const compare = client.calls.findIndex((call) => call.text.includes('CREATE SCHEMA'));
    const history = client.calls.findIndex((call) => call.text.startsWith('CREATE TABLE public.schema_migrations'));
    expect(compare).toBeLessThan(history);
    expect(client.calls.some((call) => call.text.startsWith('DROP SCHEMA'))).toBe(true);
  });

  it('rolls back incompatible baseline verification and leaves no history', async () => {
    const client = new MockClient();
    client.existingSchema = true;
    client.mismatch = true;
    await expect(migrate(client, { baseline: '003' })).rejects.toThrow('no coincide');
    expect(client.historyExists).toBe(false);
    expect(client.calls.at(-2).text).toBe('ROLLBACK');
    expect(client.calls.at(-1).text).toContain('pg_advisory_unlock(');
  });

  it('requires citext before baseline adoption and rejects baseline over existing history', async () => {
    const client = new MockClient();
    client.extension = false;
    await expect(verifyBaseline(client, [])).rejects.toThrow('citext');
    client.historyExists = true;
    await expect(migrate(client, { baseline: '003' })).rejects.toThrow('Ya existe historial');
    await expect(migrate(new MockClient(), { baseline: '003' })).rejects.toThrow('vacía');
    await expect(migrate(new MockClient(), { baseline: '002' })).rejects.toThrow('obligatoria');
  });

  it('rejects duplicate numbered versions and missing required migrations', async () => {
    const directory = await mkdtemp(join(process.env.TMPDIR || '/tmp/opencode', 'lawho-migrations-'));
    try {
      await writeFile(join(directory, '001-init.sql'), 'SELECT 1;');
      await expect(discoverMigrations(directory)).rejects.toThrow('Falta');
      await writeFile(join(directory, '001-duplicate.sql'), 'SELECT 2;');
      await expect(discoverMigrations(directory)).rejects.toThrow('duplicadas');
    } finally { await rm(directory, { recursive: true }); }
  });

  it('004 adds nullable format-checked keys with uniqueness excluding nulls', async () => {
    const sql = await readFile(join(MIGRATIONS_DIRECTORY, '004-note-image-key.sql'), 'utf8');
    expect(sql).toContain('ADD COLUMN image_key text NULL');
    expect(sql).toContain('CREATE UNIQUE INDEX');
    expect(sql).toContain('WHERE image_key IS NOT NULL');
    expect(sql).toContain("'^notes/[a-f0-9]{32}\\.(jpg|png)$'");
  });

  it.each(['COMMIT;', 'BEGIN; SELECT 1;', 'CREATE INDEX CONCURRENTLY x ON notes(id);', 'VACUUM notes;', 'CREATE DATABASE test;', 'SET search_path TO evil;', 'DO $$ BEGIN COMMIT; END $$;', 'CALL unsafe();', 'REINDEX SYSTEM postgres;', 'CHECKPOINT;', 'CLUSTER;', 'CREATE SUBSCRIPTION test;', '/* outer /* nested */ still outer */ COMMIT;'])
    ('rejects unsupported SQL: %s', (sql) => { expect(() => assertTransactional(sql)).toThrow(); });

  it('allows SQL strings/comments that contain transaction words', () => {
    expect(() => assertTransactional("-- COMMIT\nSELECT 'VACUUM', $$COMMIT$$; /* BEGIN */ SELECT 1;")).not.toThrow();
    expect(() => assertTransactional('/* outer /* COMMIT */ nested */ SELECT "VACUUM";')).not.toThrow();
    expect(() => assertTransactional("SELECT E'It\\'s COMMIT';")).not.toThrow();
    expect(() => assertTransactional("SELECT 'unclosed")).toThrow('sin cerrar');
  });
});
