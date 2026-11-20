import argon2 from "argon2";

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/**
 * Validate the password length policy (8–128 characters).
 * Throws a Spanish, user-facing error when out of range.
 */
export function validatePasswordLength(password: string): void {
  if (
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    throw new Error(
      `La contraseña debe tener entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres`,
    );
  }
}

/**
 * Hash a plaintext password with argon2id and a random salt.
 */
export async function hashPassword(plaintext: string): Promise<string> {
  validatePasswordLength(plaintext);
  return argon2.hash(plaintext, { type: argon2.argon2id });
}

/**
 * Verify a plaintext password against a stored hash using argon2's
 * built-in constant-time comparison.
 */
export async function verifyPassword(
  plaintext: string,
  hash: string,
): Promise<boolean> {
  return argon2.verify(hash, plaintext);
}
