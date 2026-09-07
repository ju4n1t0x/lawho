# Environment Configuration Specification

## Purpose

Type-safe, single-source-of-truth convention for environment variables. Prevent secret drift into bundles or repo. Enforce client/server isolation via Astro 7.2 `astro:env`.

## Requirements

| ID | Requirement | Strength |
|----|-------------|----------|
| ENV-01 | Single Source of Truth | MUST |
| ENV-02 | Access Discipline | MUST NOT |
| ENV-03 | Client/Server Isolation | MUST NOT |
| ENV-04 | Secret Storage Convention | MUST |
| ENV-05 | PostgreSQL Variable Declaration | MUST |
| ENV-06 | Build-Time Validation | MUST |

### Requirement: Single Source of Truth

Every env var MUST be declared exactly once in `env.schema` within `astro.config.mjs`. Zero hardcoded values SHALL exist in code.

#### Scenario: All vars in schema (happy path)
- GIVEN `env.schema` exists in config
- WHEN a developer needs a new var
- THEN they MUST add it to `env.schema` first

#### Scenario: Hardcoded value (edge case)
- GIVEN source contains `postgres://user:pass@host/db`
- WHEN CI grep runs
- THEN build MUST fail; value MUST move to `.env`

### Requirement: Access Discipline

Code MUST import vars only from `astro:env/client` or `astro:env/server`. `process.env` and `import.meta.env` are FORBIDDEN.

#### Scenario: Correct import (happy path)
- GIVEN server module needs `DATABASE_HOST`
- WHEN developer writes import
- THEN MUST use `import { DATABASE_HOST } from 'astro:env/server'`

#### Scenario: Forbidden pattern (edge case)
- GIVEN code contains `process.env.DATABASE_HOST`
- WHEN `grep -rE "process\.env|import\.meta\.env" src/` runs
- THEN MUST return zero matches; CI MUST fail

### Requirement: Client/Server Isolation

Secret vars (`access: 'secret'`) MUST NOT be reachable from client code. Only `access: 'public'` vars MAY import from `astro:env/client`.

#### Scenario: Secret blocked from client (happy path)
- GIVEN `DATABASE_PASSWORD` has `access: 'secret'`
- WHEN client imports from `astro:env/client`
- THEN build MUST fail; secret MUST NOT appear in bundle

#### Scenario: Public var accessible (edge case)
- GIVEN `DATABASE_SSL` has `access: 'public'`
- WHEN client imports from `astro:env/client`
- THEN import MUST succeed; value present in bundle

### Requirement: Secret Storage Convention

Real values MUST reside only in gitignored `.env*` files. Committed `.env.example` MUST contain placeholders only, never real secrets.

#### Scenario: Real values gitignored (happy path)
- GIVEN `.env` contains `DATABASE_HOST=localhost`
- WHEN `git status` runs
- THEN `.env` MUST be in `.gitignore`; file MUST NOT be tracked

#### Scenario: .env.example placeholders (happy path)
- GIVEN `.env.example` is committed
- WHEN developer clones repo
- THEN MUST contain `DATABASE_HOST=your_database_host_here`; no real credentials

#### Scenario: Real secret in example (edge case)
- GIVEN `.env.example` contains `DATABASE_HOST=192.168.1.100`
- WHEN pre-commit hook scans
- THEN MUST detect real IP; commit MUST be rejected

### Requirement: PostgreSQL Variable Declaration
System MUST declare six PostgreSQL vars in `env.schema`: `DATABASE_HOST` (string, secret), `DATABASE_PORT` (number, secret), `DATABASE_USER` (string, secret), `DATABASE_PASSWORD` (string, secret), `DATABASE_NAME` (string, secret), `DATABASE_SSL` (boolean, public, default `false`). These vars are consumed by `src/lib/db.ts` to build the connection DSN at runtime.

#### Scenario: All six vars declared (happy path)

- GIVEN `env.schema` exists
- WHEN schema inspected
- THEN all six vars MUST be present with correct `type`, `context`, `access`

