# Tasks: User Auth + DB-Backed Blog

## Review Workload Forecast

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

~1400–1800 lines → 4 chained PRs, based `dev`.

| Unit | Goal (PR base) | Test | Harness | Rollback |
|------|----------------|------|---------|----------|
| U1 | Foundation (PR1 `dev`) | `pnpm test`+build | build | revert amendment+libs |
| U2 | Auth (PR2=U1) | `pnpm test` | login flow | revert auth routes |
| U3 | Writer+upload (PR3=U2) | `pnpm test` uploads | publish flow | revert writer wiring |
| U4 | Blog swap+docs (PR4=U3) | `pnpm test`+build | note-appears | revert glob loader |

## Phase 1: Foundation

- [ ] 1.1 RED: `src/lib/uploads-mime.test.ts` — script-as-`.png`, `.jpg`-GIF (`47 49 46 38`), `../..` all rejected (DEFERRED to U3 — production `uploads-mime.ts` lives in task 4.1)
- [x] 1.2 Commit `docs/constitution.md` rule-1 amendment (permit `@astrojs/node`, `pg`, `argon2`, renderer) FIRST, atomic
- [x] 1.3 `pnpm add` deps; adapter standalone; env schema in `astro.config.mjs`
- [x] 1.4 `migrations/001-init.sql`: users, sessions, notes (body/image_url/slug UNIQUE/date) + seed `primer-operativo-2024`
- [x] 1.5 `src/lib/db.ts` — lazy `pg.Pool` singleton, DSN from `astro:env/server`, SIGTERM `end()`, fail-loud
- [x] 1.6 `src/lib/password.ts` argon2id hash/verify, 8–128 policy; RED: same-pass different hash, wrong rejected
- [x] 1.7 `src/lib/session.ts` — 256-bit token, cookie flags, sliding TTL; RED: tampered/expired rejected
- [x] 1.8 `src/lib/notes-repo.ts`+`notes-mapper.ts` (image→string) with mocked-pool vitest

## Phase 2: Live Collection + Renderer

- [x] 2.1 Resolve Q1 renderer: import sanctioned renderer or extend amendment; fixture proves `rendered.html`
- [x] 2.2 `src/live.config.ts` — LiveLoader via notes-repo, `image:z.string()`, `date:z.coerce.date()`
- [x] 2.3 Smoke `getLiveCollection`; `loadEntry` returns `undefined` for missing slug

## Phase 3: Auth Flow

- [x] 3.1 `src/components/server-islands/LoginForm.astro` (`server:defer`): Spanish UI, POST→checkPassword→cookie→redirect `/escritor/nueva`; Spanish error msgs
- [x] 3.2 `src/pages/escritor/index.astro` (`prerender=false`); island self-checks cookie → writer UI when authed
- [x] 3.3 `src/middleware.ts` — session→`Astro.locals.user` for pages; redirect unauth `/escritor/nueva`
- [x] 3.4 `src/pages/escritor/logout.ts` POST — delete session row, clear cookie, redirect
- [ ] 3.5 RED/inspect: unauth `/_server-islands/*` blocked; login+logout e2e (pure session-repo RED tests done; e2e login/logout + island self-auth need live DB — documented gap)

## Phase 4: Writer + Upload

- [ ] 4.1 `src/lib/uploads.ts`+`uploads-mime.ts` — magic-byte sniff (jpeg/png/webp), ≤5MB, sanitized `[a-z0-9._-]`, unique name; RED: bad-MIME/size/traversal
- [ ] 4.2 `src/pages/escritor/nueva.astro` (`prerender=false`) → `<WriterForm server:defer />`; hidden without session
- [ ] 4.3 `src/components/server-islands/WriterForm.astro` — multipart fields; Spanish msgs (`La imagen no debe superar 5MB`, `Formato de imagen no permitido`)
- [ ] 4.4 Publish: save upload→`PUBLIC_UPLOADS_URL` URL→INSERT→redirect `/operativos-de-salud/<slug>/`

## Phase 5: Blog Live Swap

- [x] 5.1 Edit `NoteCard.astro`+`NoteTemplate.astro`: image→string `<img src={image}>`, drop `.src/.width/.height`
- [x] 5.2 Swap `operativos-de-salud/index.astro`+`en/` to `getLiveCollection`, `prerender=false`
- [x] 5.3 Swap `[slug].astro`+`en/` to `getLiveEntry`, render `rendered.html`, 404
- [x] 5.4 Delete `src/content.config.ts` notes glob + `src/content/notes/**`; seed body→DB row
- [x] 5.5 Grep-audit: no page calls `getCollection('notes')`; home unaffected

## Phase 6: Docs / Cleanup

- [ ] 6.1 `README.md`: Postgres, migration, env vars, nvm≥22.12, `/etc/hosts`, `/escritor/`
- [ ] 6.2 `.env.example` placeholders for new vars
- [ ] 6.3 `deploy/nginx.conf.example` — vhost, proxy_pass, `/uploads/**`, TLS+nosniff
- [ ] 6.4 `openspec/config.yaml` context: adapter, live collections, consumed DB
- [ ] 6.5 Final security re-check + tests + build green