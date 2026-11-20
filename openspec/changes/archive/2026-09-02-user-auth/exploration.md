# Exploration: user-auth

Authentication for registered users (login-only, no signup) plus a writer section where authenticated users publish notes that appear in the existing blog at `/operativos-de-salud` (read-only). The read-side (notes collection + blog index + note detail) already shipped in `2026-09-02-blog-operativos` as a build-time `glob` loader over `src/content/notes/**/*.md`. The write-side therefore must bridge **runtime-authored content → blog surface**.

---

## Current State

Verified on `dev` (branch containing the full static landing + blog, pushed to origin).

### Stack baseline (verified in repo)

- `astro@7.2.10` (in `node_modules/astro/package.json`); `output` is **not** set in `astro.config.mjs` → defaults to `'static'` (the whole site currently builds to plain HTML).
- `i18n`: `defaultLocale: 'es'`, `locales: ['es', 'en']`, `prefixDefaultLocale: false` (so `/operativos-de-salud/` (read-only) is canonical, `/en/operativos-de-salud/` (read-only) is the en mirror).
- Tailwind v4 (`@tailwindcss/vite`); vitest 4.1.11 installed; only deps are `astro`, `tailwindcss`, `@tailwindcss/vite`, `vitest`.
- `docs/constitution.md` rule 1: "Astro 7.2 + stdlib only" — **no additional libraries without explicit amendment** (precedent: `constitution-amendment` spec added Tailwind as a permitted exception).
- `docs/constitution.md` rule 5: PostgreSQL via env vars (env vars already declared in `astro.config.mjs` `env.schema` — `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`, `DATABASE_SSL` — but no code reads them; **declared-but-unused**).
- `AGENTS.md` rule 5 (in AGENTS.md): users log in via a **subdomain** — clarify how that maps locally vs in production.

### Blog read-side (already shipped)

- `src/content.config.ts`: `notes` collection with `glob({ pattern: "**/*.md", base: "./src/content/notes" })` and zod schema `title, subtitle, image (image()), date, draft (default false), featured (default true), author? (optional), tag? (optional)`. **Build-time only** — runs at `astro build` to produce static HTML.
- `src/pages/operativos-de-salud/index.astro`: `await getCollection("notes")` → filter/sort via `getPublishedNotes()` (`src/lib/notes.ts`). Static.
- `src/pages/operativos-de-salud/[slug].astro`: `getStaticPaths()` over the collection, renders `<NoteTemplate>` with the `Content` component from `await render(entry)`. Static.
- `src/pages/en/operativos-de-salud/{index,[slug]}.astro`: en mirrors (same content, fallback per `i18n-setup`).
- `src/content/notes/primer-operativo-2024.md`: one seed note.
- Specs `notes-collection`, `blog-index`, `note-template`, `notes-helpers`, `note-card` (all archived 2026-09-02).

### What the change adds (per the maintainer's constraints)

1. **Login only, no signup.** Maintainer inserts users directly in Postgres.
2. **Server islands** for auth + writer (constitution rule 3: server islands = autenticación y escritura).
3. Writer uploads notes that **appear in the existing blog** at `/operativos-de-salud` (read-only).
4. Notes have attached images (constitution rule 5: filesystem + Nginx).
5. PostgreSQL is the DB (rule 5).
6. Auth lives on a subdomain.

---

## Investigation findings — the hard facts

### 1. Astro 7.2 server islands REQUIRE an adapter

Verified against `node_modules/astro/dist/core/server-islands/endpoint.js` + the public docs (`/en/guides/server-islands/` (read-only)):

> "With an adapter installed to perform the delayed rendering, add the `server:defer` directive to any component on your page to turn it into its own island."

The `/en/guides/on-demand-rendering/` (read-only) doc explicitly lists the four official adapters and notes server islands need one even on a static site. For this stack (Docker on a VPS, Node runtime) the right pick is **`@astrojs/node`** — it produces a standalone Node server that Nginx can reverse-proxy to, and it coexists with `output: 'static'` (default). Pages opt out of prerendering per-route with `export const prerender = false`.

Implication: `package.json` needs `@astrojs/node` (dependency addition → **constitution amendment required** for rule 1, mirroring the Tailwind precedent).

### 2. Server islands in practice in Astro 7.2

Verified in `node_modules/astro/dist/runtime/server/render/server-islands.js`:

