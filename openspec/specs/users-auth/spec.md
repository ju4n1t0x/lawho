# Users Auth Specification

## Purpose

Defines the `users` table schema and repository helpers for user lookup, password verification, and active-status gating.

## Requirements

### Requirement: Users Table Schema

The system MUST maintain a `users` table with columns: `id` (primary key), `email` (unique, citext), `password_hash` (text), `role` (text, default `'writer'`), `is_active` (boolean, default `true`), `created_at` (timestamptz).

#### Scenario: Table exists after migration

- GIVEN migrations have been applied
- WHEN the `users` table is queried
- THEN it MUST exist with all specified columns and defaults

#### Scenario: Unique email enforced

- GIVEN a user with email `juan@lawho.org.ar`
- WHEN a second insert attempts the same email
- THEN the DB MUST reject with a unique constraint violation

### Requirement: Maintainer-Only Writer Provisioning

The system MUST provide a standalone maintainer CLI to create writers from email and a securely entered plaintext password. It MUST reuse `hashPassword()` from `src/lib/password.ts`, including the existing 8–128 character policy and Argon2id random-salt hashing, and insert only valid encoded Argon2id hashes into `users.password_hash`. It MUST validate inputs, use parameterized SQL, reject duplicate emails case-insensitively, and close its connection. It MUST NOT log/persist plaintext, accept passwords in command arguments, expose public registration, or reset existing accounts on every deployment. `001-init.sql` creates the table and an example note, not a writer.

#### Scenario: Maintainer creates writer

- GIVEN the required schema exists and the maintainer securely enters a valid password
- WHEN the CLI provisions an unused email
- THEN one writer MUST be inserted with a fresh Argon2id hash that `verifyPassword()` accepts
- AND no plaintext password MUST appear in arguments, output, logs, or stored rows

#### Scenario: Invalid password or duplicate email

- GIVEN an out-of-policy password or an email already present with different casing
- WHEN provisioning is attempted
- THEN the CLI MUST fail clearly without modifying the existing account or exposing secrets

#### Scenario: Legacy invalid credential row

- GIVEN a preexisting plaintext or malformed `password_hash`
- WHEN account recovery is needed
- THEN the maintainer MUST perform an explicit reset or controlled credential migration
- AND login MUST NOT add plaintext fallback or compare hashes as strings
- AND any separate hash-import path, if needed, MUST validate encoded hashes and prevent double hashing

#### Scenario: No registration endpoint

- GIVEN the application is running
- WHEN inspecting routes
- THEN there MUST be no `/register` (read-only), `/signup` (read-only), or `/escritor/registro` (read-only) endpoint

### Requirement: findByEmail Helper

The repository MUST provide a `findByEmail(email)` function that returns the user row or `null` if not found.

#### Scenario: Existing user found

- GIVEN a user with email `juan@lawho.org.ar`
- WHEN `findByEmail('juan@lawho.org.ar')` is called
- THEN it MUST return the user row including `password_hash`

#### Scenario: Non-existent user

- GIVEN no user with email `nobody@lawho.org.ar`
- WHEN `findByEmail('nobody@lawho.org.ar')` is called
- THEN it MUST return `null`

#### Scenario: Case-insensitive email

- GIVEN a user with email `Juan@lawho.org.ar`
- WHEN `findByEmail('juan@lawho.org.ar')` is called
- THEN it MUST return the user row (citext comparison)

### Requirement: checkPassword Helper

The repository MUST provide a `checkPassword(email, plaintext)` function that returns the user row if credentials are valid, or `null` if the email is not found or the password does not match. Verification MUST continue through `verifyPassword()`, never hash-string equality or plaintext fallback. Existing active-user checks and DB-backed session cookies, sliding expiry, and logout behavior MUST remain unchanged on Vercel Node; no second auth system or Redis is required.

#### Scenario: Valid credentials

- GIVEN a user with a known password hash
- WHEN `checkPassword` is called with the correct plaintext
- THEN it MUST return the user row

#### Scenario: Wrong password

- GIVEN a user with a known password hash
- WHEN `checkPassword` is called with incorrect plaintext
- THEN it MUST return `null`

#### Scenario: Non-existent email

- GIVEN no user with the given email
- WHEN `checkPassword` is called
- THEN it MUST return `null` (timing SHOULD NOT reveal whether the email exists)

### Requirement: isActive Gate

The system MUST reject login attempts for users with `is_active = false`.

#### Scenario: Inactive user rejected

- GIVEN a user with `is_active = false`
- WHEN `checkPassword` is called with correct credentials
- THEN it MUST return `null` (login denied)

#### Scenario: Active user accepted

- GIVEN a user with `is_active = true` and correct password
- WHEN `checkPassword` is called
- THEN it MUST return the user row
