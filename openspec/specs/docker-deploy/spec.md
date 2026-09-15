# Docker Deploy Specification

## Purpose

Defines the containerization contract for deploying LaWho on a VPS via Docker/Dokploy: a production image of the Astro Node server (`@astrojs/node` standalone), the compose topology with PostgreSQL as an external service consumed through environment variables, and the production configuration requirement that `astro.config.mjs` runs with the Node adapter enabled and no route prefix (`base`).

## Requirements

### Requirement: Production Astro Configuration

The system MUST enable the Astro Node adapter (`@astrojs/node`, standalone mode) in `astro.config.mjs` for production. The `site` and `base` values used for the GitHub Pages preview MUST NOT be present in the production configuration, so routes resolve from the root (`/`) without a prefix.

#### Scenario: Node adapter enabled

- GIVEN `astro.config.mjs`
- WHEN inspected after the Docker deploy change
- THEN the `adapter` MUST be defined as `node({ mode: 'standalone' })` and MUST NOT be commented out

#### Scenario: No route prefix

- GIVEN `astro.config.mjs`
- WHEN inspected
- THEN it MUST NOT set a non-empty `base` value

### Requirement: Dockerfile

The system MUST provide a `Dockerfile` at the repository root that builds a production image for the standalone Astro Node server.

#### Scenario: Multi-stage build

- GIVEN the Dockerfile
- WHEN the image is built
- THEN the build MUST use pnpm with the project's lockfile (`pnpm install --frozen-lockfile`)
- AND the final stage MUST run the compiled standalone server entry (`node ./dist/server/entry.mjs`)

#### Scenario: Node version requirement

- GIVEN the Dockerfile
- WHEN the image is built
- THEN the Node.js version used MUST satisfy the `engines` requirement in `package.json` (>= 22.12.0)

#### Scenario: Non-root runtime

- GIVEN the final image
- WHEN inspected
- THEN the runtime process MUST run as a non-root user

#### Scenario: Health check

- GIVEN the final image
- WHEN it is running
- THEN the image MUST expose a HEALTHCHECK that succeeds when the server responds

### Requirement: Docker Compose Topology

The system MUST provide a `docker-compose.yml` at the repository root that runs only the application service. PostgreSQL MUST NOT be defined as a compose service (constitution rule 5 — external persistence); the connection is supplied entirely through environment variables.

#### Scenario: Application service only

- GIVEN `docker-compose.yml`
- WHEN inspected
- THEN it MUST NOT declare a `postgres` service (or any database service)

#### Scenario: Database via environment

- GIVEN `docker-compose.yml`
- WHEN inspected
- THEN the application service MUST receive the `DATABASE_*` variables (`DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`, `DATABASE_SSL`) from the environment

#### Scenario: Upload persistence

- GIVEN `docker-compose.yml`
- WHEN inspected
- THEN the `UPLOADS_DIR` path MUST be backed by a named volume so uploaded images survive container restarts

#### Scenario: Session secret

- GIVEN `docker-compose.yml`
- WHEN inspected
- THEN the `SESSION_SECRET` variable MUST be passed from the environment (not hardcoded)

#### Scenario: Public uploads URL

- GIVEN `docker-compose.yml`
- WHEN inspected
- THEN `PUBLIC_UPLOADS_URL` MUST be provided from the environment (e.g. `https://dominio/uploads` or `/uploads`) so `image` URLs in the notes collection resolve correctly

### Requirement: Dockerignore

The system MUST provide a `.dockerignore` that excludes build artifacts, local uploads, environment files, and VCS metadata from the build context, so secrets and stale artifacts do not enter the image.

#### Scenario: Secrets excluded

- GIVEN the `.dockerignore`
- WHEN inspected
- THEN it MUST exclude `.env*` files

#### Scenario: Build artifacts excluded

- GIVEN the `.dockerignore`
- WHEN inspected
- THEN it MUST exclude `node_modules`, `dist`, `.astro`, and `uploads`

### Requirement: Dokploy Compatibility

The compose file MUST use env-var interpolation without hardcoded secrets so Dokploy's environment management can inject them at deploy time.

#### Scenario: Variables interpolated

- GIVEN `docker-compose.yml`
- WHEN inspected
- THEN database and session values MUST reference `${VAR}` placeholders (or `env_file`) rather than literal secrets