- Directive: `<MyComponent server:defer />` on an `.astro` component.
- Build emits a tiny script in place of the component; at runtime the script fetches `/_server-islands/<id>` (read-only) (GET or POST, depending on prop size; props are AES-GCM encrypted).
- The island runs in an **isolated context** — `Astro.url` and `Astro.request.url` reflect `/_server-islands/<id>` (read-only), not the host page. To read the host URL, read the `Referer` header. So **page-level middleware cannot protect a server island** — protection must happen **inside** the island (check cookie in the island component itself) OR via a separate on-demand page (not an island).
- **Cookies work** in a server island (`Astro.cookies`).
- **The island CAN write the cookie** for the login flow: the login form posts to a server island, the island calls `Astro.cookies.set(...)`, then returns a redirect (or HTML that navigates).
- Encryption key: Astro generates a random key per build. For rolling deploys / multi-region set `ASTRO_KEY` (`astro create-key` CLI); not required for single-VPS Docker deploys.
- Recommended pattern in this app: keep `output` default (static) → `/` (read-only) and `/operativos-de-salud/` (read-only) keep building to static HTML. The auth subdomain routes opt out with `export const prerender = false`. Server islands live inside those routes (e.g. `<LoginForm server:defer />` inside the static page rendered on the subdomain).

### 3. SSR runtime options

Two patterns, both valid:

- **Static + on-demand islands**: keep `output` unset (defaults to `static`); add `@astrojs/node` adapter; individual routes opt out with `export const prerender = false`. Server islands work inside any page. **This preserves the shipped landing + blog as static.** Recommended.
- **`output: 'server'`**: every page SSR'd by default; opt in to static for the few pages that should stay prerendered (`/` (read-only), the seed blog index, the en mirrors). More revalidation churn on build.

The first pattern is strictly cheaper for what we need (login + writer; the rest stays static).

### 4. PostgreSQL access — no zero-dep path

Node has no built-in Postgres client. `pg` (node-postgres) is the standard pick; alternatives (`postgres.js`, `postgres-pure`) all add dependencies. There's no `require('node:postgres')`. **The constitution must be amended** to allow `pg` (and `@astrojs/node`).

### 5. Password hashing — zero-dep path exists

Node's built-in `crypto.scrypt` is the right choice. It produces a salted hash with a memory-hard KDF, no extra dependency. Recommended storage format: `scrypt$<N>$<r>$<p>$<saltHex>$<hashHex>` (single column, no schema ceremony). Compare with `crypto.timingSafeEqual` on a fresh `scrypt` of the input password.

### 6. Sessions — signed cookie vs DB-backed session

For login-only with a single DB write per login and no logout-everywhere requirement, a **signed cookie carrying the user id + an expiry timestamp** is the simplest model. Sign with HMAC-SHA256 using a `SESSION_SECRET` env var (declare in `env.schema`, secret). Cookie attrs: `httpOnly`, `sameSite: 'lax'`, `secure` in prod. No session table needed.

The alternative is a `sessions` table (token → user_id, expiry) so logout can invalidate. Adds one DB table and one query per request. Worth it if logout / "force logout all devices" matters; not strictly required.

### 7. Blog read-source fork — the key architectural decision

User-written notes arrive at runtime. Three options:

| | A. Runtime Markdown in `src/content/notes/` | B. DB as source, retire content collections for notes | C. Hybrid (collections for seed + DB merged at request time) |
|---|---|---|---|
| **How it works** | Writer writes a `.md` file into `src/content/notes/`. Next `astro build` re-reads via glob loader → static page appears. **No realtime publishing — requires redeploy.** | Store title/subtitle/body/image_path/author/date/draft in Postgres. Pages render via `getLiveCollection('notes')` with a `LiveLoader` calling `pg`. Live content collections are an Astro 7.2 feature (`src/live.config.ts`, `defineLiveCollection`). | Keep the seed note in the collection; `getLiveCollection` returns DB rows at request time; page merges both arrays, sorts, filters drafts. |
| **Pros** | Zero architecture change to the shipped read-side. Markdown body → `render()` keeps working. | Real realtime publishing. Single source of truth. `LiveLoader` is purpose-built for this. Existing specs (`notes-collection`, `blog-index`, `note-template`) change semantically — collections no longer hold user notes. | Seed content stays curated; user content flows freely. Lower spec churn than B. |
| **Cons** | **Requires a redeploy per publish** — defeats the maintainer's goal of "registered users write notes that appear in the blog". On a long-lived container, the writer would need to write into the live app's filesystem, then signal a reload (no `astro dev` reload trigger exists in production). | All three read-side specs become MODIFIED (collection declaration, blog index source, note detail source). Body rendering still goes through `renderMarkdown()` from the loader context (`context.renderMarkdown(body)`) — same shape, different source. | Specs still need MODIFIED blocks because the index no longer reads `getCollection('notes')` exclusively. |
| **Effort** | Medium but **doesn't meet the maintainer's "notes appear in the blog" requirement** without a redeploy hook. | Medium-High — build a `LiveLoader` + schema; modify the three specs. | Medium-High — same as B plus a merge function. |

