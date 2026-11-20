# Delta for Environment Configuration

## MODIFIED Requirements

### Requirement: PostgreSQL Variable Declaration

System MUST declare six PostgreSQL vars in `env.schema`: `DATABASE_HOST` (string, secret), `DATABASE_PORT` (number, secret), `DATABASE_USER` (string, secret), `DATABASE_PASSWORD` (string, secret), `DATABASE_NAME` (string, secret), `DATABASE_SSL` (boolean, public, default `false`). These vars are NOW CONSUMED by `src/lib/db.ts` to build the connection DSN at runtime.

(Previously: vars were declared but no code consumed them.)

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

## ADDED Requirements

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