#### Scenario: Missing variable (edge case)

- GIVEN `DATABASE_PORT` omitted from schema
- WHEN `astro build` runs with `validateSecrets: true`
- THEN build MUST fail with missing variable error

#### Scenario: DB vars consumed at runtime

- GIVEN `src/lib/db.ts` imports from `astro:env/server`
- WHEN the Node server starts
- THEN the six DATABASE_* vars MUST be used to construct the Postgres DSN
### Requirement: Build-Time Validation

System MUST enable `env.validateSecrets: true`. Secret validation occurs when a server runtime starts or when `astro:env/server` is imported. In a static-only build with no `astro:env/server` consumers, missing secrets are not validated at build time.

#### Scenario: All secrets present (happy path)
- GIVEN all secrets in `.env`
- WHEN `astro build` runs
- THEN build MUST succeed; secrets validated

#### Scenario: Missing secret with server runtime (edge case)
- GIVEN a server runtime (`output: 'server'` + adapter) or an `astro:env/server` import, AND `DATABASE_PASSWORD` missing from `.env`
- WHEN `astro build` runs
- THEN build MUST fail naming the missing var; MUST NOT proceed to bundling

#### Scenario: Missing secret in static-only build (documented limitation)
- GIVEN a static-only site with no `astro:env/server` import
- WHEN `astro build` runs with `DATABASE_PASSWORD` missing
- THEN validation is deferred until a server runtime or `astro:env/server` consumer exists (not a build failure)

### Requirement: Session TTL Variable

System MUST declare `SESSION_TTL_MS` (number, server, secret) in `env.schema` with a default of `86400000` (24 hours). This value controls the sliding session expiry window.

#### Scenario: Default applied

- GIVEN `SESSION_TTL_MS` is not set in `.env`
- WHEN the server runtime reads the var
- THEN the value MUST resolve to `86400000`

#### Scenario: Custom TTL applied

- GIVEN `SESSION_TTL_MS=3600000` in `.env`
- WHEN the server runtime reads the var
- THEN the value MUST resolve to `3600000`

### Requirement: Uploads Directory Variable

System MUST declare `UPLOADS_DIR` (string, server, secret) in `env.schema` with a default of `./uploads`. This is the local filesystem path where uploaded images are written.

#### Scenario: Default path

- GIVEN `UPLOADS_DIR` is not set in `.env`
- WHEN the server writes an upload
- THEN the file MUST be written under `./uploads/`

#### Scenario: Custom path

- GIVEN `UPLOADS_DIR=/var/uploads` in `.env`
- WHEN the server writes an upload
- THEN the file MUST be written under `/var/uploads/` (read-only)

### Requirement: Public Uploads URL Variable

System MUST declare `PUBLIC_UPLOADS_URL` (string, server, public) in `env.schema` with a default of `/uploads` (read-only). This is the URL origin prefix stored in the DB for uploaded images; the local path is never persisted.

#### Scenario: Default URL prefix

- GIVEN `PUBLIC_UPLOADS_URL` is not set
- WHEN an image is saved
- THEN the DB row MUST store a URL starting with `/uploads/` (read-only)

#### Scenario: Custom CDN origin

- GIVEN `PUBLIC_UPLOADS_URL=https://cdn.lawho.org.ar/uploads` in `.env`
- WHEN an image is saved
- THEN the DB row MUST store a URL starting with `https://cdn.lawho.org.ar/uploads/`

### Requirement: Session Secret Reservation

System MAY declare `SESSION_SECRET` (string, server, secret) in `env.schema` for future-proofing. The current DB-session model does NOT require it; the var is reserved for potential future signing needs.

#### Scenario: Var absent is acceptable

- GIVEN `SESSION_SECRET` is not declared in `env.schema`
- WHEN the server starts
- THEN startup MUST succeed; no error

#### Scenario: Var declared but unused

- GIVEN `SESSION_SECRET` is declared in `env.schema`
- WHEN the server starts
- THEN the var MUST NOT be consumed by any current code path
