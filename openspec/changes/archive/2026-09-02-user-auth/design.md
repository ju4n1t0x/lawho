# Design: User Auth + DB-Backed Blog

## Technical Approach

Keep `output` static for the landing; add `@astrojs/node` (standalone). Blog + writer routes opt out with `export const prerender = false`. `src/live.config.ts` declares a live `notes` collection (`LiveLoader` over Postgres); Markdown body is rendered to HTML inside the loader. Auth is login-only via server islands (`server:defer`) that self-check a DB-backed session cookie. Uploads land on the filesystem, served by Nginx in prod.

## Architecture Decisions

| Decision | Choice | Alternatives (rejected) | Rationale |
|---|---|---|---|
| Rendering | Static + `@astrojs/node` + per-route `prerender=false` for `/operativos-de-salud/**` (read-only) + `/escritor/**` (read-only) | `output:'server'` | Landing stays zero-JS static; only 4 routes on-demand; islands need an adapter |
| Blog source | `LiveLoader` over Postgres | runtime Markdown (redeploy per publish); hybrid (more churn) | "publish without redeploy" requirement |
| Markdown render | Loader returns `rendered:{html}` via Astro processor | page `context.renderMarkdown` (absent — live-loader ctx is only `{filter,collection}`) | `render()`/`<Content/>` needs `entry.rendered.html` |
| DB access | `pg.Pool` singleton (`src/lib/db.ts`), DSN from `astro:env/server`, fail-loud | per-module pools; silent fallback | one pool; no credential leak |
| Passwords | argon2id (`argon2`), salt/hash, 8–128 chars | `crypto.scrypt` | spec mandates argon2id |
| Sessions | DB `sessions` + 256-bit token cookie (httpOnly, sameSite=lax, secure prod), 24h sliding | signed cookie | spec mandates DB sessions + logout invalidation |
| Island protection | Islands self-check cookie (isolated ctx); `middleware.ts` sets `Astro.locals.user` for PAGES only | middleware-only (bypassed by islands) | middleware guards `/escritor/nueva` (read-only); LoginForm/WriterForm re-check cookie |
| Auth routes | `/escritor/` (read-only), `/escritor/nueva` (read-only), `POST /escritor/logout`; dev = same-host path; prod = Nginx vhost `auth.lawho.org.ar` | `/etc/hosts` (read-only) `auth.lawho.local` | same-host prefix simpler in dev, mirrors prod |
| Uploads | `UPLOADS_DIR` fs + magic-byte sniff + sanitized names; DB stores `PUBLIC_UPLOADS_URL` | DB `bytea`; Astro-served | constitution rule 5; store public URL |
| Image field | `image` → **string URL**; edit NoteCard/NoteTemplate to `<img src={image}>` | keep `image()` object (build-time only) | components read `image.src/width/height`; CSS aspect-ratio already fixes layout |
| Migrations | `001-init.sql`: users/sessions/notes (markdown `body` + slug/title/subtitle/image_url/date/draft/featured/author/tag); seed `primer-operativo-2024`; slug = sanitized UNIQUE | per-note `.md` seed | single source of truth |

## Data Flow

    LoginForm(island) → checkPassword → sessions row → Set-Cookie
    WriterForm(island) → validate+sniff → UPLOADS_DIR → notes INSERT
    /operativos-de-salud/ → getLiveCollection('notes') → LiveLoader → pg.Pool → rendered.html

## File Changes

| File | Action |
|---|---|
| `astro.config.mjs` | Modify — adapter + SESSION_TTL_MS/UPLOADS_DIR/PUBLIC_UPLOADS_URL/SESSION_SECRET |
| `package.json`, `docs/constitution.md` | Modify — `@astrojs/node`, `pg`, `argon2` (+ markdown renderer) + amendment |
| `migrations/001-init.sql` | Create |
| `src/lib/{db,password,session,notes-repo,notes-mapper,uploads,uploads-mime}.ts` | Create |
| `src/live.config.ts` | Create |
| `src/components/server-islands/{LoginForm,WriterForm}.astro` | Create |
| `src/pages/escritor/{index,nueva}.astro`, `logout.ts`, `src/middleware.ts` | Create |
| `src/pages/operativos-de-salud/{index,[slug]}.astro` + `en/` | Modify — live APIs, `prerender=false`, 404 |
| `src/components/{NoteCard,NoteTemplate}.astro` | Modify — `image` string |
| `src/content.config.ts`, `src/content/notes/**` | Delete — retire glob |
| `deploy/nginx.conf.example`, `README.md`, `.env.example`, `openspec/config.yaml` | Create/Modify |

## Interfaces / Contracts

Entry shape (id = slug): `{ id, data:{title,subtitle,image:string,date:Date,draft,featured,author?,tag?}, rendered:{html} }`.

```ts
export const liveCollections = { notes: defineLiveCollection({
  loader: { name:'pg-notes',
    async loadCollection(){ return { entries:(await listPublishedNotes()).map(toLiveEntry) }; },
    async loadEntry({ filter }){ const r = await getNoteBySlug(filter.id); return r ? toLiveEntry(r) : undefined; } },
  schema: notesSchema /* image: z.string(); date: z.coerce.date() */
})};
// toLiveEntry: { id:row.slug, data:{...,image:row.image_url,date:new Date(row.published_at)}, rendered:{html:await renderMarkdown(row.body)} }
```

```ts
Astro.cookies.set('lawho_session', token, { httpOnly:true, sameSite:'lax',
  secure: import.meta.env.PROD, path:'/', maxAge: SESSION_TTL_MS/1000 });
```

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | password, session token/expiry, uploads-mime (sniff/size/sanitize), notes-mapper | vitest, pure funcs |
| Unit | notes-repo / session / users repos | vitest with mocked `pg.Pool` |
| Integration | `astro build` green with adapter; manual login→publish→note-appears flow | needs live DB + browser (honest gap) |

## Threat Matrix

| Boundary | Applicability | Design response / RED tests |
|---|---|---|
| Documentation-like / executable-classification | **Applicable** (uploads) | magic-byte sniff rejects non-jpeg/png/webp; filename → `[a-z0-9._-]`. RED: script-as-`.png` rejected; `.jpg`-that-is-GIF rejected; `../..` (read-only) stripped |
| Git repository selection | N/A — no git/CLI automation | — |
| Commit state | N/A | — |
| Push state | N/A | — |
| PR commands | N/A | — |

Extra surfaces → RED tests: cookie flags; island self-auth (no session → form hidden); tampered/expired token rejected; Nginx `/uploads/**` (read-only) bypass + `X-Forwarded-*` (config review); unauth `/_server-islands/*` (read-only).

## Migration / Rollout

Amendment (gate deps) → `001-init.sql` + seed → foundations → auth → writer+upload → blog swap (retire glob last so blog never renders empty; seed guarantees content).

## Open Questions

- **Q1 (blocks apply):** Markdown renderer source — `@astrojs/markdown-remark` is transitive-only; decide sanctioned import or add to amendment.
- Q2: Pin argon2 params.
- Q3: Prod TLS cert ownership (out of scope).
