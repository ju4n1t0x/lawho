# Exploration: blog-operativos

Read-side of the LaWho "operativos de salud" blog: a Markdown content collection of notes authored (eventually) by registered users, surfaced through (a) clickable thumbnails inside the Terreno section of the landing and (b) an internal `/operativos-de-salud` route that shows a blog-style miniature grid of every published note. The write-side (auth subdomain + server islands + form to publish a note) belongs to a separate, future change.

---

## Current State

### Branch and stack baseline

- Branch: `feat/site-implementation-unit-3` (landing fully implemented; blog absent).
- Astro 7.2.10 (confirmed in `node_modules/astro/package.json`); Tailwind v4 (`@tailwindcss/vite`); vitest 4.1.11 with one passing test (`src/lib/anim.test.ts`); `pnpm test` works.
- `openspec/config.yaml` records `test_layers.unit.available: false` — that flag is stale (vitest IS installed and `anim.test.ts` already runs); not blocking this change but worth flagging for the apply phase.

### Landing layout and the "Terreno" section

- `src/pages/index.astro` and `src/pages/en/index.astro` both render `<HomeSections />` inside `<BaseLayout>` (en falls back to es per `i18n-setup` spec).
- `src/components/HomeSections.astro` composes: `NavBar`, `Hero`, `Marquee`, `Historia`, `Infancias`, `Impacto`, `Misiones`, `Donar`, `Voluntariado`, `Footer`.
- `src/components/Misiones.astro` is THE "Terreno" section in practice:
  - `<section id="misiones" class="...">` — the `id` is `misiones`, NOT `terreno`.
  - H2: "Lo que pasa en el terreno"; eyebrow: "Operativos de salud".
  - Cards are rendered from a hardcoded `const misiones = [...]` array (3 entries: Pediatría y nutrición, Diagnóstico, Comunidad).
  - Each card is a `<div>` (NOT an `<a>`). No link, no hover-link affordance. Images come from `src/assets/mision-1.jpg`, `mision-2.jpg`, `mision-3.jpg` via Vite imports (`m.img.src`).
- `src/components/NavBar.astro`:
  - Desktop and mobile drawer list: `Historia (#historia)`, `Infancias (#infancias)`, `Terreno (#misiones)` (text "Terreno" but anchor `#misiones`), `Sumate (#voluntariado)`, `Doná (#donar)`.
  - **No link points to `/operativos-de-salud` or any blog route — anywhere in `src/`** (verified via grep for `operativos-de-salud`, `/blog`, `id="terreno"` — zero hits).
- `src/components/Historia.astro`, `Infancias.astro`, etc. are not blog-related; they render their own hardcoded content.
- `src/layouts/BaseLayout.astro`: shell with `<html lang={Astro.currentLocale ?? "es"}>`, OG meta, `<title>LAWHO | Operativos de salud en el Chaco Salteño</title>`, global CSS import, `<slot />`. No blog-specific head tags.
- `src/styles/global.css`: design tokens (`@theme inline` + `:root` oklch), 7 keyframes, utility classes (`photo-zoom`, `lift`, `reveal`, `animate-*`). The blog MUST reuse these tokens verbatim — no new colors or animations unless justified by spec.

### i18n baseline

- `astro.config.mjs` `i18n`: `{ defaultLocale: 'es', locales: ['es', 'en'], routing: { prefixDefaultLocale: false } }`.
- `i18n-setup` spec mandates `/en/*` falls back to `/es/*` when no translation file exists.
- For the blog: Spanish content lives at `/operativos-de-salud/` and `/operativos-de-salud/[slug]/`; English mirrors at `/en/operativos-de-salud/` and `/en/operativos-de-salud/[slug]/` (rendering the same Spanish body until en translation exists).

### Content collections — current status

- `src/content.config.ts` does NOT exist (verified with glob).
- `src/content/` directory does NOT exist.
- `getCollection`, `getEntry`, `render` from `astro:content` are NOT imported anywhere.
- No `.md`/`.mdx` files live in `src/` or anywhere in the repo.

### Astro 7.2 content-layer API (verified in installed package)

Confirmed in `node_modules/astro/dist/content/config.d.ts` and `loaders/glob.d.ts`:

