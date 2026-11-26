import { validateEmail } from './create-user.mjs';
import { isMain, loadToolEnv, maintenanceConfig, reportFailure, ToolError, withMaintenanceClient } from './maintenance-db.mjs';

const MAX_SEED_USERS = 50;
export const ARGON2ID_HASH = /^\$argon2id\$v=\d+\$(?:[mtp]=\d+)(?:,(?:[mtp]=\d+))*\$[A-Za-z0-9+/]+={0,2}\$[A-Za-z0-9+/]+={0,2}$/;
const ALLOWED_FIELDS = ['email', 'password_hash'];

/**
 * Parse the SEED_USERS JSON array. Only pre-computed Argon2id hashes are
 * accepted: this tool never handles or persists plaintext passwords.
 */
export function parseSeedUsers(raw) {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new ToolError('Configurá SEED_USERS en el .env con una lista JSON de usuarios.');
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ToolError('SEED_USERS no es JSON válido. Envolvé el valor en comillas simples dentro del .env.');
  }
  if (!Array.isArray(parsed) || !parsed.length) {
    throw new ToolError('SEED_USERS debe ser una lista JSON con al menos un usuario.');
  }
  if (parsed.length > MAX_SEED_USERS) {
    throw new ToolError(`SEED_USERS admite hasta ${MAX_SEED_USERS} usuarios por ejecución.`);
  }
  const seen = new Set();
  return parsed.map((entry, index) => {
    const position = index + 1;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new ToolError(`El usuario ${position} debe ser un objeto JSON.`);
    }
    if ('password' in entry) {
      throw new ToolError(`El usuario ${position} incluye "password". Usá "password_hash" con un hash Argon2id; este seeder no acepta contraseñas en claro.`);
    }
    for (const field of Object.keys(entry)) {
      if (!ALLOWED_FIELDS.includes(field)) {
        throw new ToolError(`El usuario ${position} tiene un campo desconocido: ${field}.`);
      }
    }
    let email;
    try {
      email = validateEmail(entry.email);
    } catch {
      throw new ToolError(`El usuario ${position} no tiene un correo electrónico válido.`);
    }
    const passwordHash = typeof entry.password_hash === 'string' ? entry.password_hash.trim() : '';
    if (!ARGON2ID_HASH.test(passwordHash)) {
      throw new ToolError(`El usuario ${position} no tiene un password_hash Argon2id válido.`);
    }
    const normalized = email.toLowerCase();
    if (seen.has(normalized)) {
      throw new ToolError(`El correo del usuario ${position} está repetido en SEED_USERS.`);
    }
    seen.add(normalized);
    return { email, passwordHash };
  });
}

/**
 * Insert writers idempotently. Existing emails are left untouched so a seeding
 * run never resets a password or re-activates an account.
 */
export async function seedUsers(client, users) {
  const created = [];
  const skipped = [];
  for (const { email, passwordHash } of users) {
    const result = await client.query(
      `INSERT INTO public.users (email, password_hash, role, is_active)
       VALUES ($1, $2, 'writer', true)
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      [email, passwordHash],
    );
    if (result.rowCount) created.push(email);
    else skipped.push(email);
  }
  return { created, skipped };
}

export async function runSeed(env = process.env) {
  if (env.VERCEL) {
    throw new ToolError('El seeder es una operación manual de mantenimiento; no se ejecuta en Vercel.');
  }
  const users = parseSeedUsers(env.SEED_USERS);
  const config = maintenanceConfig(env);
  return withMaintenanceClient(config, (client) => seedUsers(client, users));
}

function report({ created, skipped }, output = process.stdout) {
  output.write(`Cuentas creadas: ${created.length}\n`);
  for (const email of created) output.write(`  - ${email}\n`);
  output.write(`Cuentas ya existentes (sin cambios): ${skipped.length}\n`);
  for (const email of skipped) output.write(`  - ${email}\n`);
  if (created.length) {
    output.write('Quitá SEED_USERS del .env: ya no hace falta conservar esos hashes ahí.\n');
  }
}

export async function main(args = process.argv.slice(2)) {
  if (args.length) throw new ToolError('Uso: node scripts/seed-users.mjs (sin argumentos).');
  loadToolEnv();
  report(await runSeed());
}

if (isMain(import.meta.url)) {
  main().catch((error) => { reportFailure(error); process.exitCode = 1; });
}