**Recommended: Option B (DB-backed live collection for user notes).**

Rationale:

- It actually meets the requirement (notes appear in the blog without redeploy).
- Astro 7.2 ships a dedicated API (`LiveLoader` + `src/live.config.ts` + `defineLiveCollection` + `getLiveCollection` / `getLiveEntry`) for exactly this case — verified in `node_modules/astro/dist/content/config.js` and `virtual-modules/live-config.js`.
- The existing specs **will** need MODIFIED blocks — this is unavoidable. Acknowledged.
- Body rendering via `context.renderMarkdown(body, { fileURL })` produces the same `Content` component, so `NoteTemplate.astro` and `NoteCard.astro` can stay byte-identical. Only the index/detail page top changes (from `getCollection` to `getLiveCollection`).
- The seed note (`primer-operativo-2024.md`) either migrates to the DB as a row (seed in a SQL migration), OR is left as a fallback (`notes` collection still exists for static seed content and the index prefers live entries). Migration to a DB row keeps the model simple.

### 8. Content layer split

Per `node_modules/astro/dist/content/config.js`:

- Build-time collections live in `src/content.config.ts` (`defineCollection`).
- Live collections live in `src/live.config.ts` (`defineLiveCollection`).
- A `LiveLoader` has `loadCollection({ filter })` and `loadEntry({ filter })` methods returning `{ entries }` / `{ id, data }`. Markdown body can be pre-rendered and cached via `rendered.html`, OR the page can render it on demand via `context.renderMarkdown()`. For user notes we render on demand (simpler).

### 9. Image upload

- Astro SSR receives multipart form data via `request.formData()` (web `Request` API).
- Files are `File` objects (`await formData.get('image') as File`); stream to `fs/promises` write to a configured uploads directory (e.g. `/var/uploads/notes/<id>/` (read-only)).
- Image `src` stored in the DB as the **public URL** the browser will hit — e.g. `https://cdn.example.org/uploads/notes/<id>/` or `/uploads/notes/<id>/` (read-only) for local dev.
- Local dev: serve `/uploads/**` (read-only) from `public/uploads/` (Vite copies `public/` to `dist/` as-is) or via a tiny middleware that streams the file.
- Production: Nginx serves the uploads dir directly from disk (constitution rule 5 — "filesystem + Nginx"). Static assets never hit the Astro process.
- Validation: MIME sniff (`file-type`-style via first bytes — but `file-type` is yet another dep). **Zero-dep alternative:** read the first 12 bytes and match against magic numbers for `image/jpeg`, `image/png`, `image/webp`. Plus size cap (configurable, default 5 MB).
- The DB stores the public URL, NOT the local path, so swapping the public origin (Nginx vs dev) doesn't break existing rows.

### 10. Subdomain in dev vs prod

- **Production** (per AGENTS.md): Nginx terminates TLS for `auth.lawho.org.ar`, reverse-proxies to the Astro Node server for `/escritor` (read-only) routes (and only those routes — or all routes on the subdomain, with `prerender = false` everywhere on the subdomain).
- **Local dev**: route-based simulation. The maintainer can visit `/escritor/login` (read-only) and `/escritor/` (read-only) on `localhost:4321` (the same Astro Node server). Document the production subdomain contract; no Nginx required locally. Optionally add a Vite `server.headers` host rewrite, but routing by path is simpler and matches the eventual deploy.
- If the subdomain IS literally a separate host (e.g. `auth.lawho.local`), Astro needs to know about the host. Simpler model: same host, route prefix `/escritor` (read-only).

### 11. ASTRO_KEY vs no-ASTRO_KEY

