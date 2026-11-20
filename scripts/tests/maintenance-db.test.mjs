import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { maintenanceConfig, reportFailure, ToolError, withMaintenanceClient } from '../maintenance-db.mjs';

const url = 'postgresql://maintainer:secret@example.neon.tech/lawho?sslmode=require';

describe('maintenance database boundary', () => {
  it('uses only the direct maintenance URL and upgrades require to verified TLS', () => {
    const config = maintenanceConfig({ MIGRATION_DATABASE_URL: url, DATABASE_URL: 'bad', PGSSLMODE: 'no-verify' });
    expect(config).toMatchObject({ host: 'example.neon.tech', database: 'lawho', user: 'maintainer', ssl: { rejectUnauthorized: true } });
    expect(config).not.toHaveProperty('connectionString');
  });

  it.each([
    undefined, 'not a url', 'https://user:secret@example.com/db',
    'postgres://user:secret@ep-test-pooler.neon.tech/db',
    'postgres://user:secret@remote/db?sslmode=disable',
    'postgres://user:secret@remote/db?sslmode=no-verify',
    'postgres://user:secret@remote/db?sslmode=prefer',
    'postgres://user:secret@remote/db?sslrootcert=system',
    'postgres://user:secret@remote/db?host=localhost',
    'postgres://user:secret@remote/db?sslmode=require&sslmode=disable',
    'postgres://user:secret@remote/db?options=-csearch_path=evil',
    'postgres://user@remote/db', 'postgres://user:secret@remote/',
    'postgres://user:secret@remote/db#fragment',
    'postgres://user:secret@remote:0/db',
    'postgres://user:sec%00ret@remote/db',
  ])('rejects missing/unsafe URLs without echoing them (%#)', (value) => {
    expect(() => maintenanceConfig({ MIGRATION_DATABASE_URL: value })).toThrow(ToolError);
    try { maintenanceConfig({ MIGRATION_DATABASE_URL: value }); } catch (error) {
      expect(error.message).not.toContain('secret');
    }
  });

  it('allows explicitly local PostgreSQL without TLS and decodes credentials', () => {
    expect(maintenanceConfig({ MIGRATION_DATABASE_URL: 'postgres://a:b%40c@127.0.0.1:5433/test?sslmode=disable' }))
      .toMatchObject({ host: '127.0.0.1', port: 5433, password: 'b@c', ssl: false });
    expect(maintenanceConfig({ MIGRATION_DATABASE_URL: 'postgres://a:b@[::1]/test' }).host).toBe('::1');
    expect(maintenanceConfig({ MIGRATION_DATABASE_URL: 'postgres://a:b@localhost/test?sslmode=require' }).ssl)
      .toEqual({ rejectUnauthorized: true });
  });

  it.each(['success', 'query failure', 'connect failure'])('closes its owned client on %s', async (mode) => {
    const calls = [];
    class Client {
      async connect() { calls.push('connect'); if (mode === 'connect failure') throw Error('secret'); }
      async end() { calls.push('end'); }
    }
    const action = async () => { calls.push('action'); if (mode === 'query failure') throw Error('secret'); return 1; };
    const promise = withMaintenanceClient({}, action, Client);
    if (mode === 'success') await expect(promise).resolves.toBe(1);
    else await expect(promise).rejects.toThrow();
    expect(calls.at(-1)).toBe('end');
  });

  it('never prints raw database errors', () => {
    let text = '';
    reportFailure(Error('postgresql://user:secret@host/db'), { write: (value) => { text += value; } });
    expect(text).not.toContain('secret');
    expect(text).toContain('operación falló');
  });

  it('turns idle pg error events into a caught failure and still closes the client', async () => {
    let closed = false;
    class Client extends EventEmitter {
      async connect() {}
      async end() { closed = true; }
    }
    await expect(withMaintenanceClient({}, async (client) => {
      client.emit('error', Error('sensitive idle failure'));
    }, Client)).rejects.toThrow('idle failure');
    expect(closed).toBe(true);
  });

  it('loads optional .env only explicitly, preserving exported values', async () => {
    const directory = await mkdtemp('/tmp/opencode/lawho-tool-env-');
    try {
      const envFile = join(directory, '.env');
      await writeFile(envFile, 'LAWHO_TOOL_TEST=from-file\n');
      const result = execFileSync(process.execPath, ['--input-type=module', '-e',
        `import { loadToolEnv } from './scripts/maintenance-db.mjs';
         loadToolEnv(${JSON.stringify(join(directory, 'missing'))});
         loadToolEnv(${JSON.stringify(envFile)});
         process.stdout.write(process.env.LAWHO_TOOL_TEST);`],
      { cwd: process.cwd(), env: { ...process.env, LAWHO_TOOL_TEST: 'exported' }, encoding: 'utf8' });
      expect(result).toBe('exported');
    } finally { await rm(directory, { recursive: true }); }
  });

  it('imports both CLIs safely under plain Node without configuration or remote work', () => {
    const result = execFileSync(process.execPath, ['--input-type=module', '-e',
      `delete process.env.MIGRATION_DATABASE_URL;
       await import('./scripts/migrate.mjs');
       await import('./scripts/create-user.mjs');
       process.stdout.write('safe');`], { cwd: process.cwd(), encoding: 'utf8' });
    expect(result).toBe('safe');
  });
});
