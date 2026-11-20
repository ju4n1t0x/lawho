import { it, expect, vi } from 'vitest';
import pg from 'pg';
import { maintenanceConfig } from '../maintenance-db.mjs';
import { discoverMigrations, migrate } from '../migrate.mjs';
import { provisionWriter } from '../create-user.mjs';
import { verifyPassword } from '../../src/lib/password.ts';
const dependencies = vi.hoisted(() => ({ pool: null }));
vi.mock('../../src/lib/db', () => ({ getPool: () => dependencies.pool }));
import { replaceNoteImage } from '../../src/lib/notes-repo.ts';

const enabled = process.env.LAWHO_RUN_DB_INTEGRATION === '1' && Boolean(process.env.MIGRATION_DATABASE_URL);

it.skipIf(!enabled)('isolated PostgreSQL: fresh/repeat/concurrent migrations, verified baselines, writer, and image constraints', async () => {
  // Deliberately never load .env. This requires explicit disposable-target opt-in.
  const config = maintenanceConfig();
  const client = new pg.Client(config);
  const second = new pg.Client(config);
  let ownsSchema = false;
  let ownsExtension = false;
  const cleanup = async () => {
    await client.query('DROP TABLE IF EXISTS public.schema_migrations, public.sessions, public.users, public.notes CASCADE');
  };
  try {
    await client.connect();
    const existing = await client.query(`SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f') LIMIT 1`);
    if (existing.rowCount) throw Error('Integration test requires an empty disposable public schema.');
    const extension = await client.query("SELECT 1 FROM pg_extension WHERE extname = 'citext'");
    ownsExtension = !extension.rowCount;
    ownsSchema = true;
    await second.connect();
    const runs = await Promise.all([migrate(client), migrate(second)]);
    expect(runs.map((run) => run.length).sort()).toEqual([0, 3]);
    await expect(migrate(client)).resolves.toEqual([]);
    const history = await client.query('SELECT version FROM public.schema_migrations ORDER BY version');
    expect(history.rows.map((row) => row.version)).toEqual(['001', '003', '004']);

    const credentials = { email: 'Writer@example.org', password: 'valid-test-password', confirmation: 'valid-test-password' };
    await provisionWriter(client, credentials);
    const user = await client.query('SELECT password_hash, role, is_active FROM public.users WHERE email=$1', ['writer@example.org']);
    expect(await verifyPassword(credentials.password, user.rows[0].password_hash)).toBe(true);
    expect(user.rows[0]).toMatchObject({ role: 'writer', is_active: true });
    await expect(provisionWriter(client, { ...credentials, email: 'writer@example.org' })).rejects.toThrow('Ya existe');

    const key = `notes/${'a'.repeat(32)}.jpg`;
    await client.query('UPDATE public.notes SET image_key=$1', [key]);

    dependencies.pool = new pg.Pool({ ...config, max: 2 });
    const replacements = ['b', 'c'].map((suffix) => ({
      title: 'Replacement', subtitle: 'Subtitle', body: 'Body',
      imageKey: `notes/${suffix.repeat(32)}.jpg`, imageUrl: `/media/notes/${suffix.repeat(32)}.jpg`,
    }));
    const replaced = await Promise.all(replacements.map((fields) => replaceNoteImage('primer-operativo-2024', fields)));
    const final = (await client.query('SELECT image_key FROM public.notes')).rows[0].image_key;
    expect(new Set(replaced.map((result) => result.previousImageKey))).toEqual(new Set([
      key, replacements.find((image) => image.imageKey !== final).imageKey,
    ]));
    await client.query('UPDATE public.notes SET image_key=$1', [key]);
    await expect(client.query('UPDATE public.notes SET image_key=$1', ['pending/wrong.png'])).rejects.toMatchObject({ code: '23514' });
    await expect(client.query(`INSERT INTO public.notes (slug, title, subtitle, body, image_url, date, image_key)
      VALUES ('duplicate-key', 'title', 'subtitle', 'body', '/media/test', now(), $1)`, [key])).rejects.toMatchObject({ code: '23505' });
    await client.query('DROP TABLE public.schema_migrations');
    await expect(migrate(client)).rejects.toThrow('no tiene historial');
    await expect(migrate(client, { baseline: '004' })).resolves.toEqual([]);

    // A deliberately incompatible baseline must leave no history behind.
    await client.query('DROP TABLE public.schema_migrations');
    await client.query('ALTER TABLE public.notes ALTER COLUMN title DROP NOT NULL');
    await expect(migrate(client, { baseline: '004' })).rejects.toThrow('no coincide');
    expect((await client.query("SELECT to_regclass('public.schema_migrations') AS history")).rows[0].history).toBeNull();

    // 003 adoption verifies legacy tables and applies 004 afterwards.
    await cleanup();
    const files = await discoverMigrations();
    await client.query(files.find((file) => file.version === '001').sql);
    await client.query(files.find((file) => file.version === '003').sql);
    await expect(migrate(client, { baseline: '003' })).resolves.toEqual(['004']);
  } finally {
    try {
      if (ownsSchema) await cleanup();
      if (ownsExtension) await client.query('DROP EXTENSION IF EXISTS citext');
    } finally {
      await dependencies.pool?.end();
      dependencies.pool = null;
      await Promise.allSettled([client.end(), second.end()]);
    }
  }
}, 60_000);
