# Dev Environment Specification

## Purpose

Defines local setup and operational documentation requirements for the approved Vercel + Neon stack. These are implementation acceptance requirements, not claims that README, configuration, scripts, or cloud resources have already been changed.

## Requirements

### Requirement: Reproducible Type Checking

Development dependencies MAY include the pinned TypeScript compiler and Node/PostgreSQL declarations (`typescript`, `@types/node`, `@types/pg`) for `pnpm typecheck`. This check MUST NOT rely on a globally installed compiler. These are development-only tools and MUST NOT appear in deployed runtime artifacts.

### Requirement: Config Context Refresh

When configuration alignment is implemented, `openspec/config.yaml` `context` MUST reflect `@astrojs/vercel` on Node (not Edge), live collections, `pg`/`argon2`/`sharp`, authorized AWS SDK dependencies, pooled Neon runtime access, separate direct migrations, and private object storage. Updating that configuration file is a separate implementation task; this documentation-only alignment does not change it.

#### Scenario: Context block accurate

- GIVEN the change is complete
- WHEN `openspec/config.yaml` is read
- THEN the `context` block MUST mention the Vercel Node adapter, live collections, Neon DB, and private storage without requiring Docker/Nginx

#### Scenario: No stale references

- GIVEN the updated config
- WHEN inspected
- THEN it MUST NOT describe the stack as "static-only" or "no additional libraries"

### Requirement: README Quick-Start Update

The README MUST document the updated local development workflow:

1. Compatible Astro/adapter/Node/package-manager versions and lockfile installation; isolated development Neon branch or local PostgreSQL, never production credentials for untrusted Preview.
2. The tracked migration command, checksums, serialization, fresh/repeat runs, verified existing-schema baselines, and execution before the build. Explain that `001` already inserts one example note (not a writer or image file), `002` is optional/excluded by default, and `003` plus the additive nullable `image_key` migration are required. Do not present running only `001` manually as sufficient setup.
3. Runtime `DATABASE_*`, `SESSION_TTL_MS`, `MAX_UPLOAD_SIZE_BYTES`, all five storage secrets from `env-config`, and the script-only direct `MIGRATION_DATABASE_URL`. Explain Astro runtime access versus standalone `process.env`/`process.loadEnvFile()` without runtime dotenv. Legacy `UPLOADS_DIR`/`PUBLIC_UPLOADS_URL` are not required for new production uploads.
4. Maintainer writer-provisioning CLI with securely entered plaintext, existing 8–128 password policy and Argon2id, duplicate-email handling, and no public registration or deploy-time resets. Never show passwords in command arguments or logs.
5. Local dev server start/stop/status/logs using repository background-server instructions and route-based `/escritor/` access on localhost; Nginx/custom subdomains are optional legacy references.
6. Verified private `lawhobucket` bucket, branch endpoint/region/scopes, explicit-origin CORS, browser presigned pending PUT, finalization with the inclusive 5 MiB limit, and stable `/media/<key>` delivery. Explain why raw image form POSTs exceed Vercel's 4.5 MB limit.
7. Explicit pre-release migration step run from a trusted operator environment outside the Vercel build, with `MIGRATION_DATABASE_URL` absent from the Vercel project, plus Vercel build/runtime/region/environment scopes, additive rollback boundaries, safe orphan cleanup, and dry-run verified legacy transfer without deleting local originals. Actual bucket access mode and integration targets require confirmation before live operations.

README editing and command implementation are follow-up work; this documentation alignment MUST NOT imply those commands already exist.

#### Scenario: README covers DB setup

- GIVEN the README
- WHEN the "Development" section is read
- THEN it MUST include instructions for setting up PostgreSQL

#### Scenario: README covers migrations

- GIVEN the README
- WHEN inspected
- THEN it MUST document the tracked schema migration command and distinguish required migrations from optional sample content

#### Scenario: README covers env vars

- GIVEN the README
- WHEN inspected
- THEN it MUST list the required env vars or reference `.env.example`

#### Scenario: README covers writer access

- GIVEN the README
- WHEN inspected
- THEN it MUST explain how to access `/escritor/` (read-only) locally

### Requirement: Env Example Update

When implemented, `.env.example` MUST document runtime `DATABASE_*`, `SESSION_TTL_MS`, `MAX_UPLOAD_SIZE_BYTES`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `STORAGE_BUCKET`, and script-only `MIGRATION_DATABASE_URL` with safe placeholders/defaults and role separation. All storage fields are required on storage use; privileged migration credentials MUST NOT be distributed to runtime or untrusted previews. Legacy upload settings MAY be documented separately for backfill/read compatibility only.

#### Scenario: New vars in .env.example

- GIVEN `.env.example`
- WHEN inspected
- THEN it MUST contain the documented runtime/storage variables and separately labeled migration configuration with safe placeholders/defaults

#### Scenario: Placeholders only

- GIVEN `.env.example`
- WHEN inspected
- THEN no real credentials or paths MUST be present

### Requirement: Verification Without Shipping Tests

Documentation MUST keep `pnpm test` as pre-deployment verification and state that tests remain tracked in `dev` and `main`. CI/build MAY install test dependencies, but generated Vercel static outputs/functions MUST exclude tests, fixtures, coverage, and test-only tooling. Require inspection of actual artifacts and isolated cloud integration checks; local unit tests alone do not prove Vercel/Neon access or version compatibility.

#### Scenario: Documentation-only handoff

- GIVEN only specifications and contributor documentation have changed
- WHEN reporting completion
- THEN report actual test results and list unverified cloud prerequisites and remaining README/configuration/application work
