import { describe, it, expect, vi } from 'vitest';
import { hashPassword } from '../../src/lib/password.ts';
import { ARGON2ID_HASH, main, parseSeedUsers, runSeed, seedUsers } from '../seed-users.mjs';

const hash = '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHRzb21lc2FsdA$RdescudvJCsgt3ub+b+dWRWJTmaaJObG';
const json = (users) => JSON.stringify(users);

describe('seed users from environment', () => {
  it('accepts a real Argon2id hash produced by the application helper', async () => {
    const real = await hashPassword('valid-password');
    expect(ARGON2ID_HASH.test(real)).toBe(true);
    expect(parseSeedUsers(json([{ email: 'escritor@lawho.org.ar', password_hash: real }])))
      .toEqual([{ email: 'escritor@lawho.org.ar', passwordHash: real }]);
  });

  it('rejects plaintext passwords instead of hashing them silently', () => {
    expect(() => parseSeedUsers(json([{ email: 'a@example.org', password: 'secret' }])))
      .toThrow('contraseñas en claro');
  });

  it('rejects unknown fields and non-Argon2id hashes', () => {
    expect(() => parseSeedUsers(json([{ email: 'a@example.org', password_hash: hash, role: 'admin' }])))
      .toThrow('campo desconocido');
    for (const value of ['', 'plain', '$argon2i$v=19$m=65536,t=3,p=4$c2FsdA$aGFzaA', hash.replace('argon2id', 'argon2d')]) {
      expect(() => parseSeedUsers(json([{ email: 'a@example.org', password_hash: value }])))
        .toThrow('Argon2id');
    }
  });

  it('rejects malformed emails and case-insensitive duplicates', () => {
    expect(() => parseSeedUsers(json([{ email: 'bad', password_hash: hash }])))
      .toThrow('usuario 1');
    expect(() => parseSeedUsers(json([
      { email: 'Writer@lawho.org.ar', password_hash: hash },
      { email: 'writer@lawho.org.ar', password_hash: hash },
    ]))).toThrow('repetido');
  });

  it.each([
    ['empty', ''],
    ['absent', undefined],
    ['invalid JSON', '{not json'],
    ['object', '{}'],
    ['empty list', '[]'],
    ['non-object entry', '["a@example.org"]'],
  ])('rejects %s input', (_label, value) => {
    expect(() => parseSeedUsers(value)).toThrow();
  });

  it('inserts idempotently and never updates or resets an existing account', async () => {
    const calls = [];
    const client = { query: vi.fn(async (sql, values) => {
      calls.push({ sql, values });
      return { rowCount: calls.length === 1 ? 1 : 0 };
    }) };
    const users = parseSeedUsers(json([
      { email: 'a@lawho.org.ar', password_hash: hash },
      { email: 'b@lawho.org.ar', password_hash: hash },
    ]));
    const result = await seedUsers(client, users);
    expect(result).toEqual({ created: ['a@lawho.org.ar'], skipped: ['b@lawho.org.ar'] });
    expect(calls).toHaveLength(2);
    for (const { sql, values } of calls) {
      expect(sql).toContain('ON CONFLICT (email) DO NOTHING');
      expect(sql).not.toMatch(/UPDATE|DELETE|is_active\s*=\s*false/i);
      expect(values).toEqual([expect.any(String), hash]);
    }
  });

  it('refuses to run on Vercel or without configuration, before opening a connection', async () => {
    await expect(runSeed({ VERCEL: '1' })).rejects.toThrow('Vercel');
    await expect(runSeed({})).rejects.toThrow('SEED_USERS');
    await expect(runSeed({ SEED_USERS: json([{ email: 'a@lawho.org.ar', password_hash: hash }]) }))
      .rejects.toThrow('MIGRATION_DATABASE_URL');
  });

  it('refuses CLI arguments', async () => {
    await expect(main(['--users=a@lawho.org.ar'])).rejects.toThrow('sin argumentos');
  });
});
