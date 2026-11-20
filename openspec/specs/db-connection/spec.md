# Database Connection Specification

## Purpose

Defines pooled Neon runtime access and a separate, tracked migration workflow using the existing `pg` dependency. Keeps privileged DDL out of requests and serverless cold starts.

## Requirements

### Requirement: Pool Singleton

The system MUST expose a lazy shared `pg.Pool` instance per Node process/function instance from `src/lib/db.ts`. All application data-access modules MUST obtain their pool via this singleton; no application module SHALL create its own pool. Standalone maintenance tools MUST own and close their separate connections. A serverless deployment MUST NOT assume one global pool across instances.

#### Scenario: Single pool across modules

- GIVEN `src/lib/db.ts`, `src/lib/notes-repo.ts`, and `src/lib/session.ts` all need DB access
- WHEN each module imports the pool
- THEN all three MUST reference the same `pg.Pool` instance

#### Scenario: Lazy initialization

- GIVEN no DB call has been made yet
- WHEN the first query executes
- THEN the pool MUST be created on first use, not at module import time

### Requirement: DSN from Environment

Runtime configuration MUST be built from `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`, and `DATABASE_SSL` imported from `astro:env/server`. Neon application traffic MUST use the pooled endpoint with TLS and a runtime role without DDL privileges. No connection string SHALL be hardcoded. Standalone migrations MUST validate script-only `MIGRATION_DATABASE_URL` for a direct connection with separately privileged credentials; they MUST NOT import the Astro runtime pool or virtual env module.

#### Scenario: DSN built from env vars

- GIVEN all six DATABASE_* vars are set in `.env`
- WHEN the pool initializes
- THEN the connection MUST use those values

#### Scenario: Missing var fails loudly

- GIVEN `DATABASE_PASSWORD` is not set
- WHEN the pool attempts to connect
- THEN the system MUST throw an error; it MUST NOT silently fall back to defaults

### Requirement: Connection Lifecycle

The pool MUST expose explicit cleanup and close on process exit signals (`SIGTERM`, `SIGINT`) when delivered. Warm serverless requests SHOULD reuse it rather than closing it after every request; shutdown signals MUST NOT be relied upon for correctness. Standalone tools MUST release their connections on success and failure.

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

### Requirement: Tracked, Serialized Migrations

A standalone migration command MUST track migration identifiers, checksums, and application timestamps in a history table. It MUST acquire a database-level serialization lock on a direct connection before inspecting history/baseline or applying pending migrations. The lock MUST span the run. Every supported SQL migration and its history insertion MUST execute atomically in one transaction on the same dedicated `pg` client, not independent `pool.query` calls. Unsupported nontransactional SQL MUST fail explicitly. Release the lock/client on success and failure.

#### Scenario: Fresh database and repeat run

- GIVEN an empty isolated database
- WHEN the command runs twice
- THEN the first run MUST apply required migrations in order and record their checksums
- AND the second run MUST skip unchanged applied migrations without destructive changes

#### Scenario: Concurrent execution

- GIVEN two runners target the same database
- WHEN both start
- THEN their history checks and applications MUST serialize so a migration is committed once

#### Scenario: Failure or checksum mismatch

- GIVEN a pending migration fails or an applied migration's checksum differs
- WHEN the runner executes
- THEN the affected transaction MUST roll back and deployment MUST stop with a sanitized error
- AND it MUST NOT overwrite checksums, silently rewrite history, or retry DDL during application startup

### Requirement: Historical SQL and Existing Databases

Historical SQL MUST remain unchanged. Required migrations include `001-init.sql`, `003-soft-delete-notes.sql`, and a new additive nullable `notes.image_key` migration. `002-seed-terreno.sql` is optional sample content and MUST be excluded from the default schema run; an explicit opt-in path MUST be documented if offered. Disclose that `001` already inserts one example note and no writer account; its example image URL does not supply an image file.

Before adopting an existing database without trustworthy history, the maintainer MUST inspect required tables, columns, constraints, indexes, and extensions and establish a verified baseline. `IF NOT EXISTS` alone MUST NOT establish compatibility or justify recording a migration as applied.

#### Scenario: Existing incompatible schema

- GIVEN tables exist but their definitions do not match the required schema
- WHEN baseline adoption is attempted
- THEN the runner MUST refuse automatic adoption and require explicit reconciliation

### Requirement: Deployment Boundary

Migrations MUST run as a serialized trusted step before the application build that requires the schema. Failure MUST stop deployment. Never run DDL from a request, module import, or cold start. Preview/development MUST target isolated Neon branches; untrusted builds MUST NOT receive production migration credentials. New changes MUST be additive/backward-compatible because a failed build does not undo committed migrations; application rollback MUST NOT automatically drop schema.

#### Scenario: Build fails after migration

- GIVEN an additive migration committed successfully
- WHEN the subsequent Vercel build fails or the application rolls back
- THEN the committed schema and existing data MUST remain intact and compatible with the previous application
