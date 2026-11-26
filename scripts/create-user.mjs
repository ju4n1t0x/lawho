import { createInterface } from 'node:readline/promises';
import { StringDecoder } from 'node:string_decoder';
import { hashPassword, validatePasswordLength } from '../src/lib/password.ts';
import { isMain, loadToolEnv, maintenanceConfig, reportFailure, ToolError, withMaintenanceClient } from './maintenance-db.mjs';

export function validateEmail(value) {
  const email = typeof value === 'string' ? value.trim() : '';
  if (email.length > 254 || !/^[^\s@\x00-\x1f\x7f]+@[^\s@\x00-\x1f\x7f]+\.[^\s@\x00-\x1f\x7f]+$/.test(email)) {
    throw new ToolError('Ingresá un correo electrónico válido.');
  }
  return email;
}

export function readHiddenPassword(prompt, input = process.stdin, output = process.stdout) {
  if (!input.isTTY || !output.isTTY || typeof input.setRawMode !== 'function') {
    return Promise.reject(new ToolError('La contraseña requiere una terminal interactiva (TTY); no uses argumentos ni tuberías.'));
  }
  return new Promise((resolve, reject) => {
    let password = '';
    const decoder = new StringDecoder('utf8');
    const wasRaw = Boolean(input.isRaw);
    const wasPaused = input.isPaused();
    const finish = (error) => {
      input.off('data', onData);
      input.off('end', onEnd);
      input.off('error', onError);
      process.off('SIGTERM', onTerminate);
      input.setRawMode(wasRaw);
      if (wasPaused) input.pause();
      output.write('\n');
      if (error) reject(error);
      else resolve(password);
      password = '';
    };
    const onEnd = () => finish(new ToolError('La entrada terminó antes de confirmar la contraseña.'));
    const onError = () => finish(new ToolError('No se pudo leer la contraseña.'));
    const onTerminate = () => finish(new ToolError('Operación cancelada.'));
    const onData = (chunk) => {
      const text = typeof chunk === 'string' ? chunk : decoder.write(chunk);
      for (const character of text) {
        if (character === '\r' || character === '\n') return finish();
        if (character === '\u0003' || character === '\u0004') return finish(new ToolError('Operación cancelada.'));
        if (character === '\u007f' || character === '\b') password = Array.from(password).slice(0, -1).join('');
        else if (character === '\u0015') password = '';
        else if (/[\x00-\x1f]/.test(character)) return finish(new ToolError('La contraseña no admite controles de terminal.'));
        else password += character;
        if (password.length > 128) return finish(new ToolError('La contraseña debe tener entre 8 y 128 caracteres.'));
      }
    };
    output.write(prompt);
    input.setRawMode(true);
    input.on('data', onData);
    input.once('end', onEnd);
    input.once('error', onError);
    process.once('SIGTERM', onTerminate);
    input.resume();
  });
}

export async function promptNewPassword(input = process.stdin, output = process.stdout) {
  const password = await readHiddenPassword('Contraseña (entrada oculta): ', input, output);
  const confirmation = await readHiddenPassword('Confirmá la contraseña: ', input, output);
  try { validatePasswordLength(password); } catch {
    throw new ToolError('La contraseña debe tener entre 8 y 128 caracteres.');
  }
  if (password !== confirmation) throw new ToolError('Las contraseñas no coinciden.');
  return { password, confirmation };
}

export async function promptCredentials(input = process.stdin, output = process.stdout) {
  if (!input.isTTY || !output.isTTY) throw new ToolError('La creación de escritores requiere una terminal interactiva (TTY).');
  const readline = createInterface({ input, output, terminal: true, historySize: 0 });
  const abort = new AbortController();
  const cancel = () => abort.abort();
  readline.once('SIGINT', cancel);
  let email;
  try {
    email = validateEmail(await readline.question('Correo electrónico: ', { signal: abort.signal }));
  } catch (error) {
    if (abort.signal.aborted) throw new ToolError('Operación cancelada.');
    throw error;
  } finally {
    readline.off('SIGINT', cancel);
    readline.close();
  }
  const { password, confirmation } = await promptNewPassword(input, output);
  return { email, password, confirmation };
}

/** Print a fresh Argon2id hash for SEED_USERS without creating an account or storing plaintext. */
export async function printPasswordHash(input = process.stdin, output = process.stdout) {
  if (!input.isTTY || !output.isTTY) throw new ToolError('El hash requiere una terminal interactiva (TTY); no uses argumentos ni tuberías.');
  let { password } = await promptNewPassword(input, output);
  try {
    const passwordHash = await hashPassword(password);
    if (!passwordHash.startsWith('$argon2id$')) throw new ToolError('No se pudo generar un hash Argon2id válido.');
    return passwordHash;
  } finally {
    password = '';
  }
}

export async function provisionWriter(client, { email: value, password, confirmation }) {
  const email = validateEmail(value);
  if (typeof password !== 'string') throw new ToolError('Ingresá una contraseña válida.');
  // Keep the same policy and Argon2id implementation as application login.
  try { validatePasswordLength(password); } catch {
    throw new ToolError('La contraseña debe tener entre 8 y 128 caracteres.');
  }
  if (password !== confirmation) throw new ToolError('Las contraseñas no coinciden.');
  const passwordHash = await hashPassword(password);
  if (!passwordHash.startsWith('$argon2id$')) throw new ToolError('No se pudo generar un hash Argon2id válido.');
  try {
    const result = await client.query(`INSERT INTO public.users (email, password_hash, role, is_active)
      VALUES ($1, $2, $3, $4) RETURNING id, email, role, is_active`, [email, passwordHash, 'writer', true]);
    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') throw new ToolError('Ya existe una cuenta con ese correo electrónico.');
    throw new ToolError('No se pudo crear la cuenta. Revisá la conexión, los permisos y las migraciones.');
  }
}

export async function main(args = process.argv.slice(2)) {
  if (args.length === 1 && args[0] === '--print-hash') {
    process.stdout.write(`${await printPasswordHash()}\n`);
    return;
  }
  if (args.length) throw new ToolError('Uso: node scripts/create-user.mjs [--print-hash] (sin argumentos; ingreso interactivo).');
  loadToolEnv();
  const config = maintenanceConfig();
  const credentials = await promptCredentials();
  try {
    await withMaintenanceClient(config, (client) => provisionWriter(client, credentials));
    process.stdout.write('Cuenta de escritor creada y activa.\n');
  } finally {
    credentials.password = '';
    credentials.confirmation = '';
  }
}

if (isMain(import.meta.url)) {
  main().catch((error) => { reportFailure(error); process.exitCode = 1; });
}
