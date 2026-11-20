# Proposal: Environment Variable Convention (env-config)

## Intent

Establish a type-safe env-var convention for the bare Astro 7.2 scaffold. PostgreSQL will consume vars (constitution rule 5); without a single source of truth, secrets drift into the bundle or repo. Declare each variable once; forbid ad-hoc access.

## Scope

### In Scope
- `env.schema` in `astro.config.mjs` (decomposed PostgreSQL vars via `envField`).
- `.env.example` committed, placeholders only.
- `.gitignore` hardening for real `.env*` files.
- Convention recorded in `openspec/config.yaml` `rules.apply`.

### Out of Scope
- Actual DB wiring / driver (future work).
- Docker/VPS injection mechanics (spec-level only).
- Any secret values — never committed.

## Capabilities

### New Capabilities
- `env-config`: environment variable convention. All vars are declared in `astro.config.mjs` `env.schema`; code imports only from `astro:env/client` or `astro:env/server`; real values live only in gitignored `.env*` files; `.env.example` is committed with placeholders; zero hardcoded values.

### Modified Capabilities
None (no existing specs).

## Approach

Astro 7.2 built-in `astro:env` schema via `envField` in `astro.config.mjs`. Forbid `process.env` and `import.meta.env` (mixed usage leaks silently). Decomposed PostgreSQL vars (user's explicit choice — NOT a single `DATABASE_URL`):

| Var | Kind | context | access |
|-----|------|---------|--------|
| `DATABASE_HOST` | string | server | secret |
| `DATABASE_PORT` | number | server | secret |
| `DATABASE_USER` | string | server | secret |
| `DATABASE_PASSWORD` | string | server | secret |
| `DATABASE_NAME` | string | server | secret |
| `DATABASE_SSL` | boolean | server | public (default `false`) |

Set `env.validateSecrets: true`; access via `astro:env/server`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `astro.config.mjs` | Modified | Add `env.schema` + `validateSecrets: true` |
| `.gitignore` | Modified | Add `.env.development`, `.env.local`, `.env.*.local` |
| `.env.example` | New | Committed template, placeholders only |
| `openspec/config.yaml` | Modified | Record convention under `rules.apply` |
| `src/**` | Governed | Future code imports `astro:env/*` only |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `.gitignore` gap ships secrets today | Med | Patch `.gitignore` first |
| Secrets not validated at build | Med | `env.validateSecrets: true` |
| Drift to `process.env` | High | CI grep gate on `src/` |
| Real secret committed to `.env.example` | Med | grep for placeholders only |

## Rollback Plan

`git checkout astro.config.mjs .gitignore openspec/config.yaml`; `rm .env.example`. No data loss.

## Dependencies

- None (built into Astro 7.2; constitution rule 1).

## Success Criteria

- [ ] `env.schema` declares all 6 vars with correct `context`/`access`.
- [ ] `grep -rE "process\.env|import\.meta\.env" src/ astro.config.mjs` → zero matches.
- [ ] `.env.example` tracked with placeholders; no real `.env*` file tracked by git.
- [ ] `astro build` passes with `validateSecrets` enabled.