- `defineCollection({ loader: glob({ pattern, base }), schema })` — content-layer style (recommended since Astro 5; the old `type: 'content'` + folder convention still works but is legacy).
- `glob({ pattern: '**/*.md', base: './src/content/notes' })` loads Markdown entries from a directory.
- `schema: ({ image }) => z.object({ image: image(), title: z.string(), subtitle: z.string(), date: z.coerce.date(), draft: z.boolean().default(false), body: z.string() })` — the `image()` helper is provided via the `SchemaContext` callback and returns `ImageMetadata` (Astro resolves the path against the entry file and optimizes it at build).
- `getCollection('notes')` returns entries with `id`, `slug`, `data` (frontmatter), `body`.
- `getEntry('notes', 'some-slug')` returns one entry.
- `await render(entry)` returns `{ Content, headings, remarkPluginFrontmatter }`; the `<Content />` component renders the Markdown body.
- Dynamic routes via `src/pages/operativos-de-salud/[...slug].astro` (or `[slug].astro`) with `getStaticPaths()` returning one path per entry.

### Existing OpenSpec surface relevant to this change

- `openspec/specs/navbar/spec.md` — currently links to `#misiones` for "Terreno"; will need a MODIFIED block if we add an "operativos de salud" link to the navbar (or we leave the navbar alone and add a CTA inside the Terreno section — see Open Questions).
- `openspec/specs/misiones/spec.md` — currently hardcodes 3 cards. This change will MODIFY or REPURPOSE this spec: cards must become links to real notes (selected from the collection). The hardcoded array should be REMOVED in favor of `getCollection('notes')`.
- `openspec/specs/layout-template/spec.md` — unaffected; BaseLayout already provides the shell and global CSS.
- `openspec/specs/i18n-setup/spec.md` — unaffected; en fallback already configured.
- `openspec/specs/design-tokens/spec.md` — blog components MUST reuse the existing tokens (`bg-card`, `lift`, `photo-zoom`, `font-display`, `animate-fade-up`, `rounded-[2rem]`, etc.). No new tokens unless the design phase proves a need.
- No spec yet covers content collections, the blog index, or the note detail page.

### Out of scope (confirmed boundary)

- Authentication, registration, login, session management — future change.
- Server islands for the write form on the auth subdomain — future change.
- PostgreSQL writes — future change. (The README/AGENTS already declares Postgres + Nginx; both are external to this read-side.)
- Nginx image hosting migration — future change. For now, note images live in `src/content/notes/images/` (mirroring the existing `src/assets/*.jpg` pattern).
- Real CMS / database replacement of the Markdown collection — explicitly NOT this change.

---

## Affected Areas

### Files this change will CREATE

| Path | Why |
|------|-----|
| `src/content.config.ts` | Collection registry. Declares the `notes` collection (content-layer with `glob` loader over `src/content/notes/**/*.md`) and its zod schema (`title`, `subtitle`, `image`, `date`, `draft`, optional `description`, optional `author`). |
| `src/content/notes/` | Markdown entries live here. One file per note (e.g. `primer-operativo-2024.md`). Subfolder `images/` co-locates the JPG referenced from frontmatter. |
| `src/content/notes/images/` | Note images. Initially mirrors the convention of `src/assets/*.jpg` (Vite/Astro optimized). Documented as the swap point for Nginx later. |
| `src/pages/operativos-de-salud/index.astro` | Blog index: `<BaseLayout>` + page header + grid of miniatures (`NoteCard` components) for all entries where `draft === false`, sorted by `date` DESC. |
| `src/pages/operativos-de-salud/[...slug].astro` | Dynamic detail route. `getStaticPaths()` from `getCollection('notes')`; renders `<NoteTemplate>` for the matched entry. |
| `src/pages/en/operativos-de-salud/index.astro` | English mirror of the blog index. Falls back to Spanish content per `i18n-setup` (same component, same `getCollection('notes')` call). |
| `src/pages/en/operativos-de-salud/[...slug].astro` | English mirror of the dynamic detail route. Same fallback semantics. |
| `src/components/NoteCard.astro` | Single miniature: `<a>` wrapping `photo-zoom` image (4/5 aspect), title (`font-display`), subtitle (`text-muted-foreground`), optional eyebrow tag. Reused by both the blog index AND the Terreno section. |
| `src/components/NoteTemplate.astro` (or `src/layouts/NoteLayout.astro`) | Full-note layout: hero image (16/9 or 21/9), title (`font-display`), subtitle (`text-muted-foreground`), date eyebrow, `<Content />` body from `await render()`. Reading-friendly typography (max-width prose, generous line-height). |
| `src/components/BlogHero.astro` (optional, only if design phase justifies) | Page-level header for `/operativos-de-salud` (eyebrow "Blog", H1 "Operativos de salud", intro paragraph). Likely inlined in the index page; split into a component only if reused. |
| `src/lib/notes.ts` (optional) | Small helpers: `formatNoteDate(d: Date, locale: string)`, `getPublishedNotes(locale: 'es' | 'en')` (filters `draft === false`, sorts by `date` DESC). Pure functions → trivially unit-testable with vitest. |
| `src/lib/notes.test.ts` (optional, only if `src/lib/notes.ts` exists) | vitest cases for `formatNoteDate` and `getPublishedNotes`. |
| `src/content/notes/primer-operativo-2024.md` (sample) | Seed data so the landing renders real cards on day one. Title + subtitle + image + body content authored by hand (the user can rewrite). Documented as seed-only. |

