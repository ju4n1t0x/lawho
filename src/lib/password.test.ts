import { describe, expect, it } from "vitest";

import {
  hashPassword,
  validatePasswordLength,
  verifyPassword,
} from "./password";

describe("hashPassword", () => {
  it("produces an argon2id hash", async () => {
    const hash = await hashPassword("securePass123");
    expect(hash).toMatch(/^\$argon2id\$/);
  });

  it("produces a different hash for the same password (random salt)", async () => {
    const a = await hashPassword("securePass123");
    const b = await hashPassword("securePass123");
    expect(a).not.toBe(b);
  });

  it("rejects a password shorter than 8 characters", async () => {
    await expect(hashPassword("1234567")).rejects.toThrow();
  });

  it("rejects a password longer than 128 characters", async () => {
    await expect(hashPassword("a".repeat(129))).rejects.toThrow();
  });
});

describe("verifyPassword", () => {
  it("accepts the correct password", async () => {
    const hash = await hashPassword("securePass123");
    await expect(verifyPassword("securePass123", hash)).resolves.toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("securePass123");
    await expect(verifyPassword("wrongPass", hash)).resolves.toBe(false);
  });
});

describe("validatePasswordLength", () => {
  it("accepts 8 and 128 characters", () => {
    expect(() => validatePasswordLength("a".repeat(8))).not.toThrow();
    expect(() => validatePasswordLength("a".repeat(128))).not.toThrow();
  });
});
