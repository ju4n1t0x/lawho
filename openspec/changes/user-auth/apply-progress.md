# Apply Progress: User Auth + DB-Backed Blog

## Mode

Standard (strict_tdd: false).

## Delivery

- Chain strategy: `feature-branch-chain`
- Work unit: **Focused remediation — CRITICAL C1 (sliding TTL wiring)** on branch `feat/user-auth-unit-5-docs`.
- Boundary: touches only the session-read request path (`src/middleware.ts`, `LoginForm.astro`, `WriterForm.astro`, `session-repo.ts` + its test). No migrations, schema, or other specs changed.

---

## Focused Remediation — CRITICAL C1 (Sliding TTL wiring)

The `session` spec requires "on each authenticated request, `last_seen_at` MUST be updated and `expires_at` MUST be extended by `SESSION_TTL_MS`". `touchSession()` implemented this but was never called, so sessions used a fixed 24h window from creation. This batch wires it in.

### Completed

- [x] Added `getActiveSessionAndTouch(token, ttlMs)` to `src/lib/session-repo.ts` — loads a non-expired session and, only when VALID, slides its TTL (expired/unknown tokens return null and are never renewed).
- [x] `src/middleware.ts` now loads sessions via `getActiveSessionAndTouch(token, SESSION_TTL_MS)` (sliding renewal on on-demand page requests).
- [x] `src/components/server-islands/LoginForm.astro` + `WriterForm.astro` now re-check + slide via the same helper (islands run isolated; middleware does not run for them).
- [x] `src/lib/session-repo.test.ts` — 2 new unit tests: valid token slides TTL; unknown token does NOT touch.

### Files Changed

| File | Action | What |
|------|--------|------|
| `src/lib/session-repo.ts` | Modified | Added `getActiveSessionAndTouch` (getActiveSession + touchSession, only touches valid) |
| `src/middleware.ts` | Modified | Import `SESSION_TTL_MS`; call `getActiveSessionAndTouch` instead of `getActiveSession` |
| `src/components/server-islands/LoginForm.astro` | Modified | In-island session check now slides TTL |
| `src/components/server-islands/WriterForm.astro` | Modified | In-island session check now slides TTL |
| `src/lib/session-repo.test.ts` | Modified | 2 new tests for `getActiveSessionAndTouch` |

### Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command + result | `PATH=~/.nvm/.../v22.22.3/bin:$PATH pnpm vitest run` → **78 passed (11 files)**, exit 0 (76 baseline + 2 new `getActiveSessionAndTouch` tests) |
| Runtime harness + result | Live Postgres + `astro dev` at `:4321`. Synthetic session (`expires_at = now()+1h`, `last_seen_at = now()-2h`) → `GET /escritor/` (middleware) slid `expires_at`→`now()+24h`, `last_seen_at`→`now`; `GET /_server-islands/WriterForm?…` (island, isolated ctx) slid the same. Cleanup: synthetic session deleted (0 rows remain). |
| Rollback boundary | Revert `src/lib/session-repo.ts` helper, `src/middleware.ts`, `LoginForm.astro`, `WriterForm.astro`, and the 2 new tests. No other unit touched; migrations/schema/other specs untouched. |

### Deviations from Design

- The sliding renewal is implemented as a small `getActiveSessionAndTouch` helper rather than three inline `touchSession` calls, so the "only touch VALID sessions" invariant lives in one tested place and the request path cannot forget the touch. Same behavior, slightly different shape; no design decision changed.
- No debounce/"renew-only-when-expiring" guard was added. Rationale: the middleware already early-returns for public/static routes (landing + blog), so `touchSession` only fires on the authenticated writer-area requests and island self-checks — exactly the "activity" the spec's sliding window targets. Adding a debounce would deviate from the literal "each authenticated request" requirement for no security benefit at this traffic scale. `SESSION_TTL_MS` default (86400000 = 24h) matches the spec.

### Issues Found

