import { getPool } from "./db";
import { nextExpiry } from "./session";

/** An authenticated session joined with its user (no token, no password hash). */
export interface ActiveSession {
  userId: number;
  email: string;
  role: string;
  expiresAt: Date;
}

interface SessionRow {
  user_id: number;
  email: string;
  role: string;
  expires_at: Date | string;
}

/**
 * Insert a session row for a user with the given 256-bit token.
 * The expiry is computed from `ttlMs`; `last_seen_at` starts at now().
 */
export async function createSession(
  userId: number,
  token: string,
  ttlMs: number,
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO sessions (user_id, token, expires_at, last_seen_at)
     VALUES ($1, $2, $3, now())`,
    [userId, token, nextExpiry(ttlMs)],
  );
}

/**
 * Fetch a non-expired session by token, joined to its active user.
 * Returns null for an unknown (tampered) token, and deletes the row when it
 * has expired (denying access and enforcing logout-on-expiry).
 */
export async function getActiveSession(
  token: string,
): Promise<ActiveSession | null> {
  const pool = getPool();
  const { rows } = await pool.query<SessionRow>(
    `SELECT s.user_id, s.expires_at, u.email, u.role
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = $1 AND u.is_active = true`,
    [token],
  );
  const row = rows[0];
  if (!row) {
    return null;
  }

  const expiresAt = new Date(row.expires_at);
  if (expiresAt.getTime() <= Date.now()) {
    await pool.query(`DELETE FROM sessions WHERE token = $1`, [token]);
    return null;
  }

  return {
    userId: row.user_id,
    email: row.email,
    role: row.role,
    expiresAt,
  };
}

/**
 * Extend a session's sliding window: refresh `last_seen_at` to now() and move
 * `expires_at` to `ttlMs` from now.
 */
export async function touchSession(token: string, ttlMs: number): Promise<void> {
  const pool = getPool();
  await pool.query(
    `UPDATE sessions
     SET last_seen_at = now(), expires_at = $2
     WHERE token = $1`,
    [token, nextExpiry(ttlMs)],
  );
}

/**
 * Load a non-expired session and, when valid, slide its TTL (touch).
 * Wraps `getActiveSession` + `touchSession` so every authenticated request
 * path renews the sliding window without being able to forget the touch:
 * only VALID sessions are touched (expired/unknown tokens return null and are
 * never renewed).
 */
export async function getActiveSessionAndTouch(
  token: string,
  ttlMs: number,
): Promise<ActiveSession | null> {
  const session = await getActiveSession(token);
  if (session) {
    await touchSession(token, ttlMs);
  }
  return session;
}

/**
 * Delete a session row by token (logout invalidation).
 */
export async function deleteSessionByToken(token: string): Promise<void> {
  const pool = getPool();
  await pool.query(`DELETE FROM sessions WHERE token = $1`, [token]);
}
