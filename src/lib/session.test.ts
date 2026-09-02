import { describe, expect, it } from "vitest";

import {
  DEFAULT_SESSION_TTL_MS,
  clearSessionCookieOptions,
  generateSessionToken,
  isSessionExpired,
  nextExpiry,
  sessionCookieOptions,
} from "./session";

describe("generateSessionToken", () => {
  it("generates a 256-bit (32-byte) token", () => {
    const token = generateSessionToken();
    expect(Buffer.from(token, "base64url").byteLength).toBe(32);
  });

  it("generates distinct tokens", () => {
    expect(generateSessionToken()).not.toBe(generateSessionToken());
  });
});

describe("nextExpiry", () => {
  it("extends the expiry by the TTL", () => {
    const now = new Date("2024-01-01T00:00:00.000Z");
    const expiresAt = nextExpiry(DEFAULT_SESSION_TTL_MS, now);
    expect(expiresAt.getTime() - now.getTime()).toBe(DEFAULT_SESSION_TTL_MS);
  });
});

describe("isSessionExpired", () => {
  it("returns true for a past expiry", () => {
    expect(
      isSessionExpired(
        new Date("2020-01-01T00:00:00Z"),
        new Date("2024-01-01T00:00:00Z"),
      ),
    ).toBe(true);
  });

  it("returns false for a future expiry", () => {
    expect(
      isSessionExpired(
        new Date("2030-01-01T00:00:00Z"),
        new Date("2024-01-01T00:00:00Z"),
      ),
    ).toBe(false);
  });

  it("treats the exact boundary as expired (inclusive)", () => {
    const now = new Date("2024-01-01T00:00:00Z");
    expect(isSessionExpired(now, now)).toBe(true);
  });
});

describe("sessionCookieOptions", () => {
  it("sets httpOnly, sameSite=lax, path=/ and maxAge in seconds", () => {
    const opts = sessionCookieOptions(DEFAULT_SESSION_TTL_MS);
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe("lax");
    expect(opts.path).toBe("/");
    expect(opts.maxAge).toBe(DEFAULT_SESSION_TTL_MS / 1000);
  });

  it("sets secure only in production", () => {
    expect(sessionCookieOptions(DEFAULT_SESSION_TTL_MS, false).secure).toBe(false);
    expect(sessionCookieOptions(DEFAULT_SESSION_TTL_MS, true).secure).toBe(true);
  });
});

describe("clearSessionCookieOptions", () => {
  it("clears the cookie with maxAge 0", () => {
    const opts = clearSessionCookieOptions();
    expect(opts.maxAge).toBe(0);
  });
});