- On `POST /escritor/logout`, the middleware still loads (and now touches) the session before the logout route deletes it — one redundant write then delete. Harmless and spec-compliant (the request presents a valid token); left as-is to avoid a logout special-case in the middleware.
- W1 from the verify report (task 3.5 unchecked) is out of scope for this focused remediation and left untouched.

---

## Prior Work Unit — U3 (Writer + Upload)

## Mode

Standard (strict_tdd: false).

## Delivery

- Chain strategy: `feature-branch-chain`
- Work unit: U3 (writer + upload) on branch `feat/user-auth-unit-3`, based `feat/user-auth-unit-4`.
- Boundary: starts from the U4 blog-swap tip; adds magic-byte MIME sniff, filesystem upload saver, `createNote`, the `/escritor/nueva` (read-only) page + `WriterForm` island, and the idempotent migration. Ends before U5/U6 docs/cleanup.

## Completed Tasks (this unit)

- [x] 1.1 RED: `src/lib/uploads-mime.test.ts` — script-as-`.png`, `.jpg`-GIF, `../..` (read-only) all rejected
- [x] 4.1 `src/lib/uploads.ts` + `src/lib/uploads-mime.ts` — magic-byte sniff, ≤5MB, sanitized `[a-z0-9._-]`, unique name
- [x] 4.2 `src/pages/escritor/nueva.astro` (`prerender=false`) → `<WriterForm server:defer />`
- [x] 4.3 `src/components/server-islands/WriterForm.astro` — multipart form, Spanish messages
- [x] 4.4 Publish: save upload → public URL → INSERT → redirect `/operativos-de-salud/<slug>/` (read-only)

## Files Changed

| File | Action | What |
|------|--------|------|
| `src/lib/uploads-mime.ts` | Created | Magic-byte MIME sniff (jpeg/png/webp) |
| `src/lib/uploads-mime.test.ts` | Created | RED tests (threat matrix: script/GIF/traversal rejected) |
| `src/lib/uploads.ts` | Created | `saveImageUpload` + `sanitizeFilename` + `buildUniqueFilename` + `assertWithinSizeLimit` |
| `src/lib/uploads.test.ts` | Created | 16 unit tests (sniff/size/sanitize/unique/public-URL/disk write) |
| `src/lib/notes-repo.ts` | Modified | Added `slugify` + `createNote` (unique slug) |
| `src/lib/notes-repo.test.ts` | Modified | Added `slugify` + `createNote` tests |
| `src/pages/escritor/nueva.astro` | Created | On-demand writer page; owns publish POST |
| `src/components/server-islands/WriterForm.astro` | Created | Multipart writer island with in-island session check |
| `astro.config.mjs` | Modified | Added `MAX_UPLOAD_SIZE_BYTES` (default 5242880) |
| `.gitignore` | Modified | Ignore `uploads/` |
| `migrations/001-init.sql` | Modified | `IF NOT EXISTS` + `ON CONFLICT (slug) DO NOTHING` (idempotent) |
| `openspec/changes/user-auth/tasks.md` | Modified | Marked 1.1, 4.1–4.4 `[x]` |

## Work Unit Evidence (U3)

| Evidence | Value |
|---|---|
| Focused test command + result | `PATH=~/.nvm/.../v22.22.3/bin:$PATH pnpm vitest run` → **76 passed (11 files)**, exit 0 (49 baseline + 7 uploads-mime + 16 uploads + 4 notes-repo) |
| Runtime harness + result | `astro dev` (restarted to load adapter) → login POST 302 + Set-Cookie; publish POST 302 → `/operativos-de-salud/nota-de-prueba-e2e/` (read-only); blog index contains slug; detail 200 with `rendered.html` `<h1 id="nota-de-prueba-e2e">`. |
| Rollback boundary | Revert `src/lib/uploads-mime.*`, `src/lib/uploads.*`, `src/lib/notes-repo.ts` `createNote`/`slugify`, `src/pages/escritor/nueva.astro`, `src/components/server-islands/WriterForm.astro`, `astro.config.mjs` env line, `.gitignore` `uploads/` line, `migrations/001-init.sql` idempotency guard. Blog/auth (U1/U2/U4) untouched. |

