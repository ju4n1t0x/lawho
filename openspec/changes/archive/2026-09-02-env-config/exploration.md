# Exploration: env-config

## Current State

The repo is a bare Astro 7.2.10 scaffold. Nothing consumes environment variables today.

Verified evidence:

- `astro.config.mjs` — only `defineConfig({})` (empty config, no `env.schema`).
- `.gitignore` — ignores `.env` and `.env.production` only. Does **not** ignore `.env.development`, `.env.local`, or `.env.*.local`. No `.env*` files exist on disk.
- `package.json` — Astro `^7.2.10` only. Engines `node >=22.12.0`. No DB driver, no test runner, no extra libs.
- `src/` — only `pages/index.astro`, `layouts/Layout.astro`, `components/Welcome.astro` (Astro basics starter). Zero `process.env`, `import.meta.env`, or `astro:env` references anywhere in `src/` or `astro.config.mjs`.
- `docs/constitution.md` — Rule 5 mandates "PostgreSQL como servicio aparte consumido por variables de entorno"; Rule 6 mandates variables in English, user messages in Spanish.
- `openspec/config.yaml` — no env convention declared; `strict_tdd: false` (no test runner yet).
- `openspec/specs/` — empty (no main specs written yet).
- `openspec/changes/archive/` — empty (first active change).

`astro:env` API confirmed available in installed Astro 7.2.10 (read from `node_modules/astro/dist/env/`):

- `envField` exported from `astro/config` and `astro/dist/config/entrypoint.js`. Four kinds: `envField.string`, `envField.number`, `envField.boolean`, `envField.enum`.
- Each field requires `context` (`"client" | "server"`) and `access` (`"public" | "secret"`). Optional `optional: true` and `default: <value>`. String fields also support `url`, `min`, `max`, `length`, `includes`, `startsWith`, `endsWith`. Number fields support `gt`, `lt`, `min`, `max`, `int`.
- Runtime access via `import { ... } from "astro:env/client"` (public vars only) and `import { ..., getSecret } from "astro:env/server"` (server + secrets via `getSecret`).
- `env.validateSecrets` defaults to `false` — public vars validated on dev/build start, secrets validated only at runtime unless explicitly enabled.

## Affected Areas

- `astro.config.mjs` — must declare `env.schema` (the single source of truth). This is the only place where env var shape is defined.
- `.gitignore` — must add `.env.development`, `.env.local`, `.env.*.local` (Astro/Vite precedence: `.env.local` overrides `.env` per-developer and must never be committed). `.env.example` MUST stay tracked (committed template).
- `openspec/config.yaml` — should record the env convention under `rules.apply` so future phases inherit it.
- Future code in `src/` — server islands (auth), content collections, any DB client wiring. Imports must come from `astro:env/client` or `astro:env/server`, never `process.env` or `import.meta.env`.
- Deployment surface (Docker / VPS) — env vars injected at runtime via `docker run -e` or compose `environment:`, never baked into image. Documented at the spec level, not the code level.
- Documentation: a short `README.md` / project-root note explaining the convention is optional but recommended once any contributor needs to add a new env var.

## Approaches

### A. Astro type-safe `astro:env` schema + `.env` + `.env.example`

Declare every variable in `astro.config.mjs` via `envField`, store real values in gitignored `.env` / `.env.development` / `.env.production`, commit a placeholder-only `.env.example`. Access values via `astro:env/client` and `astro:env/server`.

- Pros:
  - Type-safe at compile time (autocomplete on `import { DATABASE_URL } from "astro:env/server"`).
  - Zod validation at dev/build start for public vars; runtime validation for secrets.
  - Enforced client/server isolation — a `secret` variable CANNOT be imported from `astro:env/client` (compile error).
  - Single source of truth: one file (`astro.config.mjs`) lists every variable the project uses.
  - Zero new dependencies — built into Astro 7.2.
  - Aligns with Astro 5+ idiom and the project's "minimal stack" constitution rule.
- Cons:
  - Newer API; the `context` / `access` matrix takes one read of the docs to internalize.
  - Secret validation only runs at runtime unless `env.validateSecrets: true` is set — must be enabled in CI.
  - `getSecret` indirection for secret values (vs direct property access for public) — small ergonomic cost.
- Effort: **Low**.

### B. Legacy Vite `import.meta.env` with `PUBLIC_`/`SECRET_` prefixes

Continue using plain `.env` files and read via `import.meta.env.PUBLIC_*` (exposed to client) / `import.meta.env.SECRET_*` (server only). No schema declaration.

- Pros:
  - Zero config, no `astro.config.mjs` changes.
  - Familiar to anyone who has used Vite/Next/SvelteKit.
