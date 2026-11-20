# Docker Deploy Specification

## Purpose

Defines the primary Vercel Node deployment contract and the retirement boundary for the former Docker/VPS deployment. Docker/Dokploy is an optional legacy reference, not a production acceptance gate. This specification does not authorize deleting existing deployment files or user changes.

## Requirements

### Requirement: Production Astro Configuration

The primary deployment MUST use `@astrojs/vercel` in `astro.config.mjs` with Vercel's Node runtime for routes, server islands, middleware, PostgreSQL, Argon2id, and sharp. It MUST NOT select Edge middleware/runtime for these paths. The adapter and AWS SDK dependencies are explicitly authorized by `docs/constitution.md` before installation; reuse existing `pg`, `argon2`, and `sharp`. Routes MUST resolve from `/` without the former GitHub Pages base prefix; a canonical `site` MAY be set when verified.

#### Scenario: Vercel adapter enabled

- GIVEN `astro.config.mjs`
- WHEN inspected after the Vercel deployment implementation
- THEN the active adapter MUST be `@astrojs/vercel`, not `@astrojs/node` standalone
- AND native password/image processing and DB middleware MUST execute on Node, not Edge

#### Scenario: No route prefix

- GIVEN `astro.config.mjs`
- WHEN inspected
- THEN it MUST NOT set a non-empty `base` value

### Requirement: Compatible Runtime and Build

The chosen Astro, adapter, Node, package-manager, and native dependency versions MUST be verified together against supported Vercel versions before activation. An existing `engines` declaration or local test success alone MUST NOT prove cloud compatibility. Configure the build command and application region explicitly; verify latency/availability against the selected Neon region.

Node 26 is required by the maintainer. Development, CI and deployed function metadata MUST target that major. The canonical build MUST fail before building on any other Node major. While the pinned adapter incorrectly falls back to `nodejs24.x`, an explicit post-build compatibility step MAY normalize its documented Build Output API function `runtime` fields to `nodejs26.x`, preserving all other configuration. The deployment inspection MUST independently reject missing functions, Edge/unknown runtimes and any remaining non-26 runtime. Remove this compatibility step only after verifying native Node 26 support in a newer adapter. Do not edit vendor code or silently downgrade Node.

#### Scenario: Reproducible build

- GIVEN compatible versions and environment-scoped configuration
- WHEN Vercel builds a connected Git branch
- THEN it MUST use the lockfile (`pnpm install --frozen-lockfile`) and the configured Astro build command
- AND it MUST produce Vercel deployment artifacts, not depend on `dist/server/entry.mjs`

### Requirement: Web Git Deployment

Production deployment MUST be created from the Vercel dashboard by importing the GitHub repository. A local Vercel CLI login, prebuilt artifact upload or deployment token MUST NOT be a prerequisite. `vercel.json` MUST NOT disable Git deployments and MUST pin the canonical build command. Pushes to `dev` deploy Preview/staging and merges to `main` deploy production, using Vercel environment-scoped variables and isolated Neon targets. Repository CI MAY run type checks, tests and the canonical build, but it MUST NOT hold deployment or privileged migration credentials.

#### Scenario: Push triggers the deployment

- GIVEN the repository is connected to a Vercel project
- WHEN a commit lands on a configured branch
- THEN Vercel MUST build and deploy it without any manual CLI step
- AND the deploy-time build MUST fail if the Node 26 guard, runtime normalization or artifact inspection fails

#### Scenario: CI does not deploy

- GIVEN a pull request or a push to `dev`/`main`
- WHEN the CI workflow runs
- THEN it MUST verify type checks, tests and the canonical build
- AND it MUST NOT perform a deployment or read privileged migration secrets

### Requirement: Serialized Migration Step Outside the Deployment

