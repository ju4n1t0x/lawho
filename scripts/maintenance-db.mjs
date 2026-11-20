import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import pg from 'pg';

export class ToolError extends Error {}

export function isMain(moduleUrl) {
  return Boolean(process.argv[1]) && moduleUrl === pathToFileURL(resolve(process.argv[1])).href;
}

export function loadToolEnv(path = resolve('.env')) {
  if (existsSync(path)) process.loadEnvFile(path);
}

export function maintenanceConfig(env = process.env) {
  let url;
  try {
    url = new URL(env.MIGRATION_DATABASE_URL);
  } catch {
    throw new ToolError('Configurá MIGRATION_DATABASE_URL con una conexión PostgreSQL directa.');
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !host ||
      !url.username || !url.password || url.pathname.length < 2 || url.hash) {
    throw new ToolError('MIGRATION_DATABASE_URL no es una conexión PostgreSQL completa.');
  }
  if (host.toLowerCase().includes('-pooler')) {
    throw new ToolError('Usá el endpoint directo, no el endpoint agrupado -pooler.');
  }
  // Do not let pg connection-string options override TLS or redirect the host.
  for (const key of url.searchParams.keys()) {
    if (!['sslmode', 'channel_binding'].includes(key) || url.searchParams.getAll(key).length !== 1) {
      throw new ToolError('La URL solo admite las opciones sslmode y channel_binding.');
    }
  }
  const local = ['localhost', '127.0.0.1', '::1'].includes(host.toLowerCase());
  const mode = url.searchParams.get('sslmode');
  if (mode && !['require', 'verify-ca', 'verify-full', ...(local ? ['disable'] : [])].includes(mode)) {
    throw new ToolError('La conexión requiere TLS con certificado verificado fuera de localhost.');
  }
  const binding = url.searchParams.get('channel_binding');
  if (binding && !['require', 'prefer', 'disable'].includes(binding)) {
    throw new ToolError('La opción channel_binding no es válida.');
  }
  let user, password, database;
  try {
    user = decodeURIComponent(url.username);
    password = decodeURIComponent(url.password);
    database = decodeURIComponent(url.pathname.slice(1));
  } catch {
    throw new ToolError('MIGRATION_DATABASE_URL contiene una codificación inválida.');
  }
  if (url.port === '0' || [user, password, database].some((value) => value.includes('\0'))) {
    throw new ToolError('MIGRATION_DATABASE_URL contiene parámetros inválidos.');
  }
  return {
    host, port: Number(url.port || 5432), user, password, database,
    ssl: local && (!mode || mode === 'disable') ? false : { rejectUnauthorized: true },
    enableChannelBinding: binding !== 'disable',
    options: '-c search_path=public,pg_catalog',
    connectionTimeoutMillis: 15_000,
    application_name: 'lawho-maintenance',
  };
}

export async function withMaintenanceClient(config, action, Client = pg.Client) {
  const client = new Client(config);
  let idleError;
  // Prevent an idle pg error event from becoming an uncaught, unsanitized dump.
  const onError = (error) => { idleError = error; };
  client.on?.('error', onError);
  try {
    await client.connect();
    const result = await action(client);
    if (idleError) throw idleError;
    return result;
  } finally {
    try { await client.end(); } finally { client.off?.('error', onError); }
  }
}

export function reportFailure(error, output = process.stderr) {
  output.write(`${error instanceof ToolError ? error.message : 'La operación falló. Revisá la conexión, los permisos y el esquema; no se muestran detalles sensibles.'}\n`);
}