For a single-VPS Docker deploy, no `ASTRO_KEY` is required — Astro generates a random key per build. Set `ASTRO_KEY` only if we move to a CDN/edge cache that serves old builds.

---

## Affected Areas

### Files to CREATE

| Path | Why |
|---|---|
| `astro.config.mjs` adapter line | Add `adapter: node({ mode: 'standalone' })` from `@astrojs/node`. |
| `src/lib/db.ts` | `pg.Pool` singleton, lazy init, env-driven connection string from `astro:env/server`. |
| `src/lib/password.ts` | `hashPassword(plain)` + `verifyPassword(plain, stored)` using `node:crypto.scrypt` + `crypto.timingSafeEqual`. Storage format `scrypt$N$r$p$salt$hash`. |
| `src/lib/session.ts` | `signSession(userId, ttlMs)`, `verifySession(token)`, `getSessionFromCookies(cookies)`. HMAC-SHA256 over `userId.expiresAt`. `SESSION_SECRET` env. |
| `src/lib/notes-repo.ts` | DB queries: `listPublishedNotes({ limit, featuredOnly })`, `getNoteBySlug(slug)`, `createNote(input)`, `updateNote(slug, input)`. |
| `src/lib/notes-mapper.ts` | Translate DB row ↔ `note-shaped` object (matches existing `CollectionEntry<'notes'>` shape so `NoteCard`/`NoteTemplate` work unchanged). |
| `src/lib/uploads.ts` | `saveUpload(file, slug)` writing to `process.env.UPLOADS_DIR` (or default `./uploads`); `publicUrl(relativePath)` builds `/uploads/...` (read-only) URL. |
| `src/lib/uploads-mime.ts` | Zero-dep magic-byte sniffer for jpeg/png/webp. |
| `src/live.config.ts` | `defineLiveCollection` for `notes`, `LiveLoader` that hits `notes-repo`. |
| `src/components/server-islands/LoginForm.astro` | Login server island. POST username + password; verify against DB; set session cookie; redirect. |
| `src/components/server-islands/WriterForm.astro` | Note writer server island. Form fields: title, subtitle, body (textarea), tag?, image (file). `enctype="multipart/form-data"`. |
| `src/pages/escritor/index.astro` | Landing for the auth subdomain (`prerender = false`). Mounts `<LoginForm server:defer />`. After auth, swaps to `<WriterForm server:defer />`. |
| `src/pages/escritor/logout.ts` (or `.astro`) | `POST /escritor/logout` clears the cookie and redirects. |
| `src/pages/operativos-de-salud/index.astro` | **MODIFIED** — read from `getLiveCollection('notes')` instead of `getCollection('notes')`. Page MUST be marked `export const prerender = false` if any DB-driven logic runs in it. (Tradeoff below.) |
| `src/pages/operativos-de-salud/[slug].astro` | **MODIFIED** — `getStaticPaths()` becomes a runtime lookup OR we move to on-demand rendering with `prerender = false` and a `404` branch. Tradeoff below. |
| `src/pages/en/operativos-de-salud/{index,[slug]}.astro` | **MODIFIED** mirrors. |
| `src/content/notes/primer-operativo-2024.md` | **Possibly removed** if the seed note migrates to a DB seed row. |
| `migrations/001-init.sql` (or under `db/`) | `users(id, username, password_hash, created_at, role)`, `notes(id, slug, title, subtitle, body, image_url, author_id, tag, draft, featured, published_at, created_at, updated_at)`. UNIQUE(slug). |
| `src/middleware.ts` | Optional — session lookup, attach `Astro.locals.user` if cookie valid. Useful for the en-dynamic routes. Server islands can call the same helper directly. |

### Files to MODIFY

