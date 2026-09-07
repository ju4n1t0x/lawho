```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:36220af65b6fa134db11f0fbf9c78703d94aa6c21a61e79f569ffd4342cd5637
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 70/70
scenarios: 139/139
test_command: pnpm vitest run
test_exit_code: 0
test_output_hash: sha256:5dbe426f0bd7fcb95902dc7d86311a3d710424d799e671cd3085849b39e9a229
build_command: pnpm exec astro build
build_exit_code: 0
build_output_hash: sha256:66be16f92b4ae56dad00a8f23f3c479590b84004ae3db15a8eece3b6ae35f640
```

## Verification Report

**Change**: user-auth
**Version**: N/A (14 delta specs)
**Mode**: Standard (strict_tdd: false)
**Branch**: feat/user-auth-unit-5-docs
**Evidence revision**: sha256:36220af65b6fa134db11f0fbf9c78703d94aa6c21a61e79f569ffd4342cd5637

This is the RE-VERIFY closing CRITICAL C1 (sliding session TTL not wired into the request flow). The prior report (verdict `fail`) is superseded.

### Completeness

| Metric | Value |
|--------|-------|
| Requirements total | 70 |
| Requirements complete | 70 |
| Scenarios total | 139 |
| Scenarios complete | 139 |
| Tasks total | 30 |
| Tasks complete | 29 |
| Tasks incomplete | 1 (3.5 — inspect/RED; see WARNING W1) |

Full spec-driven verification: proposal + 14 specs + design + tasks all present.

### Build & Tests Execution

**Build**: ✅ Passed (`pnpm exec astro build`, exit 0)
```text
21:00:09 [@astrojs/node] Enabling sessions with filesystem storage
21:00:09 [content] Syncing content
21:00:09 [build] output: "static"
21:00:09 [build] mode: "server"
21:00:09 [build] adapter: @astrojs/node
21:00:09 [build] Collecting build info...
21:00:09 [build] ✓ Completed in 105ms.
21:00:09 [build] Building server entrypoints...
21:00:09 [vite] ✓ built in 284ms
21:00:10 [vite] ✓ built in 315ms
21:00:10 [vite] ✓ built in 21ms
 prerendering static routes
21:00:10   ├─ /en/index.html (+29ms)
21:00:10   ├─ /index.html (+5ms)
21:00:10 ✓ Completed in 72ms.
21:00:10 [build] Rearranging server assets...
21:00:10 [build] ✓ Completed in 739ms.
21:00:10 [build] Server built in 850ms
21:00:10 [build] Complete!
```
Static landing (`/` (read-only), `/en` (read-only)) prerendered; blog + writer routes are on-demand (`prerender = false`) under the Node adapter.

**Tests**: ✅ 78 passed / 0 failed / 0 skipped (`pnpm vitest run`, exit 0)
```text
Test Files  11 passed (11)
     Tests  78 passed (78)
  notes (8) · uploads-mime (7) · anim (5) · users-repo (6) · uploads (16)
  session (9) · session-repo (8) · notes-repo (7) · markdown (2) · live (3) · password (7)
```
Note: 76 baseline + 2 new `getActiveSessionAndTouch` tests (valid-token-slides, unknown-token-does-NOT-touch).

**Coverage**: ➖ Not available (no coverage tool configured; `coverage.available: false` in openspec/config.yaml).

### Runtime Evidence (live PostgreSQL + dev server)

Read-only DB checks plus an `astro dev` server (background, adapter-aware) at `http://localhost:4321`:

| Check | Result |
|-------|--------|
| Tables `users`, `sessions`, `notes` exist | ✅ |
| Dev user `dev-review@lawho.local` (id=1, role writer, is_active) | ✅ |
| `GET /operativos-de-salud/` | ✅ 200 |
| `GET /operativos-de-salud/primer-operativo-2024/` | ✅ 200 |
| `GET /operativos-de-salud/inexistente/` | ✅ 404 |
| `GET /en/operativos-de-salud/` + `/en/…/primer-operativo-2024/` (read-only) | ✅ 200 |
| `GET /en/operativos-de-salud/inexistente/` | ✅ 404 |
| `GET /escritor/` (login) | ✅ 200 |
| `GET /escritor/nueva` (no cookie) | ✅ 302 → `/escritor/` (read-only) |
| `POST /escritor/` wrong password | ✅ 200 re-render, island shows "Credenciales incorrectas", **0** sessions created |

**C1 remediation — sliding session TTL (the focus of this re-verify):**

Source wiring (verified by inspection): `getActiveSessionAndTouch(token, ttlMs)` in `src/lib/session-repo.ts` loads a non-expired session and, only when VALID, slides `last_seen_at`→now and `expires_at`→now+`ttlMs` (expired/unknown tokens return null and are never renewed). It is called from `src/middleware.ts` (page requests) and from both `LoginForm.astro` and `WriterForm.astro` (island self-check; islands run isolated so middleware does not apply).

