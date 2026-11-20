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

### Requirement: User Creation (Manual)

Users MUST be created manually via SQL (migrations seed script or direct DB insert). The system MUST NOT expose a registration endpoint.

#### Scenario: Seed script creates user

- GIVEN `migrations/001-init.sql` includes a seed INSERT
- WHEN migrations run
- THEN the user row MUST exist in the `users` table

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

The repository MUST provide a `checkPassword(email, plaintext)` function that returns the user row if credentials are valid, or `null` if the email is not found or the password does not match.

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