### Files this change will MODIFY

| Path | Why |
|------|-----|
| `src/components/Misiones.astro` | Replace the hardcoded `misiones` array with `getCollection('notes')` (filtered, sliced to a curated count — see Open Questions Q1). Wrap each card in `<a href="/operativos-de-salud/{slug}">`. Keep section id `misiones` so the existing `#misiones` anchor link from the navbar still works (the user requested "Terreno section cards link to notes", not "rename the section"). |
| `src/components/NavBar.astro` | Add a new link "Operativos de salud" pointing to `/operativos-de-salud/` (both desktop nav and mobile drawer). See Open Questions Q2 for placement. |
| `src/components/HomeSections.astro` | No structural change needed — `Misiones` is already in the composition. (Skip unless Terreno is split out.) |
| `openspec/specs/navbar/spec.md` | MODIFIED block: add requirement for the "Operativos de salud" link. |
| `openspec/specs/misiones/spec.md` | REPURPOSED via MODIFIED block: cards come from `getCollection('notes')` (filtered + sorted), each wrapped in an `<a>` linking to `/operativos-de-salud/{slug}`. Eyebrow "Operativos de salud" becomes a link to `/operativos-de-salud/` (terreno section CTA — see Q2). |
| `openspec/config.yaml` | Update the `context` block to reflect that the blog index + detail routes now exist and that the `notes` collection is wired. Also refresh the stale `test_layers.unit.available: false` flag if the apply phase writes tests. |

### Files this change will NOT touch

- `docs/constitution.md` — no rule change needed. Content collections are already named in rule 3.
- `astro.config.mjs` — no new env vars, no i18n changes, no plugin changes.
- `package.json` — no new dependencies (content collections are stdlib).
- `src/layouts/BaseLayout.astro` — already provides everything we need.
- `src/styles/global.css` — reuse tokens; do not add new colors/keyframes.
- Anything in `openspec/specs/env-config/`, `openspec/specs/i18n-setup/`, `openspec/specs/design-tokens/`, `openspec/specs/layout-template/`.

---

## Approaches

### A. Content-layer collection (`glob` + zod `image()` schema) + dynamic routes

Use Astro 7.2's content-layer API. One collection `notes` with `glob` over `src/content/notes/**/*.md`, a zod schema declaring `title`, `subtitle`, `image` (via the `image()` helper), `date`, `draft`, and an optional `description`/`author`. Detail pages via `src/pages/operativos-de-salud/[...slug].astro` + `await render(entry)`. Index via `getCollection('notes')` filtered by `draft === false`, sorted by `date` DESC.

- **Pros.** Idiomatic Astro 7.2 — exactly what the docs recommend. The `image()` helper means frontmatter images are optimized at build time (zero runtime cost, same Vite pipeline as `src/assets/*.jpg` today). `draft` flag gives the future write-side a place to control visibility without schema changes. Static build → no SSR adapter needed; Nginx-served static HTML. `Content` from `render()` is plain Markdown → future write form just persists a `.md` file or DB row that mirrors the schema.
- **Cons.** Content lives as files in the repo — when the future auth subdomain writes notes, the Astro app needs a write path into the repo OR the collection must migrate to a DB-backed loader (`Live` collections) at that point. Mitigation: keep `published`/`draft` semantics and schema stable across the migration; the loader swap is internal.
- **Effort.** Medium. Mostly straightforward; the work is wiring the routes + components + 1-2 sample notes.

### B. MDX instead of plain Markdown

