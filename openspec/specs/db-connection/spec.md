# Database Connection Specification

## Purpose

Defines the PostgreSQL connection singleton used by all server-side data access. Ensures a single `pg.Pool` instance, env-driven configuration, and fail-loud error semantics.

## Requirements

### Requirement: Pool Singleton

The system MUST expose a single `pg.Pool` instance from `src/lib/db.ts`. All data-access modules MUST obtain their pool via this singleton; no module SHALL create its own pool.

#### Scenario: Single pool across modules

- GIVEN `src/lib/db.ts`, `src/lib/notes-repo.ts`, and `src/lib/session.ts` all need DB access
- WHEN each module imports the pool
- THEN all three MUST reference the same `pg.Pool` instance

#### Scenario: Lazy initialization

- GIVEN no DB call has been made yet
- WHEN the first query executes
- THEN the pool MUST be created on first use, not at module import time

### Requirement: DSN from Environment

The connection configuration MUST be built from `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`, and `DATABASE_SSL` imported from `astro:env/server`. No connection string SHALL be hardcoded.

#### Scenario: DSN built from env vars

- GIVEN all six DATABASE_* vars are set in `.env`
- WHEN the pool initializes
- THEN the connection MUST use those values

#### Scenario: Missing var fails loudly

- GIVEN `DATABASE_PASSWORD` is not set
- WHEN the pool attempts to connect
- THEN the system MUST throw an error; it MUST NOT silently fall back to defaults

### Requirement: Connection Lifecycle

The pool MUST close gracefully on process exit signals (`SIGTERM`, `SIGINT`).

#### Scenario: Graceful shutdown

- GIVEN the server is running with an active pool
- WHEN `SIGTERM` is received
- THEN the pool MUST call `end()` and release all connections

### Requirement: Fail-Loud Errors

Connection failures MUST propagate as thrown errors. The system MUST NOT silently fall back to in-memory data, empty results, or disabled features when the DB is unreachable.

#### Scenario: DB unreachable

- GIVEN PostgreSQL is down
- WHEN a query is attempted
- THEN the system MUST throw an error; the caller MUST receive a 500 response without credential details in the message

#### Scenario: Auth failure

- GIVEN `DATABASE_PASSWORD` is incorrect
- WHEN the pool attempts to connect
- THEN the system MUST throw; the error MUST NOT include the password value