- Cons:
  - **No schema, no validation** — a missing variable fails only when first read at runtime, with no useful error.
  - **No compile-time types** — `import.meta.env.PUBLIC_FOO` is typed as `any`/`string | undefined`.
  - **`SECRET_` is convention only**, not enforced. A `SECRET_DATABASE_PASSWORD` accidentally read from a client component silently ships to the browser bundle — Astro cannot stop you.
  - **No single source of truth** — variables can be referenced from anywhere with no central list. Contradicts the user's explicit requirement.
  - Older pattern; the Astro team recommends `astro:env` for new projects.
- Effort: Low to set up, but fights the goal.

### Recommendation

**Approach A.** It is the only option that delivers what the user actually asked for: "type-safe `astro:env` schema as the single source of truth" and "ZERO hardcoded values". It is built into the installed Astro version, requires no new dependencies (respects the constitution's minimal-stack rule), and gives compile-time guarantees that `import.meta.env` cannot.

Concrete PostgreSQL first-instance variable set (recommended minimum, `context: "server"`, `access: "secret"`):

- `DATABASE_URL` — `envField.string({ context: "server", access: "secret" })`. Single connection URL is preferred over decomposed host/port/user/pass because every PostgreSQL driver (pg, postgres.js, etc.) consumes `DATABASE_URL` natively and supports URL-encoded options (`?sslmode=require`, `?schema=...`).
- `DATABASE_SSL` — `envField.boolean({ context: "server", access: "public", default: false })`. Public-server so dev tools / health checks can read it.

Decomposed vars (`DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`) are a viable alternative but add five env vars and force the DB client to assemble them. Recommend against unless deployment tooling requires it.

Filesystem layout the proposal should mandate:

```
.env                  # shared defaults, gitignored (already ignored)
.env.example          # committed template with placeholder values only
.env.development      # dev overrides, gitignored (must add)
.env.local            # per-developer overrides, gitignored (must add)
.env.production       # prod-only overrides, gitignored (already ignored)
```

`.gitignore` additions required before any work begins (otherwise the convention is unsafe):

```
.env.development
.env.local
.env.*.local
```

## Risks

- **Drift back to `process.env`**: every future contributor must import from `astro:env/*`. Without a lint rule, drift is easy. Proposal should consider adding an ESLint rule or a CI grep gate (`grep -r "process.env" src/` → fail). Constitution rule 4 says tests are obligatory — a CI grep check is the lightest possible "test" for this invariant.
- **Secret validation timing**: `env.validateSecrets` defaults to `false`, so `DATABASE_URL` will not fail `astro build` unless explicitly enabled. Recommendation: set `validateSecrets: true` in `astro.config.mjs` so production builds fail fast on missing secrets.
- **`.env.example` discipline**: easy to accidentally commit a real secret. Proposal should mandate that `.env.example` is checked for non-placeholder values (no `=postgres://user:realpass@...`) — same grep / lint pattern.
- **`.env.development` / `.env.local` currently untracked**: any secret committed to those files today would ship to git. Must patch `.gitignore` in the first task of `apply` before any env file is created.
- **Single-DB vs split-DB env vars**: the user may have an opinion (e.g. corporate convention, Docker secret per variable). Surface as a question to the user in the proposal, but recommend `DATABASE_URL` as default.
- **Vite load order gotcha**: `import.meta.env.PUBLIC_FOO` and `astro:env` can both exist in the same project if mixed. The proposal must explicitly forbid `import.meta.env` to avoid silent leakage.
- **Constitution alignment**: constitution rule 5 says env vars only, rule 1 says minimal stack. Approach A satisfies both. Approach B satisfies rule 5 but adds cognitive load and bypasses Astro's built-in type safety (mild violation of "spec-driven" governance in rule 2 because it accepts runtime-only validation).

## Ready for Proposal

**Yes.** The recommendation is unambiguous (Approach A). Concrete shape:

- Define `DATABASE_URL` and `DATABASE_SSL` as the first two env vars in `astro.config.mjs`.
- Create `.env.example` with placeholders, gitignore all real `.env*` files.
- Update `openspec/config.yaml` `rules.apply` with the env convention so subsequent phases inherit it.
- Optionally enable `env.validateSecrets: true` for production builds.

Open question for the orchestrator to surface to the user:

> Confirm whether the first concrete PostgreSQL variable should be a single `DATABASE_URL` (recommended) or decomposed `DATABASE_HOST` / `DATABASE_PORT` / `DATABASE_USER` / `DATABASE_PASSWORD` / `DATABASE_NAME`. Default proposal will use `DATABASE_URL` unless you say otherwise.