| Path | Why |
|---|---|
| `astro.config.mjs` | Add adapter; declare `SESSION_SECRET`, `UPLOADS_DIR`, `SESSION_TTL_MS` env vars. |
| `package.json` | Add `@astrojs/node`, `pg`. (Requires constitution amendment.) |
| `src/pages/operativos-de-salud/index.astro` | Switch to `getLiveCollection('notes')`; if static preferred, the page MUST stay prerendered and DB rows must be loaded at build time (NOT viable — defeats purpose). |
| `src/pages/operativos-de-salud/[slug].astro` | Same — see tradeoffs. |
| `src/pages/en/operativos-de-salud/index.astro`, `[slug].astro` | Mirrors of the above. |
| `openspec/specs/notes-collection/spec.md` | **MODIFIED** — collection declaration: a `Live` collection in `src/live.config.ts` instead of `glob`. Same zod schema (so `NoteCard`/`NoteTemplate` types stay stable). Seed note behavior moves to a DB seed row. |
| `openspec/specs/blog-index/spec.md` | **MODIFIED** — source is `getLiveCollection('notes')`. Page is now SSR (route opt-out via `prerender = false`). |
| `openspec/specs/note-template/spec.md` | **MODIFIED** — same swap, plus 404 handling at request time. |
| `docs/constitution.md` | Rule 1 amendment: allow `@astrojs/node` and `pg` as exceptions. Mirrors `constitution-amendment` precedent. |
| `openspec/specs/env-config/spec.md` | **MODIFIED** (additive only) — declare `SESSION_SECRET`, `UPLOADS_DIR`, `SESSION_TTL_MS`. |
| `openspec/config.yaml` | Add `output: 'static'` explicitly (clarity), `adapter: node`, update `context` block. |

### Files NOT touched

- `src/components/{NoteCard,NoteTemplate}.astro` — shape stays the same; only the input type widens slightly (a live entry has the same data fields).
- `src/lib/notes.ts` (`getPublishedNotes`, `formatNoteDate`) — pure helpers; still work on live entries (the data shape is identical).
- `src/layouts/BaseLayout.astro` — unchanged.
- `src/styles/global.css` — unchanged.

---

## Approaches (compared)

### A1. Static site + adapter + per-route SSR

- `output` stays default (static). Adapter `@astrojs/node` installed.
- `/` (read-only) and `/operativos-de-salud/` (read-only) keep building statically. **Problem:** if the index/detail stay static, user-published notes only appear after a rebuild. Does NOT meet the requirement.
- **Verdict:** REJECT — fails the maintainer's core ask.

### A2. Switch blog index/detail to on-demand rendering + adapter

- All blog routes `export const prerender = false`. Adapter installed.
- Index renders via `getLiveCollection('notes')` at request time.
- Detail renders via `getLiveEntry('notes', slug)`.
- Static landing stays static. No deploy required per publish.
- **Verdict:** RECOMMENDED. Cleanest path; live collections are the tool Astro 7.2 ships for this.

### A3. `output: 'server'` everywhere

- Everything SSR'd by default. Opt static pages back in with `prerender = true`.
- More rebuild churn; minimal benefit over A2 since the landing already renders fine statically.
- **Verdict:** Acceptable but unnecessary.

### B1. Auth: signed-cookie session with `crypto.scrypt` + HMAC-SHA256

- No session table. Cookie carries `userId.expiresAt.signature`. Stateless.
- Zero added dep for crypto. `SESSION_SECRET` from env.
- Logout: client clears cookie (or POST to `/escritor/logout` (read-only) that sets a past `Max-Age`). No way to force-logout-all devices — acceptable for a small NGO.
- **Verdict:** RECOMMENDED for the first cut.

### B2. Auth: DB session table

- `sessions(token, user_id, expires_at)` table. Cookie carries an opaque token.
- Logout deletes the row → real invalidation.
- Costs one DB write per login + one SELECT per request.
- **Verdict:** Defer. Worth it only if force-logout matters.

### C1. Blog source: DB-backed live collection (Option B from Section 7 above)

- `src/live.config.ts` declares `notes` as live. Loader queries Postgres.
- Body rendered on demand via `context.renderMarkdown(body)`.
- Specs become MODIFIED.
- **Verdict:** RECOMMENDED.

### C2. Blog source: runtime Markdown files in `src/content/notes/`

- Writer persists `.md` files; trigger a reload (no production-safe mechanism in Astro).
- **Verdict:** REJECT — no live publishing.

### C3. Blog source: hybrid (collection + DB merged)

- More spec churn than C1.
- **Verdict:** Acceptable if a curated static seed set is desired alongside user notes; for one seed note, C1 is simpler.

### D1. Image storage: filesystem under `UPLOADS_DIR`, served by Nginx in prod

- DB stores the public URL.
- MIME sniff with magic bytes; size cap.
- **Verdict:** RECOMMENDED. Matches constitution rule 5.

### D2. Image storage: Postgres `bytea`

- Couples images to the DB; no Nginx benefit.
- **Verdict:** REJECT — violates rule 5.