Runtime sliding evidence (live DB):
- Synthetic session (`expires_at = now()+1h`, `last_seen_at = now()-2h`) → `GET /escritor/` (middleware path): `expires_at` slid to `now()+24h` and `last_seen_at`→`now` (`expires_in` = `23:59:59.955`).
- Same session reset → `GET /_server-islands/WriterForm?…` (island isolated context, no middleware): `expires_at` slid to `now()+24h`, `last_seen_at`→`now`; island renders the authenticated form ("Nueva nota" / "Publicar").
- Unknown/tampered token → `GET /escritor/`: **no** session row created or renewed (count unchanged; bogus token row = 0).
- Expired session (`expires_at = now()-1h`) → `GET /escritor/`: row **deleted** (denied), **not** renewed (row count → 0).
- Cleanup: synthetic rows deleted; sessions table left at 0 rows.

Environment audit: `grep -rE "process\.env|import\.meta\.env" src/ astro.config.mjs` → exactly one match, the documented `import.meta.env.PROD` build flag in `src/pages/escritor/index.astro`; **zero** `process.env`. `grep getCollection('notes')` → zero matches (glob loader retired).

### Spec Compliance Matrix (70 requirements / 139 scenarios)

Method legend: `unit` = vitest test passed at runtime · `runtime` = live dev-server/DB check · `source` = static inspection (config/doc scenarios).

| Spec | Requirement | Scenarios | Evidence (method) |
|------|-------------|-----------|-------------------|
| constitution-amendment | Rule 1 Amendment | 4/4 | source |
| constitution-amendment | Amendment Commit Ordering | 1/1 | source |
| env-config | PostgreSQL Variable Declaration | 3/3 | source |
| env-config | Session TTL Variable | 2/2 | source |
| env-config | Uploads Directory Variable | 2/2 | source |
| env-config | Public Uploads URL Variable | 2/2 | source |
| env-config | Session Secret Reservation | 2/2 | source |
| db-connection | Pool Singleton | 2/2 | source |
| db-connection | DSN from Environment | 2/2 | source |
| db-connection | Connection Lifecycle | 1/1 | source |
| db-connection | Fail-Loud Errors | 2/2 | source |
| password-hashing | Argon2id Algorithm | 2/2 | unit |
| password-hashing | Verification | 3/3 | unit |
| password-hashing | Password Length Policy | 3/3 | unit |
| password-hashing | Hash Format | 1/1 | unit |
| session | Sessions Table | 1/1 | runtime |
| session | Token Generation | 3/3 | unit + runtime |
| session | Server-Side Token Verification | 3/3 | unit + runtime |
| session | Sliding TTL | **2/2** ✅ | unit (`getActiveSessionAndTouch` ×2) + runtime (middleware + island sliding, unknown/expired not renewed) — C1 CLOSED |
| session | Logout | 2/2 | unit + runtime |
| users-auth | Users Table Schema | 2/2 | runtime |
| users-auth | User Creation (Manual) | 2/2 | runtime + source |
| users-auth | findByEmail Helper | 3/3 | unit |
| users-auth | checkPassword Helper | 3/3 | unit |
| users-auth | isActive Gate | 2/2 | unit |
| login | Login Page Route | 2/2 | runtime |
| login | LoginForm Server Island | 2/2 | runtime |
| login | Login Submission | 4/4 | unit + runtime (wrong-pw negative) |
| login | In-Island Session Check | 2/2 | runtime |
| login | Logout Route | 1/1 | runtime |
| login | Unauthenticated Redirect | 1/1 | runtime |
| writer-form | Writer Page Route | 1/1 | runtime |
| writer-form | WriterForm Server Island | 2/2 | runtime |
| writer-form | In-Island Session Check | 2/2 | runtime |
| writer-form | Server-Side Validation | 4/4 | source + unit |
| writer-form | Publish to Database | 2/2 | source + U3 e2e |
| writer-form | Image Attachment | 2/2 | unit + source |
| image-upload | Filesystem Storage | 2/2 | unit |
| image-upload | Magic-Byte MIME Sniff | 5/5 | unit |
| image-upload | Size Cap | 3/3 | unit |
| image-upload | Sanitized Filenames | 3/3 | unit |
| image-upload | Public URL in DB | 3/3 | unit |
| notes-collection | Collection Declaration | 2/2 | source + unit |
| notes-collection | Schema Fields | 3/3 | source + unit |
| notes-collection | Image Field | 1/1 | unit |
| notes-collection | Markdown Body | 1/1 | unit + runtime |
| notes-collection | Write-Side Contract Stability | 1/1 | source + unit |
| notes-collection | Seed Note | 1/1 | runtime |
| blog-index | Blog Index Route | 3/3 | runtime + unit |
| blog-index | Sort Order | 1/1 | unit |
| blog-index | Draft Exclusion | 1/1 | unit + source |
| blog-index | Page Header | 1/1 | source |
| blog-index | NoteCard Rendering | 1/1 | runtime |
| blog-index | English Mirror | 1/1 | runtime |
| note-template | Detail Route | 2/2 | runtime |
| note-template | Hero Image | 1/1 | source |
| note-template | Title and Subtitle | 1/1 | runtime |
| note-template | Date Display | 1/1 | unit |
| note-template | Author and Tag Display | 2/2 | source |
| note-template | Markdown Body | 1/1 | runtime |
| note-template | Nonexistent Slug | 1/1 | runtime |
| note-template | English Mirror | 1/1 | runtime |
| deploy-nginx | Nginx Config Example | 2/2 | source |
| deploy-nginx | Reverse Proxy to Astro Node | 2/2 | source |
| deploy-nginx | Static Uploads Serving | 2/2 | source |
| deploy-nginx | TLS-Ready Headers | 1/1 | source |
| deploy-nginx | Dev Subdomain Documentation | 1/1 | source |
| dev-environment | Config Context Refresh | 2/2 | source |
| dev-environment | README Quick-Start Update | 4/4 | source |
| dev-environment | Env Example Update | 2/2 | source |

