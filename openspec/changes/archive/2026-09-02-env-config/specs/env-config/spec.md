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

System MUST declare six PostgreSQL vars in `env.schema`: `DATABASE_HOST` (string, secret), `DATABASE_PORT` (number, secret), `DATABASE_USER` (string, secret), `DATABASE_PASSWORD` (string, secret), `DATABASE_NAME` (string, secret), `DATABASE_SSL` (boolean, public, default `false`).

#### Scenario: All six vars declared (happy path)
- GIVEN `env.schema` exists
- WHEN schema inspected
- THEN all six vars MUST be present with correct `type`, `context`, `access`

#### Scenario: Missing variable (edge case)
- GIVEN `DATABASE_PORT` omitted from schema
- WHEN `astro build` runs with `validateSecrets: true`
- THEN build MUST fail with missing variable error

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
