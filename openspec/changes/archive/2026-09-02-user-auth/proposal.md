# Proposal: User Auth + DB-Backed Blog

## Intent

Let maintainer-created users log in and publish notes from a writer subdomain that appear in `/operativos-de-salud` (read-only) immediately, without redeploy.

## Scope

### In Scope

- Login-only auth (no signup); DB-backed sessions.
- `/escritor/**` (read-only) routes on dev subdomain `auth.lawho.local`.
- Note publish → Postgres → live blog (DB-backed live collection).
- Image upload (≤5 MB, jpeg/png/webp, magic-byte sniff).
- Constitution amendment, env additions, Node adapter.

### Out of Scope

- Registration/signup (manual DB creation).
- Public profiles, note edit/delete UI, pagination.
- Per-note `en` translations.
- Docker/VPS deploy config (except `nginx.conf.example`).
- CDN / `ASTRO_KEY` rolling-deploy concerns.

## Capabilities

### New Capabilities

- `db-connection`: `pg.Pool` singleton; connect smoke test.
- `password-hashing`: argon2id hash/verify (dep `argon2`).
- `session`: DB `sessions` table; 256-bit token cookie; 24h sliding TTL.
- `users-auth`: `users` table (email unique, password_hash, role, is_active) + repo.
- `login`: `/escritor/` (read-only) + `LoginForm` island; logout deletes session.
- `writer-form`: `WriterForm` island → DB row → live blog.
- `image-upload`: magic-byte sniff, size cap; DB stores `PUBLIC_UPLOADS_URL`.
- `deploy-nginx`: `nginx.conf.example` vhost + `/uploads/**` (read-only).
- `dev-environment`: config.yaml + README subdomain setup.

### Modified Capabilities

- `constitution-amendment`: permit `@astrojs/node`, `pg`, `argon2`.
- `env-config`: add `SESSION_TTL_MS`, `UPLOADS_DIR`, `PUBLIC_UPLOADS_URL`; reserve `SESSION_SECRET`; mark `DATABASE_*` consumed.
- `notes-collection`: glob → live (`src/live.config.ts`); seed → DB row.
- `blog-index`: `getLiveCollection('notes')`; `prerender = false`.
- `note-template`: `getLiveEntry('notes', slug)`; runtime 404.

## Approach

Keep `output` static for the landing; add `@astrojs/node` (standalone). Opt blog + writer routes out with `prerender = false`. Server islands (`server:defer`) check the session cookie in-island. `LiveLoader` reads Postgres; body renders via `context.renderMarkdown`. Chained PRs (foundations → auth → writer+upload → blog swap), based on `dev`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `astro.config.mjs` | Modified | adapter + env schema |
| `package.json`, `docs/constitution.md` | Modified | 3 deps + amendment |
| `migrations/001-init.sql` | New | users, sessions, notes + seed |
| `src/lib/*.ts` (db, password, session, notes-repo, notes-mapper, uploads, uploads-mime) | New | infra libs |
| `src/live.config.ts` | New | live `notes` collection |
| `src/components/server-islands/{LoginForm,WriterForm}.astro` | New | islands |
| `src/pages/escritor/**`, `src/middleware.ts` | New | writer routes, logout |
| `src/pages/operativos-de-salud/{index,[slug]}.astro` + `en/` | Modified | on-demand swap |
| `deploy/nginx.conf.example`, `README.md` | New/Modified | ops reference |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Static→on-demand blog needs Node process | High | Nginx reverse-proxy; landing static |
| Constitution gate blocks deps | Med | amendment commit first |
| Island isolated context bypasses middleware | Med | in-island cookie check |
| argon2 native build | Med | pin version |
| Upload validation gaps | Med | magic bytes + size + sanitized names |
| Cookie security | Low | httpOnly/secure/sameSite=lax |
| Stray `getCollection('notes')` calls | Med | grep audit in apply |
| Dev subdomain setup | Med | /etc/hosts + host handling doc |

## Rollback Plan

Revert the feature branch chain on `dev`; restore the `src/content.config.ts` glob loader and static blog pages; drop `users`/`sessions`/`notes` tables only if empty; remove `@astrojs/node`, `pg`, `argon2` and re-lock.

## Dependencies

- PostgreSQL instance; `.env` DB credentials.

## Success Criteria

- [ ] Login with manually-created user works; bad credentials rejected.
- [ ] Published note appears in `/operativos-de-salud/` (read-only) without redeploy.
- [ ] Unauthorized `/escritor/**` (read-only) redirects to login.
- [ ] Upload validated (≤5 MB, jpeg/png/webp) and served.
- [ ] `astro build` passes with adapter; vitest green for password/session/notes-repo/uploads.