### D3. Image storage: filesystem but no Nginx (Astro serves)

- Works in dev; in prod we'd need an Astro middleware streaming files, plus route caching headers.
- **Verdict:** REJECT — Nginx is the rule.

---

## Recommendation

1. **Architecture**:
   - Switch `output` config: keep default (static) so `/` (read-only) keeps shipping as static HTML. Install `@astrojs/node` adapter.
   - Make `/operativos-de-salud/{index,[slug]}` (read-only) and the `/en/...` (read-only) mirrors on-demand (`prerender = false`).
   - Move the `notes` collection from `src/content.config.ts` (build-time `glob`) to `src/live.config.ts` (live collection with `LiveLoader` backed by Postgres).
   - Migrate the seed note from Markdown to a DB seed row in `migrations/001-init.sql`.
   - Add `/escritor/` (read-only) routes (on-demand). Mount `<LoginForm server:defer />` and `<WriterForm server:defer />` inside. The login form is also a server island — that satisfies constitution rule 3.
   - All other routes (`/` (read-only), `/historia` (read-only), etc.) stay static.
2. **Auth**: signed-cookie session (B1). No session table. `SESSION_SECRET` in env. `crypto.scrypt` for password hashing. `crypto.createHmac('sha256', secret)` for cookie signing.
3. **Postgres access**: `pg.Pool` singleton in `src/lib/db.ts`. Connection string built from `astro:env/server` imports.
4. **Images**: filesystem under `UPLOADS_DIR` (env var, default `./uploads`); DB stores the public URL `/uploads/<slug>/` (read-only); Nginx serves `/uploads/**` (read-only) in prod (a one-line server block); dev serves from `public/uploads/` (Vite) by symlinking or by mounting the dir into `public/uploads/`.
5. **Subdomain**: route-based in dev (`/escritor/**` (read-only)); Nginx terminates `auth.lawho.org.ar` (or whatever the production host is) and reverse-proxies to the Astro Node server. Document the Nginx vhost in a `deploy/nginx.conf` snippet (not enforced by spec — operational doc).
6. **Constitution amendment**: amend rule 1 to permit `@astrojs/node` and `pg` (mirroring the Tailwind precedent in `constitution-amendment`). This MUST be a separate commit before any code that touches `package.json`.
7. **400-line PR budget**: this change is large (≈10-15 new files + 5 modified files + 5 MODIFIED spec blocks + 1 new SQL migration). Forecast: **High risk**. Recommend **chained PRs** in this order:
   - **PR 1 — Foundations**: constitution amendment; `astro add @astrojs/node`; declare new env vars; create `migrations/001-init.sql`; add `src/lib/{db,password,session,uploads,uploads-mime}.ts`. No behavior change yet.
   - **PR 2 — Auth flow**: `/escritor/` (read-only) pages; `LoginForm` server island; logout; middleware session lookup; writer route shell.
   - **PR 3 — Writer + image upload**: `WriterForm` server island; `/escritor/nueva` (read-only) page; uploads dir wiring.
   - **PR 4 — Blog swap**: `src/live.config.ts`; live loader hitting DB; switch `operativos-de-salud/{index,[slug]}` to `getLiveCollection`/`getLiveEntry`; seed row in DB; remove or keep seed `.md`.

### Capability slice list (for `sdd-propose`)

Following the project's one-spec-per-concern pattern. Each gets its own delta under `openspec/changes/user-auth/specs/`.

