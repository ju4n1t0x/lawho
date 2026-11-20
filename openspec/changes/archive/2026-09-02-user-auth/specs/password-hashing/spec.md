# Password Hashing Specification

## Purpose

Defines the password hashing and verification contract using argon2id. Ensures secure storage, constant-time comparison, and a documented password policy.

## Requirements

### Requirement: Argon2id Algorithm

The system MUST hash passwords using argon2id via the `argon2` dependency. Each hash MUST use a randomly generated salt.

#### Scenario: Hash produced

- GIVEN a plaintext password "securePass123"
- WHEN `hashPassword` is called
- THEN the output MUST be a valid argon2id hash string containing a unique salt

#### Scenario: Same password, different hashes

- GIVEN the same password hashed twice
- WHEN both hashes are compared as strings
- THEN they MUST differ (different random salts)

### Requirement: Verification

The system MUST verify a plaintext password against a stored hash using argon2's built-in constant-time comparison.

#### Scenario: Correct password verifies

- GIVEN a stored hash of "securePass123"
- WHEN `verifyPassword("securePass123", storedHash)` is called
- THEN it MUST return `true`

#### Scenario: Wrong password rejected

- GIVEN a stored hash of "securePass123"
- WHEN `verifyPassword("wrongPass", storedHash)` is called
- THEN it MUST return `false`

#### Scenario: Constant-time comparison

- GIVEN any two inputs
- WHEN `verifyPassword` runs
- THEN execution time MUST NOT vary significantly based on how much of the hash matches

### Requirement: Password Length Policy

The system MUST enforce a minimum password length of 8 characters and a maximum of 128 characters.

#### Scenario: Too short rejected

- GIVEN a password of 7 characters
- WHEN `hashPassword` is called
- THEN it MUST throw or return an error

#### Scenario: Too long rejected

- GIVEN a password of 129 characters
- WHEN `hashPassword` is called
- THEN it MUST throw or return an error

#### Scenario: Valid length accepted

- GIVEN a password of 12 characters
- WHEN `hashPassword` is called
- THEN it MUST return a valid hash

### Requirement: Hash Format

The stored hash MUST be the standard argon2 encoded string format (includes algorithm identifier, parameters, salt, and hash in a single self-describing string).

#### Scenario: Self-describing format

- GIVEN a stored hash
- WHEN inspected
- THEN it MUST contain the argon2id algorithm identifier and all parameters needed for verification
