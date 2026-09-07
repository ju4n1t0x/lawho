# Apply Progress: User Auth + DB-Backed Blog (U3 — Writer + Upload)

## Mode

Standard (strict_tdd: false).

## Delivery

- Chain strategy: `feature-branch-chain`
- Work unit: U3 (writer + upload) on branch `feat/user-auth-unit-3`, based `feat/user-auth-unit-4`.
- Boundary: starts from the U4 blog-swap tip; adds magic-byte MIME sniff, filesystem upload saver, `createNote`, the `/escritor/nueva` page + `WriterForm` island, and the idempotent migration. Ends before U5/U6 docs/cleanup.

## Completed Tasks (this unit)

- [x] 1.1 RED: `src/lib/uploads-mime.test.ts` — script-as-`.png`, `.jpg`-GIF, `../..` all rejected
- [x] 4.1 `src/lib/uploads.ts` + `src/lib/uploads-mime.ts` — magic-byte sniff, ≤5MB, sanitized `[a-z0-9._-]`, unique name
- [x] 4.2 `src/pages/escritor/nueva.astro` (`prerender=false`) → `<WriterForm server:defer />`
- [x] 4.3 `src/components/server-islands/WriterForm.astro` — multipart form, Spanish messages
- [x] 4.4 Publish: save upload → public URL → INSERT → redirect `/operativos-de-salud/<slug>/`

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

## Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command + result | `PATH=~/.nvm/.../v22.22.3/bin:$PATH pnpm vitest run` → **76 passed (11 files)**, exit 0 (49 baseline + 7 uploads-mime + 16 uploads + 4 notes-repo) |
| Runtime harness + result | `astro dev` (restarted to load adapter) → login POST 302 + Set-Cookie; publish POST 302 → `/operativos-de-salud/nota-de-prueba-e2e/`; blog index contains slug; detail 200 with `rendered.html` `<h1 id="nota-de-prueba-e2e">`. See §E2E below. |
| Rollback boundary | Revert `src/lib/uploads-mime.*`, `src/lib/uploads.*`, `src/lib/notes-repo.ts` `createNote`/`slugify`, `src/pages/escritor/nueva.astro`, `src/components/server-islands/WriterForm.astro`, `astro.config.mjs` env line, `.gitignore` `uploads/` line, `migrations/001-init.sql` idempotency guard. Blog/auth (U1/U2/U4) untouched. |

## DB Migration + E2E

### Migration

- Command: `PGPASSWORD=… psql -h "$DATABASE_HOST" -p "$DATABASE_PORT" -U "$DATABASE_USER" -d "$DATABASE_NAME" -v ON_ERROR_STOP=1 -f migrations/001-init.sql` (env sourced from `.env`).
- First run: `CREATE EXTENSION` / `CREATE TABLE` ×3 / `CREATE INDEX` / `INSERT 0 1`. Exit 0.
- Re-run (idempotency): all `… already exists, skipping` notices + `INSERT 0 0`. Exit 0.
- Verify: tables `users`, `sessions`, `notes` present; seed note count = 1 (not duplicated).

### E2E (server-side, no browser)

1. Dev user: `dev-review@lawho.local` (role writer, is_active true, argon2id hash). Password recorded below for reviewer only — never committed.
2. `GET /escritor/` → HTTP 200.
3. `POST /escritor/` (Origin header set) → **302** → `/escritor/nueva`, `Set-Cookie: lawho_session=…; HttpOnly; SameSite=Lax`. A `sessions` row appeared (verified via SQL).
4. `POST /escritor/nueva` (multipart, `Origin` set, real 1×1 PNG) → **302** → `/operativos-de-salud/nota-de-prueba-e2e/`.
5. `GET /operativos-de-salud/` → blog index contains `nota-de-prueba-e2e`.
6. `GET /operativos-de-salud/nota-de-prueba-e2e/` → HTTP 200; `.note-body` contains `<h1 id="nota-de-prueba-e2e">Nota de prueba e2e</h1>` (Markdown rendered via live loader).
7. Cleanup: deleted test note (DELETE 1), deleted dev sessions (DELETE 1), removed test upload file + `uploads/` dir.

### What was left in the DB

- `users`: 1 row — `dev-review@lawho.local` (kept for reviewer login; dev-only email).
- `notes`: 1 row — seed `primer-operativo-2024` (test note removed).
- `sessions`: 0 rows (test session removed).

### Dev test password

The dev-only user `dev-review@lawho.local` has an argon2id-hashed password generated during this apply. The plaintext is delivered to the orchestrator in the return envelope only and is NOT committed (per maintainer instruction).

## Deviations from Design

- `uploads.ts` takes upload config (`uploadsDir`, `publicUploadsUrl`, `maxBytes`) as a parameter instead of importing `astro:env/server` directly. Rationale: keeps the library pure and unit-testable without mocking Astro's virtual env module; the env values are read in the page (`nueva.astro`) from `astro:env/server` and injected. Matches the "layer separation" rule (rule 3).
- Added `MAX_UPLOAD_SIZE_BYTES` to `astro.config.mjs` env schema to honor the "size cap configurable via env (default 5MB)" spec (SHOULD).
- Added `uploads/` to `.gitignore` (runtime artifact housekeeping).
- `createNote` generates the slug from the title and appends a short random suffix on collision (SELECT-then-insert). Not concurrency-safe for simultaneous identical titles, acceptable for the single-writer dev scenario.

## Issues Found

- The pre-existing dev server (started ~16:10) served server islands with `NoAdapterInstalledServerIslands` (500) because it predated the adapter config; a full `astro dev stop` + restart fixed it. Recorded so future sessions restart rather than rely on hot reload for adapter changes.
- Astro rejects cross-site POSTs ("Cross-site POST form submissions are forbidden") unless the request carries a matching `Origin` header; curl e2e had to set `Origin: http://localhost:4321`.

## Remaining Tasks

- [ ] 3.5 RED/inspect: unauth `/_server-islands/*` blocked; login+logout e2e (login e2e exercised here; island self-auth + logout e2e still pending live verification — documented gap)
- [ ] 6.1–6.5 (U5/U6 docs/cleanup): README, `.env.example`, `deploy/nginx.conf.example`, config context, final security re-check

## Status

5/5 U3 tasks complete. Ready for verify (U3); U5/U6 remain for the next unit.