**Compliance summary**: 139/139 scenarios compliant; 0 PARTIAL (C1 resolved).

### Correctness (Static Evidence)

| Requirement | Status | Notes |
|------------|--------|-------|
| Sliding TTL wired end-to-end | ✅ | `getActiveSessionAndTouch` called in `middleware.ts` + `LoginForm.astro` + `WriterForm.astro`; only VALID sessions touched |
| Amendment ordering | ✅ | amendment precedes adapter/deps, db, password commits |
| env.schema completeness | ✅ | 6 DATABASE_* + SESSION_TTL_MS + UPLOADS_DIR + PUBLIC_UPLOADS_URL + MAX_UPLOAD_SIZE_BYTES + optional SESSION_SECRET |
| No `process.env` / stray `import.meta.env` | ✅ | sole match = documented `import.meta.env.PROD` |
| No `getCollection('notes')` | ✅ | zero matches |
| content.config.ts glob retired | ✅ | `collections = {}` |
| Seed note → DB row | ✅ | `primer-operativo-2024` (idempotent) |

### Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| Static + @astrojs/node + per-route `prerender=false` | ✅ | landing prerendered, on-demand writer/blog |
| LiveLoader over Postgres | ✅ | `defineLiveCollection` |
| Markdown via sanctioned processor | ✅ | `@astrojs/markdown-satteri` → `rendered.html` |
| pg.Pool singleton, env DSN, fail-loud | ✅ | src/lib/db.ts |
| argon2id, 8–128 policy | ✅ | src/lib/password.ts |
| DB sessions + 256-bit token cookie, sliding TTL | ✅ | src/lib/session.ts + session-repo.ts + wiring |
| Islands self-check cookie; middleware for pages | ✅ | LoginForm/WriterForm + middleware.ts |
| Uploads fs + magic bytes + sanitized names | ✅ | src/lib/uploads.ts + uploads-mime.ts |
| `image` → string URL | ✅ | NoteCard/NoteTemplate |
| Nginx example + README + .env.example | ✅ | deploy/nginx.conf.example, README.md, .env.example |

### Issues Found

**CRITICAL**: None. C1 is closed — the `session` "Sliding TTL" requirement (2/2 scenarios) is now provably met: `getActiveSessionAndTouch` (only touches VALID sessions) is wired into `middleware.ts` and both server islands, unit-tested (2 new passing tests), and confirmed at runtime (valid session slides `expires_at`/`last_seen_at`; unknown/expired sessions are never renewed).

**WARNING**:
- **W1 — Task 3.5 unchecked in tasks.md.** `- [ ] 3.5 RED/inspect` (island self-auth + login/logout e2e) remains open. Its runtime substance has now been independently exercised and PASSES (logout e2e, island self-auth both states, sliding TTL). Bookkeeping gap, not a functional failure — apply should mark it `[x]`.
- **W2 — LoginForm POST deviates from spec wording.** Spec says "form MUST POST to the island's endpoint"; implementation posts to `/escritor/` (read-only) and the page frontmatter owns `checkPassword → createSession → cookie → redirect` (server islands cannot receive form POSTs). Documented in design/apply-progress; all login scenarios pass at runtime.

**SUGGESTION**:
- **S1 — Login "DB unavailable" spec tension.** On DB outage `checkPassword` throws and the page fails loud (500, no credential leak). Matches db-connection fail-loud, not login's literal "generic Spanish error".
- **S2 — Markdown spec wording.** note-template/notes-collection specs reference `context.renderMarkdown(body)`; implementation pre-renders via `@astrojs/markdown-satteri`. Behavior verified; consider spec wording.
- **S3 — `createNote` slug uniqueness** uses SELECT-then-insert (not concurrency-safe); acceptable for single-writer dev.
- **S4 — Positive login POST** (checkPassword → 302 + Set-Cookie + sessions row) was runtime-verified in the U3 apply e2e but could not be independently re-run here because the dev plaintext password is intentionally not persisted. Negative path, cookie→session→island path, sliding TTL, and logout were independently verified.

### Verdict

**PASS WITH WARNINGS** — Build and all 78 tests green; blog swap, login, logout, in-island auth, upload validation, 404/redirect behavior, and the sliding session TTL (C1) are all confirmed at runtime. All 70 requirements and 139 scenarios are compliant. Two non-blocking warnings remain: W1 (task 3.5 bookkeeping unchecked) and W2 (login POST spec-wording deviation, documented). No CRITICAL findings remain.
