# Environment Configuration Specification

## Purpose

Type-safe configuration for the Vercel Node application and standalone maintenance tools. Prevent secret drift into client bundles, logs, or the repository. Enforce client/server isolation via Astro `astro:env`.

## Requirements

| ID | Requirement | Strength |
|----|-------------|----------|
| ENV-01 | Single Source of Truth | MUST |
| ENV-02 | Access Discipline | MUST NOT |
| ENV-03 | Client/Server Isolation | MUST NOT |
| ENV-04 | Secret Storage Convention | MUST |
| ENV-05 | PostgreSQL Variable Declaration | MUST |
| ENV-06 | Validation at Consumption Boundaries | MUST |

### Requirement: Single Source of Truth

Every application env var MUST be declared exactly once in `env.schema` within `astro.config.mjs`. Deployment-specific values and credentials MUST NOT be hardcoded. Script-only variables MUST be documented and validated by the standalone entry point; they MUST NOT become required application runtime secrets.

#### Scenario: All vars in schema (happy path)
- GIVEN `env.schema` exists in config
- WHEN a developer needs a new var
- THEN they MUST add it to `env.schema` first

#### Scenario: Hardcoded value (edge case)
- GIVEN source contains `postgres://user:pass@host/db`
- WHEN CI grep runs
- THEN build MUST fail; value MUST move to injected environment configuration or a gitignored local env file

### Requirement: Access Discipline

Application environment reads MUST use `astro:env/client` or `astro:env/server`; direct `process.env` and `import.meta.env` reads are forbidden in application modules. Runtime modules MUST NOT import `dotenv/config`. Standalone migration/provisioning/backfill scripts MAY read `process.env` and explicitly load a local env file with Node's `process.loadEnvFile()`; they MUST NOT import the Astro virtual environment module.

#### Scenario: Correct import (happy path)
- GIVEN server module needs `DATABASE_HOST`
- WHEN developer writes import
- THEN MUST use `import { DATABASE_HOST } from 'astro:env/server'`

#### Scenario: Forbidden pattern (edge case)
- GIVEN application code contains `process.env.DATABASE_HOST`
- WHEN `grep -rE "process\.env|import\.meta\.env" src/` runs
- THEN MUST return zero matches; CI MUST fail

#### Scenario: Standalone tool outside Astro
- GIVEN a maintenance script loads its documented env file or receives injected secrets
- WHEN it runs directly in Node
- THEN it MAY validate `process.env` without `astro:env/server` or a new dotenv dependency

### Requirement: Client/Server Isolation

Secret vars (`access: 'secret'`) MUST NOT be reachable from client code. Only `context: 'client'`, `access: 'public'` vars MAY import from `astro:env/client`; server-context values such as `DATABASE_SSL` MUST remain server-only even when their access is public.

#### Scenario: Secret blocked from client (happy path)
- GIVEN `DATABASE_PASSWORD` has `access: 'secret'`
- WHEN client imports from `astro:env/client`
- THEN build MUST fail; secret MUST NOT appear in bundle

#### Scenario: Public var accessible (edge case)
- GIVEN a nonsecret variable is declared with `context: 'client'` and `access: 'public'`
- WHEN client imports from `astro:env/client`
- THEN import MUST succeed; value present in bundle

### Requirement: Secret Storage Convention

Local real values MUST reside only in gitignored `.env*` files. Hosted deployments and trusted CI MUST use environment-scoped secret injection. Committed `.env.example` MUST contain names and safe placeholders only, never real secrets. Development, Preview, and production MUST use isolated Neon branches, database credentials, storage endpoints, and credentials; untrusted previews MUST NOT receive production migration secrets.

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
System MUST declare six server-context PostgreSQL vars in `env.schema`: `DATABASE_HOST` (string, secret), `DATABASE_PORT` (number, secret), `DATABASE_USER` (string, secret), `DATABASE_PASSWORD` (string, secret), `DATABASE_NAME` (string, secret), `DATABASE_SSL` (boolean, public, default `false` for local development). These vars are consumed by `src/lib/db.ts` to build runtime connection configuration. Hosted Neon runtime MUST use its pooled endpoint with TLS enabled and a role without schema-migration privileges. Standalone migrations MUST use a separately privileged direct connection supplied as script-only `MIGRATION_DATABASE_URL`; it MUST NOT be exposed to the application or client.

#### Scenario: All six vars declared (happy path)

- GIVEN `env.schema` exists
- WHEN schema inspected
- THEN all six vars MUST be present with correct `type`, `context`, `access`

#### Scenario: Missing variable (edge case)

- GIVEN `DATABASE_PORT` is missing or invalid
- WHEN the server environment is validated for database use
- THEN validation MUST fail naming the variable without exposing credential values

#### Scenario: DB vars consumed at runtime

- GIVEN `src/lib/db.ts` imports from `astro:env/server`
- WHEN the lazy runtime pool first initializes
- THEN the six DATABASE_* vars MUST be used to construct the Postgres connection configuration

### Requirement: Validation at Consumption Boundaries

Configuration MUST fail safely at the relevant server/tool consumption boundary. `env.validateSecrets` MAY be enabled in a trusted build supplied with the required secrets; a build alone MUST NOT be treated as proof of runtime configuration or cloud connectivity. Storage fields MAY be optional in the schema to permit unrelated builds/tests, but all five MUST be non-empty and validated together before any storage operation. Script-only migration secrets MUST NOT be required to build or start the application.

#### Scenario: All secrets present (happy path)
- GIVEN all required runtime secrets are injected
- WHEN the corresponding service initializes
- THEN configuration validation MUST succeed without exposing secret values

#### Scenario: Missing secret with server runtime (edge case)
- GIVEN `DATABASE_PASSWORD` is missing
- WHEN database configuration is consumed
- THEN the operation MUST fail safely naming the missing field, without credentials or fallback data

#### Scenario: Missing secret in static-only build (documented limitation)
- GIVEN a build does not consume a configured service
- WHEN the build succeeds
- THEN the deployment MUST still verify that service's runtime environment before activation

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

### Requirement: Storage Variables

`AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `STORAGE_BUCKET` MUST be declared as server-context secret strings. All are required on storage use; validate the endpoint URL, region, bucket name, and credential presence without logging values. `lawhobucket` is the project's verified private bucket; a configured name alone is still not proof that the bucket exists in another environment. Neither AWS SDK credential-chain defaults nor local disk fallback may hide missing configuration.

#### Scenario: Missing storage configuration

- GIVEN any required storage field is missing or invalid
- WHEN upload authorization, finalization, or managed-image delivery is attempted
- THEN the operation MUST fail safely with no remote write or leaked credential

#### Scenario: Legacy upload configuration

- GIVEN `UPLOADS_DIR` or `PUBLIC_UPLOADS_URL` remains for an explicitly documented legacy reader/backfill tool
- WHEN the Vercel application handles a new upload
- THEN it MUST NOT require these variables, write to disk, or derive a new image URL from them

### Requirement: Upload Size Configuration

`MAX_UPLOAD_SIZE_BYTES` MUST be a positive server-context secret number defaulting to `5242880` (5 MiB). The same effective limit MUST govern authorization and bounded server finalization. The production contract MUST retain the inclusive 5 MiB limit rather than reducing it to fit Vercel's 4.5 MB request limit.

#### Scenario: Exact default boundary

- GIVEN the default upload limit
- WHEN a pending object is exactly 5242880 bytes and otherwise valid
- THEN size validation MUST accept it without routing its raw bytes through the application POST

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
