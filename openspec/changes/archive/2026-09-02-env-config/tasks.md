# Tasks: Environment Variable Convention (env-config)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~60–90 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Ship the env-var convention across the 4 files | PR 1 | `grep -rE "process\.env\|import\.meta\.env" src/ astro.config.mjs` → zero matches | `astro build` (fails naming missing var; passes with `.env` present) | revert `astro.config.mjs`, `.gitignore`, `openspec/config.yaml`; `rm .env.example` |

## Phase 1: Foundation / Security Hardening

- [x] 1.1 Add `.env.development`, `.env.local`, `.env.*.local` to `.gitignore` BEFORE any env file exists (ENV-04).
- [x] 1.2 Confirm `git status` shows no tracked `.env*` files (ENV-04).

## Phase 2: Schema Declaration

- [x] 2.1 In `astro.config.mjs`, import `envField` from `astro/config`.
- [x] 2.2 Add `env.schema` declaring the 5 secret vars via `envField`: `DATABASE_HOST` (string/secret), `DATABASE_PORT` (number/secret), `DATABASE_USER` (string/secret), `DATABASE_PASSWORD` (string/secret), `DATABASE_NAME` (string/secret) (ENV-01, ENV-05).
- [x] 2.3 Add `DATABASE_SSL` (boolean, `access: 'public'`, `default: false`) to `env.schema` (ENV-03, ENV-05).
- [x] 2.4 Set `env.validateSecrets: true` (ENV-06).

## Phase 3: Convention Template

- [x] 3.1 Create `.env.example` (committed) with all 6 vars as placeholders only, mirroring schema (ENV-04, ENV-05).

## Phase 4: Governance Record

- [x] 4.1 Record the convention in `openspec/config.yaml` `rules.apply`: env vars via `astro:env/*`, `process.env`/`import.meta.env` forbidden (ENV-02).

## Phase 5: Verification

- [x] 5.1 Run `grep -rE "process\.env|import\.meta\.env" src/ astro.config.mjs` and assert zero matches (ENV-02 forbidden pattern).
- [x] 5.2 Run `astro build` with `.env` present containing all 5 secrets → must succeed (ENV-06 happy path).
- [x] 5.3 Document ENV-06 static-mode limitation (amended per maintainer decision): negative-build secret validation defers until a server runtime or `astro:env/server` consumer exists.
- [x] 5.4 Verify `.env.example` contains placeholders only, no real credentials (ENV-04).

> **Apply deviation (5.3)**: The negative build did NOT fail. With `output: 'static'` (no adapter/server runtime) and zero code importing `astro:env/server`, Astro 7.2's `validateSecrets: true` never triggers — it validates secrets "on server start" (dev server or SSR build) and whenever something is imported from `astro:env/server`. Neither condition holds in this bare static scaffold. The spec ENV-06 edge-case ("build MUST fail naming the missing var") is not satisfiable until a server runtime (adapter/`output: 'server'`) or an `astro:env/server` consumer exists. Left unchecked; requires an orchestrator/user decision on whether to amend the spec/design or defer the assertion.