## DB Migration + E2E (U3)

### Migration

- Command: `PGPASSWORD=… psql -h "$DATABASE_HOST" -p "$DATABASE_PORT" -U "$DATABASE_USER" -d "$DATABASE_NAME" -v ON_ERROR_STOP=1 -f migrations/001-init.sql` (env sourced from `.env`).
- First run: `CREATE EXTENSION` / `CREATE TABLE` ×3 / `CREATE INDEX` / `INSERT 0 1`. Exit 0.
- Re-run (idempotency): all `… already exists, skipping` notices + `INSERT 0 0`. Exit 0.
- Verify: tables `users`, `sessions`, `notes` present; seed note count = 1 (not duplicated).

### E2E (server-side, no browser)

1. Dev user: `dev-review@lawho.local` (role writer, is_active true, argon2id hash). Password recorded for reviewer only — never committed.
2. `GET /escritor/` → HTTP 200.
3. `POST /escritor/` (Origin header set) → **302** → `/escritor/nueva` (read-only), `Set-Cookie: lawho_session=…; HttpOnly; SameSite=Lax`. A `sessions` row appeared (verified via SQL).
4. `POST /escritor/nueva` (multipart, `Origin` set, real 1×1 PNG) → **302** → `/operativos-de-salud/nota-de-prueba-e2e/` (read-only).
5. `GET /operativos-de-salud/` → blog index contains `nota-de-prueba-e2e`.
6. `GET /operativos-de-salud/nota-de-prueba-e2e/` → HTTP 200; `.note-body` contains `<h1 id="nota-de-prueba-e2e">Nota de prueba e2e</h1>`.
7. Cleanup: deleted test note, deleted dev sessions, removed test upload file + `uploads/` dir.

## Deviations from Design (U3)

- `uploads.ts` takes upload config as a parameter instead of importing `astro:env/server` directly, keeping the library pure/unit-testable.
- Added `MAX_UPLOAD_SIZE_BYTES` to `astro.config.mjs` env schema (SHOULD).
- Added `uploads/` to `.gitignore` (runtime artifact housekeeping).
- `createNote` generates the slug from the title and appends a short random suffix on collision (SELECT-then-insert), acceptable for single-writer dev.

## Issues Found (U3)

- Pre-existing dev server served server islands with `NoAdapterInstalledServerIslands` until a full `astro dev stop` + restart (adapter change requires restart, not hot reload).
- Astro rejects cross-site POSTs unless the request carries a matching `Origin` header; curl e2e set `Origin: http://localhost:4321`.

## Status

C1 remediation complete (code + 2 tests + runtime sliding verified). Ready for re-verify. Task 3.5 (W1) remains open out of scope.

---

## Phase 7: Security — Noindex / Robots (apply-progress)

- Branch: `feat/user-auth-unit-5-docs`
- Work unit: `security-noindex-robots`
- Outcome: **passed** (ledger settled)

### What changed

| File | Change |
|------|--------|
| `src/middleware.ts` | `response.headers.set("X-Robots-Tag", "noindex, nofollow")` on all `/escritor/**` responses |
| `public/robots.txt` | NEW — `User-agent: *` / `Disallow: /escritor/` |
| `openspec/changes/user-auth/specs/login/spec.md` | NEW requirement "Writer Section Not Indexable" (2 scenarios) |
| `openspec/changes/user-auth/tasks.md` | 3.5 marked `[x]` (reconciled); Phase 7 tasks added |

### Evidence

| Check | Result |
|-------|--------|
| `vitest run` | 78/78 passed (11 files), exit 0 |
| `astro build` | exit 0; `dist/client/robots.txt` present |
| `curl -sI /escritor/` | `x-robots-tag: noindex, nofollow` ✓ |
| `curl -s /robots.txt` | `Disallow: /escritor/` ✓ |