Same as A but with `.mdx` entries. Allows embedding components (e.g. a custom `PhotoGallery` or `Callout`) inside the note body.

- **Pros.** Richer body authoring. The future write-side form could render an MDX-friendly editor.
- **Cons.** MDX in content collections still uses `glob` + `render()`, but each entry carries a `components` map that needs to be wired through `<Content components={...} />`. Adds authoring complexity for users who are medical volunteers, not devs. Astro's Markdown is plenty for blog posts. Overkill for the MVP.
- **Effort.** Medium-High. Same plumbing + an MDX-awareness layer. Defer unless the design phase surfaces a concrete component use case.

### C. Data loader (`file()` for JSON / YAML) instead of Markdown

Store notes as JSON/YAML with a separate body file. Skip Markdown rendering entirely.

- **Pros.** Structured data; no `render()` plumbing; works for non-prose payloads.
- **Cons.** Throws away Markdown's biggest win (rich text body with no schema for paragraphs/headings/lists). Future write-side now has to invent a WYSIWYG that emits the JSON shape — much harder than persisting `.md`.
- **Effort.** Low for the read-side, very high later. Reject.

### D. `Live` content collection backed by PostgreSQL now

Wire `defineCollection({ type: 'live', loader: dbLoader(...) })` from day one so the future write-side just inserts rows.

- **Pros.** Zero migration when the write-side ships. One source of truth.
- **Cons.** Requires a Postgres adapter, an `output: 'server'` (or hybrid) build, server islands, env-driven build at deploy time — all the architecture the user explicitly deferred to a future change. Couples this read-side to the write-side, violating the spec's boundary. Premature.
- **Effort.** High. Reject for this change; revisit when the write-side change ships.

### E. i18n strategy — Spanish-only, en fallback (vs duplicated content)

`i18n-setup` already says en falls back to es. The blog therefore ships the same Spanish body under both `/operativos-de-salud/{slug}/` and `/en/operativos-de-salud/{slug}/`. The only per-locale difference could be a translated `title`/`subtitle` in frontmatter (via `i18n` frontmatter keys or separate `title.en`/`title.es` fields).

- **Pros.** Matches the `i18n-setup` precedent (no en content yet, fallback works). Single source of truth for body. No editor friction.
- **Cons.** If the LaWho team later wants an English version of a note, the schema needs a translation field (e.g. `titleI18n: { en?: string, es: string }`).
- **Effort.** Low. Recommended for MVP. Migration to per-field translations is a schema addition later, not a rewrite.

### F. Where to store note images right now

