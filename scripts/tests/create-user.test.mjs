import { describe, it, expect, vi } from 'vitest';
import { PassThrough } from 'node:stream';
import { verifyPassword } from '../../src/lib/password.ts';
import { main, provisionWriter, readHiddenPassword, validateEmail } from '../create-user.mjs';

function terminal() {
  const input = new PassThrough();
  const output = new PassThrough();
  input.isTTY = true;
  output.isTTY = true;
  input.isRaw = false;
  input.setRawMode = (value) => { input.isRaw = value; };
  input.pause();
  let text = '';
  output.on('data', (chunk) => { text += chunk; });
  return { input, output, get text() { return text; } };
}

describe('secure writer provisioning', () => {
  it('stores a real fresh Argon2id hash accepted by application verification', async () => {
    const rows = [];
    const client = { query: vi.fn(async (sql, parameters) => {
      rows.push(parameters);
      expect(sql).toContain('VALUES ($1, $2, $3, $4)');
      expect(sql).not.toContain('correct horse battery');
      return { rows: [{ id: 1, email: parameters[0], role: 'writer', is_active: true }] };
    }) };
    const credentials = { email: ' Writer@lawho.org.ar ', password: 'correct horse battery', confirmation: 'correct horse battery' };
    const created = await provisionWriter(client, credentials);
    await provisionWriter(client, credentials);
    expect(created).toEqual({ id: 1, email: 'Writer@lawho.org.ar', role: 'writer', is_active: true });
    expect(rows[0][1]).toMatch(/^\$argon2id\$/);
    expect(rows[0][1]).not.toBe(rows[1][1]);
    expect(rows[0].slice(2)).toEqual(['writer', true]);
    await expect(verifyPassword(credentials.password, rows[0][1])).resolves.toBe(true);
    await expect(verifyPassword('wrong password', rows[0][1])).resolves.toBe(false);
    expect(created).not.toHaveProperty('password_hash');
  });

  it.each([8, 128])('accepts the existing inclusive password boundary %i', async (length) => {
    const password = 'a'.repeat(length);
    const client = { query: vi.fn(async (_sql, values) => {
      expect(await verifyPassword(password, values[1])).toBe(true);
      return { rows: [{ id: 1 }] };
    }) };
    await provisionWriter(client, { email: 'a@example.org', password, confirmation: password });
    expect(client.query).toHaveBeenCalledOnce();
  });

  it.each(['', 'short', 'a'.repeat(129), undefined])('rejects out-of-policy passwords before inserting (%#)', async (password) => {
    const client = { query: vi.fn() };
    await expect(provisionWriter(client, { email: 'a@example.org', password, confirmation: password })).rejects.toThrow('contraseña');
    expect(client.query).not.toHaveBeenCalled();
  });

  it('rejects confirmation mismatch and malformed emails before inserting', async () => {
    const client = { query: vi.fn() };
    await expect(provisionWriter(client, { email: 'a@example.org', password: 'valid-password', confirmation: 'other-password' }))
      .rejects.toThrow('no coinciden');
    for (const email of ['', 'bad', 'a@', 'a@b', 'a\n@example.org', 'a'.repeat(250) + '@b.com']) {
      expect(() => validateEmail(email)).toThrow('correo electrónico válido');
    }
    expect(client.query).not.toHaveBeenCalled();
  });

  it('handles a citext unique violation without leaking sensitive PostgreSQL detail', async () => {
    const client = { query: vi.fn(async () => { throw Object.assign(Error('secret plaintext database detail'), { code: '23505' }); }) };
    await expect(provisionWriter(client, { email: 'Writer@lawho.org.ar', password: 'valid-password', confirmation: 'valid-password' }))
      .rejects.toThrow('Ya existe una cuenta');
    expect(client.query.mock.calls[0][1][1]).toMatch(/^\$argon2id\$/);
  });

  it('sanitizes all other insert errors and never resets existing users', async () => {
    const client = { query: vi.fn(async () => { throw Error('secret password'); }) };
    await expect(provisionWriter(client, { email: 'a@example.org', password: 'valid-password', confirmation: 'valid-password' }))
      .rejects.toThrow('No se pudo crear la cuenta');
    expect(client.query.mock.calls[0][0]).not.toMatch(/UPDATE|ON CONFLICT/);
  });

  it('reads a hidden password, handles backspace, and restores terminal mode', async () => {
    const tty = terminal();
    const promise = readHiddenPassword('Password: ', tty.input, tty.output);
    expect(tty.input.isRaw).toBe(true);
    tty.input.write('secretX\x7f-value\r');
    await expect(promise).resolves.toBe('secret-value');
    expect(tty.text).toBe('Password: \n');
    expect(tty.input.isRaw).toBe(false);
    expect(tty.input.isPaused()).toBe(true);
    expect(tty.input.listenerCount('data')).toBe(0);
  });

  it('decodes split Unicode without echo and supports clearing input', async () => {
    const tty = terminal();
    const promise = readHiddenPassword('Password: ', tty.input, tty.output);
    tty.input.write('discard\x15');
    const encoded = Buffer.from('pässword\r');
    tty.input.write(encoded.subarray(0, 2));
    tty.input.write(encoded.subarray(2));
    await expect(promise).resolves.toBe('pässword');
    expect(tty.text).toBe('Password: \n');
  });

  it.each(['\x03', '\x04', '\x1b[A', 'a'.repeat(129)])('restores raw mode after cancellation or unsupported input (%#)', async (input) => {
    const tty = terminal();
    const promise = readHiddenPassword('Password: ', tty.input, tty.output);
    tty.input.write(input);
    await expect(promise).rejects.toThrow();
    expect(tty.input.isRaw).toBe(false);
    expect(tty.input.listenerCount('data')).toBe(0);
    expect(tty.text).toBe('Password: \n');
  });

  it('refuses pipe input and all CLI arguments before loading credentials', async () => {
    const input = new PassThrough();
    await expect(readHiddenPassword('Password: ', input, new PassThrough())).rejects.toThrow('TTY');
    await expect(main(['--password=never-echo-me'])).rejects.toThrow('sin argumentos');
  });

  it.each(['end', 'error'])('restores terminal mode after stream %s', async (event) => {
    const tty = terminal();
    const promise = readHiddenPassword('Password: ', tty.input, tty.output);
    tty.input.emit(event, Error('sensitive stream details'));
    await expect(promise).rejects.toThrow();
    expect(tty.input.isRaw).toBe(false);
    expect(tty.text).toBe('Password: \n');
  });
});
