import { getPool } from "./db";
import { verifyPassword } from "./password";

/** Public user shape returned to auth callers (never includes `password_hash`). */
export interface UserRecord {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
}

interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  role: string;
  is_active: boolean;
}

const USER_COLUMNS = "id, email, password_hash, role, is_active";

/**
 * Dummy argon2id hash verified when the email does not exist (or the user is
 * inactive) so `checkPassword` timing does not reveal whether the account exists.
 */
const DUMMY_HASH =
  "$argon2id$v=19$m=65536,p=4,t=3$mtNPJifNh2N4UJ0n0fogQQ$tJohY8OOQgpwZyd4xWnczQFkHqBX3k/iaE9C9jBTo9I";

function toUser(row: UserRow): UserRecord {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    is_active: row.is_active,
  };
}

/**
 * Look up a user by email (citext comparison happens in PostgreSQL).
 * Returns null when no user matches.
 */
export async function findByEmail(email: string): Promise<UserRecord | null> {
  const pool = getPool();
  const { rows } = await pool.query<UserRow>(
    `SELECT ${USER_COLUMNS} FROM users WHERE email = $1`,
    [email],
  );
  const row = rows[0];
  return row ? toUser(row) : null;
}

/**
 * Verify credentials. Returns the user row on success, or null when the email
 * does not exist, the password is wrong, or the user is inactive.
 */
export async function checkPassword(
  email: string,
  plaintext: string,
): Promise<UserRecord | null> {
  const pool = getPool();
  const { rows } = await pool.query<UserRow>(
    `SELECT ${USER_COLUMNS} FROM users WHERE email = $1`,
    [email],
  );
  const row = rows[0];

  // Missing or inactive account: still verify against a dummy hash so the
  // response time does not reveal whether the email exists or is disabled.
  if (!row || !row.is_active) {
    await verifyPassword(plaintext, DUMMY_HASH);
    return null;
  }

  const ok = await verifyPassword(plaintext, row.password_hash);
  return ok ? toUser(row) : null;
}