- Option F1: co-located `src/content/notes/images/*.jpg` + `image()` schema helper (Astro's recommended pattern).
- Option F2: reuse `src/assets/*.jpg` by importing the asset in the Markdown frontmatter (works because Vite resolves the import, but the frontmatter schema then needs an `import` reference instead of a plain path).
- Option F3: store images in `public/notes/` and reference by string path (no optimization).

Recommended: **F1**. It mirrors `src/assets/` (Vite/Astro optimize), keeps each note self-contained, and is the single swap point when Nginx takes over (move the folder out, update `image()` base path).

### G. Terreno cards mapping

- Option G1: ALL notes render as Terreno cards (no cap).
- Option G2: only the most recent N (e.g. 3) notes appear as Terreno cards; older notes live only in the blog index.
- Option G3: a curated subset (frontmatter flag `featured: boolean`).

Recommended: **G3** (with sensible default `featured = true` for the seed sample). It gives the LaWho team an editorial lever and matches how the reference's 3 hardcoded cards work today. Default the seed sample to `featured: true` so nothing renders empty.

---

## Risks

- **Terreno ↔ Misiones terminology drift (section id `misiones` vs H2 "Lo que pasa en el terreno" vs NavBar text "Terreno")**. The user said "Terreno section cards link to notes". The section id is `misiones` — anchors from the navbar (`#misiones`) and section semantics both work via the existing id, but the user might want the section renamed to `id="terreno"` for clarity. Recommendation: keep `id="misiones"` to preserve the navbar anchor and existing deep-links; document the "Terreno" name as the user-facing label only. Confirm in Open Questions.
- **Hardcoded Misiones card content vs collection data**. The current Misiones spec hardcodes 3 entries with verbatim tag/title/text. The blog schema will not have a `tag` field (the user asked for image + title + subtitle + body — no tag). Option: keep an optional `tag` field in the schema (mirrors current Misiones cards), or drop it entirely. The Misiones spec will need a MODIFIED block describing the new data source.
- **Image handling drift**. `src/assets/*.jpg` is processed by Vite/Astro's image pipeline today. Notes images in `src/content/notes/images/` follow the same pattern (the `image()` helper wires them in). The Nginx migration is a future concern, but the exploration MUST flag it so the spec mentions where the swap point lives (recommendation: explicit scenario in `notes-collection` spec saying "image source MAY migrate to Nginx-hosted URLs without schema change; the `image()` helper resolves Vite-imported JPGs by default").
- **Blog i18n mirror route duplication**. Astro `prefixDefaultLocale: false` means `/operativos-de-salud/` is the canonical URL; `/en/operativos-de-salud/` is the en mirror. We must create both `src/pages/operativos-de-salud/...` and `src/pages/en/operativos-de-salud/...` files OR rely on Astro's fallback. The `i18n-setup` spec mandates explicit `/en/` route files; we follow the same convention.
- **No tests today for content/route logic**. The `notes.ts` helper is the only unit-testable surface (date formatting + filter/sort). If the design phase inlines this logic in the page, no tests are possible — that is acceptable per constitution rule 4 ONLY if the apply phase documents the lack of testable surface and the orchestrator approves. Recommended: factor `getPublishedNotes()` + `formatNoteDate()` into `src/lib/notes.ts` so vitest can cover them; mirrors the `anim.test.ts` precedent.
- **Write-side boundary leak**. The future write-side may want frontmatter fields we don't include today (e.g. `slug`, `authorId`, `publishedAt`). Including `draft: boolean().default(false)` + `date: z.coerce.date()` in the schema leaves room. A separate `notes.write-contract.md` (NOT a spec — an internal contract between this change and the future auth-subdomain change) should enumerate reserved frontmatter fields. Suggest documenting in the `notes-collection` spec as a non-normative note.
- **Vitest config drift**. `vitest` is installed but no `vitest.config.ts` exists — vitest runs with defaults. If `src/lib/notes.test.ts` is added, it must work with the default config (Astro's TypeScript settings). Should not block this change.
- **400-line budget per PR**. Site-implementation change already burned through 3 PR units (U1, U2, U3). This blog change adds ~6-9 new files. The exploration forecasts the work as Medium overall; recommend splitting into at least 2 chained PRs: (1) collection + sample note + blog index; (2) note detail page + Terreno integration + navbar integration. Confirm during tasks phase.

---

## Ready for Proposal

**Yes — proceed to `sdd-propose`** with the following inputs once Open Questions are answered:

- Approach A confirmed (content-layer `glob` + zod `image()` schema + dynamic routes + static build).
- Approach F1 for image storage (`src/content/notes/images/`).
- Approach G3 for Terreno mapping (`featured: boolean`).
- Approach E (Spanish-only with en fallback) for i18n; add `subtitle` field in BOTH locales only if Q5 says so.
- 6-7 capability slices (proposed list below).
- One seed note (`src/content/notes/primer-operativo-2024.md`) so the Terreno cards and blog index render real content from day one.

### Proposed spec-slice list (for the orchestrator's `sdd-propose`)

Following the project's "one spec per concern" pattern (see `openspec/specs/` for the established naming).

| # | Domain (spec dir) | Subject | Type |
|---|-------------------|---------|------|
| 1 | `notes-collection` | Content collection declaration: `src/content.config.ts` declares `notes` with `glob` loader, zod schema (`title`, `subtitle`, `image`, `date`, `draft`, optional `description`, optional `author`, optional `featured`), Markdown body. `image()` helper used. Schema is the contract for the future write-side. | NEW |
| 2 | `blog-index` | `/operativos-de-salud/` route renders a `<NoteCard>` grid (image + title + subtitle) from `getCollection('notes')` filtered by `draft === false`, sorted by `date` DESC. Page header (eyebrow + H1 + intro). en mirror at `/en/operativos-de-salud/` (same component, same data per `i18n-setup`). | NEW |
| 3 | `note-template` | `/operativos-de-salud/[...slug]` dynamic route renders hero image + title + subtitle + date eyebrow + `<Content />` body via `await render(entry)`. en mirror at `/en/operativos-de-salud/[...slug]`. Reading-friendly typography. | NEW |
| 4 | `note-card` | Shared `<NoteCard>` component used by blog index AND Terreno section: `<a>` wrapper, `photo-zoom` image (4/5 aspect), `font-display` title, `text-muted-foreground` subtitle, optional eyebrow tag, `lift` hover. | NEW |
| 5 | `terreno-integration` | MODIFIED block on `openspec/specs/misiones/spec.md`: the hardcoded `misiones` array is replaced with `getCollection('notes')` filtered by `featured === true`, sorted by `date` DESC. Each card wrapped in `<a href="/operativos-de-salud/{slug}">`. Section id `misiones` is preserved. Eyebrow "Operativos de salud" becomes a link to `/operativos-de-salud/` (or removed if Q2 says the navbar is the only link). | MODIFIED |
| 6 | `nav-blog-link` | MODIFIED block on `openspec/specs/navbar/spec.md`: add an "Operativos de salud" link in both desktop nav and mobile drawer pointing to `/operativos-de-salud/` (and the en mirror). Placement per Q2. | MODIFIED |
| 7 | `notes-helpers` (optional) | `src/lib/notes.ts` + vitest coverage for `getPublishedNotes()` (filters drafts, sorts by date DESC, optionally filters by `featured`) and `formatNoteDate(d, locale)`. Pure functions, no DOM. | NEW (optional — only if apply phase decides to factor out helpers) |

If the orchestrator wants to collapse slices, `note-card` can be absorbed into `blog-index` and `notes-helpers` can be absorbed into `notes-collection`. Recommend keeping them separate for review budget.

### Implementation order suggestion (for `sdd-tasks`)

1. `notes-collection` spec + `src/content.config.ts` + `src/lib/notes.ts` + tests + seed sample note.
2. `note-template` spec + dynamic route + en mirror.
3. `blog-index` spec + index route + en mirror.
4. `note-card` spec + shared component.
5. `terreno-integration` MODIFIED block + modify `Misiones.astro` to use the collection.
6. `nav-blog-link` MODIFIED block + modify `NavBar.astro` (desktop + drawer).
7. Update `openspec/config.yaml` context to reflect new routes.
8. Run `astro build` (verify-report).

Forecast against the 400-line PR review budget: this change is likely Medium (≈ 6 new files + 2 modifications + 2 MODIFIED spec blocks). Plan for 2 chained PRs if `sdd-tasks` flags a high risk.

---

## Open Questions for the User

One question at a time, per house style. The orchestrator should ask **Q1 first** because Q3-Q5 cascade from the Terreno mapping decision.

**Q1. Terreno cards mapping.** Which of these best matches your intent?
- (a) ALL published notes render as Terreno cards (no cap).
- (b) Only the most recent N (e.g. 3) notes — older notes live only in the blog index.
- (c) A curated subset via a frontmatter flag (e.g. `featured: boolean`, default `true`).

**Q2. "Operativos de salud" link placement.** Where should the link that takes users to the blog index live?
- (a) NavBar only (desktop nav + mobile drawer).
- (b) Inside the Terreno section itself (eyebrow "Operativos de salud" becomes the link).
- (c) Both (NavBar entry + section eyebrow link).

**Q3. Section id rename.** The Terreno section currently uses `id="misiones"` (the navbar links `#misiones` with text "Terreno"). The user said "Terreno section" — should we:
- (a) Keep `id="misiones"` and rely on the existing navbar anchor (no anchor drift).
- (b) Rename to `id="terreno"` (one-line change in `Misiones.astro` + update navbar anchor + update any external links).

**Q4. Seed sample.** Should we ship 1 sample note (`primer-operativo-2024.md`) so the Terreno cards and blog index render real content from day one, or ship zero notes and let the future write-side populate the collection?

**Q5. Blog i18n content.** Per `i18n-setup`, en falls back to es. For the blog:
- (a) Spanish-only body, en mirror renders the same Spanish (matches existing `i18n-setup` precedent).
- (b) Per-locale `title`/`subtitle` frontmatter via a `titleI18n: { en?: string, es: string }` shape (more authoring complexity, future-proof for translations).

**Q6. Notes metadata fields.** Beyond `title`, `subtitle`, `image`, `date`, and `body`, do we need any of these now (vs. leaving them as a schema migration for the future write-side)?
- (a) `author` (display name of the registered user who wrote the note) — useful for editorial trust.
- (b) `tag` (the small pill that the Misiones cards show today, e.g. "Pediatría y nutrición") — keeps visual parity with current Terreno cards.
- (c) `featured` (curation flag — see Q1.c).
- (d) None — minimal schema, defer everything else.