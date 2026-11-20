import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { isMain, loadToolEnv, maintenanceConfig, reportFailure, ToolError, withMaintenanceClient } from './maintenance-db.mjs';
import { verifyBaseline } from './migration-schema.mjs';

export const MIGRATIONS_DIRECTORY = fileURLToPath(new URL('../migrations/', import.meta.url));
export const MIGRATION_LOCK = '7523011843167';

// Strip SQL literals/comments before rejecting transaction control and known SQL
// that cannot safely participate in the runner's per-migration transaction.
export function assertTransactional(sql) {
  let code = '';
  for (let index = 0; index < sql.length;) {
    if (sql.startsWith('--', index)) {
      const end = sql.indexOf('\n', index);
      index = end < 0 ? sql.length : end;
      code += ' ';
    } else if (sql.startsWith('/*', index)) {
      let depth = 1;
      index += 2;
      while (index < sql.length && depth) {
        if (sql.startsWith('/*', index)) { depth++; index += 2; }
        else if (sql.startsWith('*/', index)) { depth--; index += 2; }
        else index++;
      }
      if (depth) throw new ToolError('La migración contiene un comentario SQL sin cerrar.');
      code += ' ';
    } else if (sql[index] === "'" || sql[index] === '"') {
      const quote = sql[index++];
      // PostgreSQL escape-string syntax E'...' also admits backslash escapes.
      const escaped = quote === "'" && /(?:^|[^\w])E$/i.test(sql.slice(0, index - 1));
      let closed = false;
      while (index < sql.length) {
        if (escaped && sql[index] === '\\') index += 2;
        else if (sql[index] === quote && sql[index + 1] === quote) index += 2;
        else if (sql[index++] === quote) { closed = true; break; }
      }
      if (!closed) throw new ToolError('La migración contiene un literal SQL sin cerrar.');
      code += ' literal ';
    } else if (sql[index] === '$' && /^\$(?:[a-z_][\w]*)?\$/i.test(sql.slice(index))) {
      const delimiter = /^\$(?:[a-z_][\w]*)?\$/i.exec(sql.slice(index))[0];
      const end = sql.indexOf(delimiter, index + delimiter.length);
      if (end < 0) throw new ToolError('La migración contiene un literal SQL sin cerrar.');
      index = end + delimiter.length;
      code += ' literal ';
    } else {
      code += sql[index++];
    }
  }
  if (/(?:^|;)\s*(?:BEGIN|START\s+TRANSACTION|COMMIT|END|ROLLBACK|ABORT|SAVEPOINT|RELEASE|PREPARE\s+TRANSACTION|SET|RESET|DISCARD|DO|CALL|CHECKPOINT|CLUSTER|REINDEX)\b|\b(?:CONCURRENTLY|VACUUM)\b|\b(?:CREATE|ALTER|DROP)\s+(?:DATABASE|TABLESPACE|SUBSCRIPTION)\b|\bALTER\s+SYSTEM\b/i.test(code)) {
    throw new ToolError('La migración contiene SQL no compatible con transacciones administradas.');
  }
}

export async function discoverMigrations(directory = MIGRATIONS_DIRECTORY) {
  const migrations = [];
  for (const name of (await readdir(directory)).sort()) {
    const match = /^(\d{3})-[a-z0-9-]+\.sql$/.exec(name);
    if (!match) {
      if (name.endsWith('.sql')) throw new ToolError('Hay un archivo SQL con nombre de migración inválido.');
      continue;
    }
    const sql = await readFile(join(directory, name), 'utf8');
    assertTransactional(sql);
    if (migrations.some((entry) => entry.version === match[1])) throw new ToolError('Hay versiones de migración duplicadas.');
    migrations.push({ name, version: match[1], sql, checksum: createHash('sha256').update(sql).digest('hex'), optional: match[1] === '002' });
  }
  for (const required of ['001', '003', '004']) {
    if (!migrations.some((entry) => entry.version === required)) throw new ToolError(`Falta la migración obligatoria ${required}.`);
  }
  return migrations;
}

export async function transaction(client, action) {
  await client.query('BEGIN');
  try {
    const result = await action();
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { /* Connection teardown releases the lock if disconnected. */ }
    throw error;
  }
}