The migration command defined by `db-connection` MUST run as an explicit, serialized maintenance operation from a trusted operator environment, before the release requiring the new schema is pushed for deployment. The Vercel build and the application runtime MUST NOT execute DDL and MUST NOT receive `MIGRATION_DATABASE_URL` or any other migration credential; Vercel has no build-only variables, so such a value would also be readable by deployed functions. Runtime MUST use pooled Neon credentials, while direct migration credentials remain separately privileged and absent from the deployed application. Development/Preview and production MUST use isolated Neon branches, endpoints, and credentials; untrusted previews MUST NOT receive production migration secrets. Do not run migrations on requests, imports, or cold starts.

#### Scenario: Migration failure blocks release

- GIVEN a failed migration or checksum mismatch
- WHEN a release is prepared
- THEN the operator MUST NOT deploy application code requiring that schema
- AND the previously deployed application MUST remain active

#### Scenario: No migration credentials in deployment

- GIVEN the deployed build and function environment
- WHEN its variables are inspected
- THEN `MIGRATION_DATABASE_URL` MUST be absent
- AND no build step MUST attempt schema changes

### Requirement: External Persistence

Sessions MUST continue using shared PostgreSQL tables, not memory/local files or an additional Redis auth system. Editorial images MUST use private Neon Object Storage with the direct pending-upload/finalization and `/media/<key>` delivery contracts. Primary production MUST NOT require `UPLOADS_DIR`, Nginx upload aliases, `unlink`, or persistent application volumes. No runtime module may import `dotenv/config` or contain a top-level S3 test upload.

#### Scenario: Application redeployment

- GIVEN a valid DB-backed session and finalized image references
- WHEN application instances are replaced
- THEN sessions and images MUST remain usable independently of the previous local filesystem

### Requirement: Tests in Git, Not Deployment Outputs

Tests MUST remain versioned with code in `dev` and `main` and run in CI/pre-deployment verification. Installing test dependencies in CI/build is allowed. Test sources, fixtures, coverage reports, and test-only tooling MUST be excluded from deployed static assets and function bundles and MUST NOT run in the application runtime. `devDependencies` classification alone MUST NOT establish exclusion.

#### Scenario: Inspect generated artifacts

- GIVEN a successful Vercel production build
- WHEN generated static outputs and function bundles are inspected
- THEN no tests, fixtures, coverage reports, or test-only tooling MUST be present
- AND the same test files MUST remain tracked in Git

### Requirement: Activation and Rollback Boundary

Activation MUST verify the full test suite, production build, and isolated Neon/Vercel checks for migrations, account provisioning/login, create/edit, image access after signed-GET expiry, upload authorization, and draft/Preview isolation. Unit tests alone MUST NOT be reported as proof of cloud access or deployment. Application rollback MUST retain committed additive schema and image objects; no automatic down migration or bucket/local-original deletion is permitted. Integration goes through `dev`; `main` requires explicit maintainer confirmation that `dev` is stable.

#### Scenario: Failed build after committed migration

- GIVEN the migration step committed before a failing build
- WHEN rolling back the application
- THEN backward-compatible schema and stored assets MUST remain intact for the previous application

### Requirement: Optional Legacy Docker Reference

Existing Dockerfile/compose/Dokploy files MAY remain as historical or separately maintained self-hosting examples. They are not required for Vercel activation and MUST NOT force the primary adapter back to `@astrojs/node`. Their old named-volume, upload-directory, standalone entry, and session-secret requirements are retired from the primary production contract. A supported self-hosting alternative requires a separately verified adapter/runtime configuration, not an assumption that Vercel artifacts run as a standalone container.

#### Scenario: Legacy files preserved

- GIVEN existing Docker deployment files and unrelated user edits
- WHEN the Vercel migration is implemented
- THEN they MUST NOT be deleted/reset without confirmation
- AND retaining them MUST NOT imply they have been rebuilt or validated as the active deployment

If a legacy container is explicitly built, its context/image MUST exclude real `.env*`, local uploads, VCS metadata, stale build outputs, and test-only runtime artifacts, use lockfile installation and compatible Node versions, and keep PostgreSQL external. Secrets MUST be injected rather than hardcoded. These conditional safeguards do not require a Docker build for Vercel releases.