| # | Domain | Subject | Type |
|---|--------|---------|------|
| 1 | `constitution-amendment` | Extend rule 1: permit `@astrojs/node` and `pg` as exceptions (same precedent as Tailwind). | MODIFIED |
| 2 | `env-config` | Add `SESSION_SECRET` (string, server, secret), `SESSION_TTL_MS` (number, server, secret, default `86400000`), `UPLOADS_DIR` (string, server, secret, default `./uploads`), `PUBLIC_UPLOADS_URL` (string, server, public, default `/uploads` (read-only)). | MODIFIED |
| 3 | `db-connection` | New: `src/lib/db.ts` exposes a `pg.Pool` singleton; connection string built from `astro:env/server` DATABASE_* vars; `connect` smoke test. Pool closes on process exit. | NEW |
| 4 | `password-hashing` | New: `src/lib/password.ts` — `hashPassword` + `verifyPassword` using `crypto.scrypt` (N=2^15, r=8, p=1). Storage format `scrypt$N$r$p$saltHex$hashHex`. timing-safe comparison. | NEW |
| 5 | `session` | New: `src/lib/session.ts` + `src/middleware.ts` — sign/verify HMAC-SHA256 session cookies; attach `Astro.locals.user`; `getSessionFromCookies` helper. | NEW |
| 6 | `users-auth` | New: `users` table (id uuid, username citext unique, password_hash text, created_at timestamptz, role text default `writer`, is_active bool default true). Repository helpers `findUserByUsername`, `verifyCredentials`. Vitest for repository with a mocked pool. | NEW |
| 7 | `login` | New: `/escritor/` (read-only) page (prerender false) + `<LoginForm server:defer />` server island. POST → verify → set cookie → redirect to `/escritor/nueva` (read-only). `/escritor/logout` (read-only) clears cookie. i18n: es UI only (writer is internal). | NEW |
| 8 | `writer-form` | New: `/escritor/nueva` (read-only) (prerender false, requires auth). `<WriterForm server:defer />` server island. Fields: title, subtitle, body (Markdown), tag?, image (single file, ≤5 MB, jpeg/png/webp only). POST → save image → insert DB row → redirect to the public note URL. en UI not required (internal). | NEW |
| 9 | `image-upload` | New: `src/lib/{uploads,uploads-mime}.ts`. Magic-byte sniffer (jpeg/png/webp). Size cap from env. Writes to `${UPLOADS_DIR}/notes/<slug>/<file>` with sanitized name. DB stores `${PUBLIC_UPLOADS_URL}/notes/<slug>/<file>`. | NEW |
| 10 | `notes-collection` | **MODIFIED** — change from build-time `glob` collection to live collection in `src/live.config.ts`. Loader queries DB. Schema unchanged (so `NoteCard`/`NoteTemplate` stay byte-identical). Seed note migrates to DB seed row. | MODIFIED |
| 11 | `blog-index` | **MODIFIED** — index reads `getLiveCollection('notes')`. Route is `prerender = false`. en mirror updated the same way. | MODIFIED |
| 12 | `note-template` | **MODIFIED** — detail route reads `getLiveEntry('notes', slug)`. Returns 404 on miss. en mirror updated. | MODIFIED |
| 13 | `deploy-nginx` | New (operational spec, NOT enforced): `deploy/nginx.conf.example` with a vhost that reverse-proxies `/escritor/**` (read-only) to the Astro Node server and serves `/uploads/**` (read-only) directly. | NEW (operational) |
| 14 | `dev-environment` | Update `openspec/config.yaml` context block; update README quick-start so `pnpm dev` and `pnpm build` instructions stay accurate after the adapter swap. | MODIFIED (config + docs only) |

That's 14 slices — too many for one PR. The chained-PR plan above groups them into 4 PR-sized units.

---

## Risks