async function createHistory(client) {
  await client.query(`CREATE TABLE public.schema_migrations (
    version text PRIMARY KEY, name text NOT NULL,
    checksum text NOT NULL CHECK (checksum ~ '^[a-f0-9]{64}$'),
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
}

async function recordMigration(client, migration) {
  await client.query('INSERT INTO public.schema_migrations (version, name, checksum) VALUES ($1, $2, $3)',
    [migration.version, migration.name, migration.checksum]);
}

export function pendingMigrations(migrations, history) {
  const recorded = new Set();
  for (const row of history) {
    const migration = migrations.find((entry) => entry.version === row.version);
    if (!migration || row.name !== migration.name || row.checksum !== migration.checksum || recorded.has(row.version)) {
      throw new ToolError('El historial no coincide con los archivos: versión desconocida o checksum modificado. Restaurá los archivos originales; no reescribas el historial.');
    }
    recorded.add(row.version);
  }
  const required = migrations.filter((migration) => !migration.optional);
  let gap = false;
  for (const migration of required) {
    if (!recorded.has(migration.version)) gap = true;
    else if (gap) throw new ToolError('El historial tiene una migración obligatoria anterior pendiente. Reconciliá el historial explícitamente.');
  }
  return required.filter((migration) => !recorded.has(migration.version));
}

export async function migrate(client, { directory = MIGRATIONS_DIRECTORY, baseline } = {}) {
  const migrations = await discoverMigrations(directory);
  const required = migrations.filter((migration) => !migration.optional);
  if (baseline && !required.some((migration) => migration.version === baseline)) {
    throw new ToolError('Elegí una versión obligatoria existente para --baseline=VERSIÓN.');
  }
  await client.query('SELECT pg_advisory_lock($1::bigint)', [MIGRATION_LOCK]);
  try {
    await client.query('SET search_path TO public, pg_catalog');
    const existing = await client.query("SELECT to_regclass('public.schema_migrations') AS history");
    if (!existing.rows[0].history) {
      const relations = await client.query(`SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f') LIMIT 1`);
      if (relations.rowCount && !baseline) {
        throw new ToolError('La base existente no tiene historial. Hacé una copia de seguridad, inspeccioná el esquema y ejecutá --baseline=001, --baseline=003 o --baseline=004 según corresponda. La adopción requiere verificación completa.');
      }
      if (!relations.rowCount && baseline) throw new ToolError('La base está vacía: ejecutá la migración sin --baseline.');
      await transaction(client, async () => {
        const adopted = baseline ? required.filter((migration) => migration.version <= baseline) : [];
        if (baseline) await verifyBaseline(client, adopted);
        await createHistory(client);
        for (const migration of adopted) await recordMigration(client, migration);
      });
    } else if (baseline) {
      throw new ToolError('Ya existe historial; --baseline no puede modificarlo.');
    }
    const history = await client.query('SELECT version, name, checksum FROM public.schema_migrations ORDER BY version');
    const pending = pendingMigrations(migrations, history.rows);
    for (const migration of pending) {
      try {
        await transaction(client, async () => {
          await client.query(migration.sql);
          await recordMigration(client, migration);
        });
      } catch {
        throw new ToolError(`Falló la migración ${migration.version}; se solicitó revertir su transacción. Revisá el historial, los permisos y la compatibilidad del esquema.`);
      }
    }
    return pending.map((migration) => migration.version);
  } finally {
    await client.query('SELECT pg_advisory_unlock($1::bigint)', [MIGRATION_LOCK]);
  }
}

export async function main(args = process.argv.slice(2)) {
  if (args.length > 1 || (args.length && !/^--baseline=\d{3}$/.test(args[0]))) {
    throw new ToolError('Uso: node scripts/migrate.mjs [--baseline=VERSIÓN]');
  }
  loadToolEnv();
  const applied = await withMaintenanceClient(maintenanceConfig(), (client) => migrate(client, { baseline: args[0]?.split('=')[1] }));
  process.stdout.write(applied.length ? `Migraciones aplicadas: ${applied.join(', ')}.\n` : 'No hay migraciones pendientes.\n');
}

if (isMain(import.meta.url)) {
  main().catch((error) => { reportFailure(error); process.exitCode = 1; });
}
