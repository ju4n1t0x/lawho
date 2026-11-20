import { randomBytes } from "node:crypto";

/** Default sliding session TTL (24h) — mirrors the SESSION_TTL_MS env default. */
export const DEFAULT_SESSION_TTL_MS = 86_400_000;

export const SESSION_COOKIE_NAME = "lawho_session";

/**
 * Generate a cryptographically random 256-bit (32-byte) session token,
 * encoded as base64url without padding.
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Compute the next expiry timestamp for a sliding session window.
 */
export function nextExpiry(ttlMs: number, now = new Date()): Date {
  return new Date(now.getTime() + ttlMs);
}

/**
 * Whether an expiry timestamp is in the past (session expired).
 */
export function isSessionExpired(expiresAt: Date, now = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}

/**
 * Cookie options for setting the session cookie.
 * httpOnly + sameSite=lax always; secure only in production.
 */
export function sessionCookieOptions(ttlMs: number, isProd = false) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProd,
    path: "/",
    maxAge: Math.floor(ttlMs / 1000),
  };
}

/**
 * Cookie options for clearing the session cookie (logout).
 */
export function clearSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: false,
    path: "/",
    maxAge: 0,
  };
}