- **Static-to-on-demand blog migration impacts every shipped blog route.** `/operativos-de-salud/{index,[slug]}` (read-only) and the en mirrors lose build-time staticness → they need a running Astro Node process to serve. Nginx must reverse-proxy to the Node server for those routes in production. Mitigate: keep `/` (read-only) static; document the Nginx routing.
- **Constitution rule 1 is a hard constraint.** Adding `@astrojs/node` and `pg` requires an amendment commit BEFORE any `package.json` change. The apply phase must respect the ordering gate (same gate as the Tailwind amendment).
- **Server islands in isolated context.** Page-level middleware cannot protect a server island; the island itself must check `Astro.cookies` and decide to render the form or a redirect. Document this in the design phase.
- **Password storage.** `crypto.scrypt` parameters (N/r/p) MUST be tuned for security; recommend N=2^15 (memory-hard) — tune in tests if perf is a concern.
- **Upload validation.** MIME by extension is not enough. Magic-byte sniffing closes the gap with zero deps. Also enforce size cap. Also sanitize filenames (strip path separators, allow only `[a-z0-9._-]`).
- **Session cookie security.** `httpOnly`, `sameSite: 'lax'`, `secure: true` in prod. The signing secret MUST be in env, never hardcoded. Use a per-deploy value (32+ bytes random).
- **Blog read-source change MODIFIES three just-archived specs.** `notes-collection`, `blog-index`, `note-template` get MODIFIED blocks. The review will need to compare against the just-archived versions. Recommend citing the prior archive path explicitly.
- **Live collections require a runtime.** Build-time `astro build` will not have DB rows during prerender; any remaining `getCollection` call in a static page breaks. **All routes that call `notes` must be `prerender = false` after the swap.** Easy to miss. Plan includes a grep audit in apply.
- **Subdomain semantics in dev.** A subdomain in dev requires either `/etc/hosts` (read-only) entries OR a sub-path convention (`/escritor/**` (read-only)). Recommend the sub-path for dev simplicity; document the production subdomain host separately.
- **`ASTRO_KEY` not required** for single VPS Docker, but if the maintainer later adds a CDN cache, props passing through server islands will break. Document the operational trigger.
- **400-line PR review budget.** Forecast is **High**. Recommend chained PRs (4 PRs, see Recommendation #7).

---

## Open Questions for the orchestrator to confirm

One question at a time, per house style. The blog read-source fork (Q1) is the single biggest fork — everything else cascades from it.

**Q1. BLOG READ-SOURCE (highest priority)**. User-written notes must appear in the blog without redeploy. Pick one:

- (a) **DB-backed live collection** — `src/live.config.ts` + `LiveLoader` reads Postgres. `getLiveCollection('notes')` on the page. Three just-archived specs become MODIFIED. **Recommended.**
- (b) **Hybrid** — keep `glob` for the seed note, merge in live rows at request time. Slightly more code, slightly less spec churn.
- (c) **Runtime Markdown files** — reject; needs a redeploy per publish.

**Q2. Writer route path naming**. Where does the auth subdomain live in dev?
- (a) `/escritor/login` (read-only), `/escritor/nueva` (read-only) (sub-path on the same host). Simplest locally.
- (b) `auth.lawho.local` etc. (real subdomain). Requires `/etc/hosts` (read-only) + extra `host` handling in Astro.

**Q3. Auth model**. Signed-cookie session vs DB session table. Recommend signed cookie for now; confirm:
- (a) Signed cookie (no session table). Lightweight; no force-logout.
- (b) DB-backed sessions. One extra table; force-logout works.

**Q4. Login-only users + role flag**. The maintainer inserts users in Postgres. Should the schema carry a `role`/`is_active` flag now (for future `editor` / `admin` distinction)?
- (a) Yes — add `role text default 'writer'` and `is_active bool default true` to `users`. Cheap, future-proof.
- (b) No — minimal schema, add later.

**Q5. Image upload limits**. Default cap and accepted formats?
- (a) 5 MB, jpeg/png/webp only. **Recommended.**
- (b) 10 MB, jpeg/png/webp/gif.
- (c) Configurable per-env (no hard default).

**Q6. Session duration**.
- (a) 24 hours sliding window. **Recommended default.**
- (b) 7 days.
- (c) Configurable.

**Q7. EN UI on the writer section**. The public site has en fallback; the writer is internal. Should the writer form be Spanish-only?
- (a) Spanish only — simpler, matches the maintainer's internal audience.
- (b) Bilingual — extra work.

**Q8. EN route behavior on the blog index/detail after the swap**. The blog goes on-demand. `/en/operativos-de-salud/` (read-only) should:
- (a) Render the same Spanish content (current `i18n-setup` fallback semantics). Same loader, same data.
- (b) Render only notes that have an `en` translation. (Requires per-note translation schema; rejects for v1.)

---

## Ready for Proposal

**No — confirmation needed first.**

The orchestrator should:

1. Present Q1 (blog read-source fork) to the user. Until that's answered, the proposal cannot pick a starting architecture.
2. Once Q1 is answered, ask Q2 (writer route path).
3. Then Q3-Q8 in order.
4. After Q1-Q8 are answered, launch `sdd-propose` with the chosen fork and the capability slice list above (Section: Capability slice list).

Forecast against the 400-line PR review budget (per Section E of `_shared/sdd-phase-common.md`):

- Decision needed before apply: Yes (the blog read-source fork + auth model + writer path).
- Chained PRs recommended: Yes (4 PRs).
- 400-line budget risk: **High** (≈10-15 new files + 5 modifications + 5 spec deltas + 1 SQL migration + 1 constitutional amendment).

The orchestrator should pre-cache a delivery strategy of `auto-chain` (or `ask-on-risk` if user prefers to confirm each PR slice manually). The proposal MUST plan chained delivery; the apply phase MUST NOT start the work as a single oversized PR.
