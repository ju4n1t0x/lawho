# Dev Environment Specification

## Purpose

Defines the developer experience contract: `openspec/config.yaml` context accuracy and README quick-start documentation for the post-auth stack.

## Requirements

### Requirement: Config Context Refresh

`openspec/config.yaml` `context` block MUST accurately reflect the post-change stack: `@astrojs/node` adapter, live collections, `pg`/`argon2` dependencies, and PostgreSQL as a consumed (not just declared) database.

#### Scenario: Context block accurate

- GIVEN the change is complete
- WHEN `openspec/config.yaml` is read
- THEN the `context` block MUST mention the Node adapter, live collections, and consumed DB

#### Scenario: No stale references

- GIVEN the updated config
- WHEN inspected
- THEN it MUST NOT describe the stack as "static-only" or "no additional libraries"

### Requirement: README Quick-Start Update

The README MUST document the updated local development workflow:

1. PostgreSQL setup (local or remote)
2. Running migrations (`migrations/001-init.sql`)
3. Required env vars (all `DATABASE_*`, `SESSION_TTL_MS`, `UPLOADS_DIR`, `PUBLIC_UPLOADS_URL`)
4. Dev server start (`pnpm dev` or `astro dev`)
5. Writer routes access (`/escritor/` (read-only) on localhost)

#### Scenario: README covers DB setup

- GIVEN the README
- WHEN the "Development" section is read
- THEN it MUST include instructions for setting up PostgreSQL

#### Scenario: README covers migrations

- GIVEN the README
- WHEN inspected
- THEN it MUST document how to apply `migrations/001-init.sql`

#### Scenario: README covers env vars

- GIVEN the README
- WHEN inspected
- THEN it MUST list the required env vars or reference `.env.example`

#### Scenario: README covers writer access

- GIVEN the README
- WHEN inspected
- THEN it MUST explain how to access `/escritor/` (read-only) locally

### Requirement: Env Example Update

`.env.example` MUST include all new vars (`SESSION_TTL_MS`, `UPLOADS_DIR`, `PUBLIC_UPLOADS_URL`) with placeholder values.

#### Scenario: New vars in .env.example

- GIVEN `.env.example`
- WHEN inspected
- THEN it MUST contain `SESSION_TTL_MS`, `UPLOADS_DIR`, `PUBLIC_UPLOADS_URL` with placeholder values

#### Scenario: Placeholders only

- GIVEN `.env.example`
- WHEN inspected
- THEN no real credentials or paths MUST be present
