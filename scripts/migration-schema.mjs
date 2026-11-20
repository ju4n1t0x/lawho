import { randomBytes } from 'node:crypto';
import { ToolError } from './maintenance-db.mjs';

const tables = ['users', 'sessions', 'notes'];

// Compare catalog definitions, not IF NOT EXISTS outcomes or application data.
export async function schemaSignature(client, schema) {
  const parameters = [schema, tables];
  const columns = await client.query(`
    SELECT c.relname AS table_name, c.relkind, c.relpersistence, a.attname,
      format_type(a.atttypid, a.atttypmod) AS type, a.attnotnull,
      a.attidentity, a.attgenerated, pg_get_expr(d.adbin, d.adrelid) AS default_value,
      pg_get_serial_sequence(format('%I.%I', n.nspname, c.relname), a.attname) AS owned_sequence,
      coll.collname AS collation
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
    LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
    LEFT JOIN pg_collation coll ON coll.oid = a.attcollation
    WHERE n.nspname = $1 AND c.relname = ANY($2::text[])
    ORDER BY c.relname, a.attnum`, parameters);
  const constraints = await client.query(`
    SELECT c.relname AS table_name, x.contype, x.convalidated,
      x.condeferrable, x.condeferred, pg_get_constraintdef(x.oid, true) AS definition
    FROM pg_constraint x JOIN pg_class c ON c.oid = x.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = $1 AND c.relname = ANY($2::text[])`, parameters);
  const indexes = await client.query(`
    SELECT c.relname AS table_name, i.indisunique, i.indisprimary,
      i.indisvalid, i.indisready, pg_get_indexdef(i.indexrelid) AS definition
    FROM pg_index i JOIN pg_class c ON c.oid = i.indrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = $1 AND c.relname = ANY($2::text[])`, parameters);
  const normalize = (row) => JSON.stringify(row)
    .replaceAll(`${schema}.`, '').replaceAll('public.', '');
  return JSON.stringify({
    columns: columns.rows.map(normalize),
    constraints: constraints.rows.map(normalize).sort(),
    indexes: indexes.rows.map((row) => normalize({
      ...row, definition: row.definition.slice(row.definition.indexOf(' USING ')),
    })).sort(),
  });
}

export async function verifyBaseline(client, migrations) {
  const extension = await client.query(`
    SELECT 1 FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'citext' AND n.nspname = 'public'`);
  if (!extension.rowCount) {
    throw new ToolError('La línea base requiere la extensión citext en public. Reconciliá el esquema antes de continuar.');
  }
  const actual = await schemaSignature(client, 'public');
  const schema = `lawho_verify_${randomBytes(12).toString('hex')}`;
  // This reference schema lives inside the baseline transaction; no data is adopted.
  await client.query(`CREATE SCHEMA "${schema}"`);
  await client.query(`SET LOCAL search_path TO "${schema}", public`);
  for (const migration of migrations) await client.query(migration.sql);
  const expected = await schemaSignature(client, schema);
  if (actual !== expected) {
    throw new ToolError('El esquema no coincide con la línea base: revisá tablas, columnas, valores por defecto, restricciones e índices. Reconciliá explícitamente y repetí --baseline=VERSIÓN; no edites el historial.');
  }
  await client.query(`DROP SCHEMA "${schema}" CASCADE`);
  await client.query('SET LOCAL search_path TO public, pg_catalog');
}
