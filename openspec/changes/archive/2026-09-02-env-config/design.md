# Design: Environment Variable Convention (env-config)

## Technical Approach

Introduce a type-safe, single-source-of-truth env-var convention for the bare Astro 7.2.10 scaffold using built-in `astro:env`. Declare all six PostgreSQL vars once in `astro.config.mjs` `env.schema` via `envField`; code imports only from `astro:env/server` (or `astro:env/client` for public vars). Real values live only in gitignored `.env*` files; `.env.example` is committed with placeholders. Enforce access discipline via a CI grep gate. Satisfies spec ENV-01..ENV-06 with zero new dependencies (constitution rule 1).

## Architecture Decisions

### Decision 1: `astro:env` schema

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `astro:env` + `envField` | Newer API; requires `astro:env/*` imports | **Chosen** |
| Legacy `import.meta.env` | Familiar; no type safety, no secret/client isolation | Rejected |

**Rationale**: `astro:env` provides typed access, client/server isolation (`context`), secret marking (`access`), and fail-fast validation — all spec requirements ENV-01/03/06. No new dependency (built into Astro 7.2).

### Decision 2: Decomposed PostgreSQL vars

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Six vars (`DATABASE_HOST`, `_PORT`, `_USER`, `_PASSWORD`, `_NAME`, `_SSL`) | More config; explicit per-field types (`PORT`→number, `SSL`→boolean) | **Chosen** |
| Single `DATABASE_URL` | Compact; untyped string, harder to validate, one blob | Rejected |

**Rationale**: user's explicit choice (proposal §Approach). Per-field types enable `envField.number`/`boolean` coercion and precise validation.

### Decision 3: `env.validateSecrets: true`

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `validateSecrets: true` | Build fails on missing secrets; needs `.env` present to build | **Chosen** |
| `false` (default) | Build succeeds silently with undefined vars | Rejected |

**Rationale**: spec ENV-06 — `validateSecrets` validates secrets when a server runtime starts or `astro:env/server` is imported. In this static scaffold (no adapter, no `astro:env/server` consumer), a missing secret does not fail the build; the flag is set now so validation activates automatically once the DB client / server islands land. Matches the amended ENV-06.

### Decision 4: Enforcement mechanism

| Option | Tradeoff | Decision |
|--------|----------|----------|
| CI grep gate (`grep -rE "process\.env|import\.meta\.env" src/ astro.config.mjs`) | Only catches at CI; client-local until push | **Chosen (canonical)** |
| Pre-commit hook | Earlier feedback; needs hook tooling (out of scope, no deps) | Optional hardening |

**Rationale**: spec ENV-04 edge case mentions a pre-commit hook, proposal §Risks mentions a CI grep gate. Constitution rule 4 requires a "test"; with `strict_tdd: false` and no runner, the grep gate is the lightest honest verification. Documented as the canonical enforcement; the pre-commit hook is noted as optional future hardening (not built — no hook infra exists).

## Data Flow

```
.env* (gitignored, real values) ──► astro.config.mjs env.schema (validateSecrets)
                                          │  typed, isolated
                                          ▼
                             astro:env/server ──► server code (secrets)
                             astro:env/client ──► client code (public only)
```

`.env.example` (committed, placeholders) mirrors the schema for developer setup; CI grep blocks any `process.env`/`import.meta.env` bypass.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `astro.config.mjs` | Modify | Add `envField` import; add `env: { schema: {...}, validateSecrets: true }` |
| `.gitignore` | Modify | Add `.env.development`, `.env.local`, `.env.*.local` (currently only ignores `.env`, `.env.production`) |
| `.env.example` | Create | Committed template, six vars with placeholders only |
| `openspec/config.yaml` | Modify | Record convention under `rules.apply` |

## Interfaces / Contracts

`astro.config.mjs` (verified API for installed Astro 7.2.10):

```js
// @ts-check
import { defineConfig, envField } from 'astro/config';

export default defineConfig({
  env: {
    schema: {
      DATABASE_HOST: envField.string({ context: 'server', access: 'secret' }),
      DATABASE_PORT: envField.number({ context: 'server', access: 'secret' }),
      DATABASE_USER: envField.string({ context: 'server', access: 'secret' }),
      DATABASE_PASSWORD: envField.string({ context: 'server', access: 'secret' }),
      DATABASE_NAME: envField.string({ context: 'server', access: 'secret' }),
      DATABASE_SSL: envField.boolean({ context: 'server', access: 'public', default: false }),
    },
    validateSecrets: true,
  },
});
```

`.env.example` placeholders (no real values):

```
DATABASE_HOST=your_database_host_here
DATABASE_PORT=5432
DATABASE_USER=your_database_user_here
DATABASE_PASSWORD=your_database_password_here
DATABASE_NAME=your_database_name_here
DATABASE_SSL=false
```

## Testing Strategy

No test runner exists (`strict_tdd: false`, config `Testing` context confirms none). Verification surface is:

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Static | No `process.env`/`import.meta.env` | `grep -rE "process\.env|import\.meta\.env" src/ astro.config.mjs` → zero matches |
| Build | Secrets validated | `astro build` with `validateSecrets: true`: succeeds with secrets present. Negative-build validation deferred until a server runtime or `astro:env/server` consumer exists (amended ENV-06). |

Honest note: this is grep + build verification, not an automated test suite. The constitution's "tests obligatory" rule is satisfied minimally until a runner (vitest) is introduced in a future change. `validateSecrets: true` is configured now but only activates once server islands (auth) / the DB client import `astro:env/server`.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration required — bare scaffold, zero existing env consumers (`src/` grep confirmed no matches).

## Open Questions

- None. All decisions resolved by spec + proposal + user's explicit variable decomposition.
