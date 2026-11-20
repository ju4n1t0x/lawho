# Apply Progress: Blog "Operativos de Salud" (cumulative — U1 + U2)

## Batch

- **Change**: blog-operativos
- **Mode**: Standard (`strict_tdd: false`)
- **Branches**:
  - U1: `feat/blog-operativos-unit-1` (PR 1 — from tracker `feat/blog-operativos`)
  - U2: `feat/blog-operativos-unit-2` (PR 2 — from `feat/blog-operativos-unit-1`)
- **Chain strategy**: feature-branch-chain — PR #1 targets tracker `feat/blog-operativos` (carries `feat/site-implementation-unit-3`); PR #2 targets `feat/blog-operativos-unit-1`. Neither targets main.

## Completed Tasks (cumulative)

### U1 (PR 1 — previous batch)

- [x] 1.1 `src/content.config.ts` — `notes` glob collection + zod schema (title, subtitle, `image()`, date, draft=false, featured=true, author?, tag?)
- [x] 1.2 `src/content/notes/primer-operativo-2024.md` — Spanish seed note, featured=true, draft=false
- [x] 2.1 `src/content/notes/images/primer-operativo-2024.jpg` — co-located seed image
- [x] 2.2 `src/lib/notes.ts` — `getPublishedNotes` (draft filter, date DESC, featuredOnly) + `formatNoteDate(date, 'es-AR')`
- [x] 2.3 `src/lib/notes.test.ts` — vitest cases (draft, DESC, featuredOnly, empty, no-featured-filter, es-AR, en-US)
- [x] 3.1 `src/pages/operativos-de-salud/index.astro` — header + published grid + empty state
- [x] 3.2 `src/pages/en/operativos-de-salud/index.astro` — en mirror

### U2 (PR 2 — this batch)

- [x] 4.1 `src/components/NoteCard.astro` — shared miniature `<a href="/operativos-de-salud/{id}/">`: 4/5 photo-zoom image + alt, font-display title, muted subtitle, optional tag eyebrow, lift hover, Reveal wrapper, focus ring
- [x] 4.2 `src/components/NoteTemplate.astro` — hero image + title/subtitle + es-AR date + optional author/tag + `<Content />` with reading-friendly scoped typography
- [x] 4.3 `src/pages/operativos-de-salud/[slug].astro` — `getStaticPaths` (draft filter) + `render(note)`; unknown slug → Astro 404
- [x] 4.4 `src/pages/en/operativos-de-salud/[slug].astro` — en mirror (`<html lang="en">` via `Astro.currentLocale`)
- [x] 5.1 `src/components/Misiones.astro` — `getPublishedNotes(...,{featuredOnly:true})`, keep `id="misiones"`, NoteCard cards, eyebrow links `/operativos-de-salud/`
- [x] 5.2 `src/components/NavBar.astro` — "Operativos de salud" → `/operativos-de-salud/` (desktop + drawer; drawer closes on click)
- [x] 5.3 `openspec/config.yaml` — vitest context, `unit.available: true`, `test_command: vitest run`, blog routes in architecture
- [x] 6.1 `pnpm test` green (13 tests: 8 notes + 5 anim)
- [x] 6.2 `astro build` emits 6 routes (`/`, `/en/`, `/operativos-de-salud/`, `/en/operativos-de-salud/`, both detail pages)
- [x] 6.3 grep-env gate clean (`process.env` / `import.meta.env` → 0 matches)
- [x] 6.4 unknown slug not emitted (Astro 404)

## Work Unit Evidence (U2)

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `PATH="$HOME/.nvm/versions/node/v22.22.3/bin:$PATH" pnpm vitest run` → exit 0, 2 files, 13 tests passed (`notes.test.ts` 8 + `anim.test.ts` 5). |
| Runtime harness command/scenario and exact result | `PATH="$HOME/.nvm/versions/node/v22.22.3/bin:$PATH" pnpm exec astro build` → exit 0, "6 page(s) built": `/`, `/en/`, `/operativos-de-salud/`, `/en/operativos-de-salud/`, `/operativos-de-salud/primer-operativo-2024/`, `/en/operativos-de-salud/primer-operativo-2024/`. Detail page contains seed title + subtitle + author + rendered Markdown body; date renders "15 de junio de 2024"; home has featured-card link + navbar blog link. |
| Rollback boundary | Revert U2 commits `6865c4d`, `5c9a653`, `fe3764f`, `e01905e`, `ed95d7f`, `5e47be1` on `feat/blog-operativos-unit-2`; delete `NoteCard.astro`, `NoteTemplate.astro`, both `[slug].astro`; restore `Misiones.astro`/`NavBar.astro`/`index.astro` (es+en)/`notes.ts`/`notes.test.ts`/`config.yaml` to U1 state. U1 (collection/helpers/index) remains intact. |

## Verification Run (honest — U2)

1. `pnpm vitest run` (nvm v22.22.3) → exit 0, 13 passed (8 notes + 5 anim).
2. `pnpm exec astro build` (nvm v22.22.3) → exit 0; 6 routes emitted (list above).
3. grep-env gate `process.env` / `import.meta.env` on `src/` + `astro.config.mjs` → 0 matches (exit 1).
4. Detail HTML: seed title "Primer operativo de salud en el Chaco Salteño", subtitle, author "Equipo LaWho", body paragraph, `<time>` "15 de junio de 2024" grep-confirmed. `<html lang="es">` / `<html lang="en">` correct per route.
5. Index (es+en) card `href="/operativos-de-salud/primer-operativo-2024/"` (no more `/undefined/`). Home Terreno featured card links to the note; navbar (desktop + drawer) + misiones eyebrow link to `/operativos-de-salud/`.
6. Unknown slug: `dist/operativos-de-salud/no-existe` does not exist (only `index.html` + `primer-operativo-2024/`), so `/operativos-de-salud/no-existe/` → 404.
7. `git diff --shortstat feat/blog-operativos-unit-1..feat/blog-operativos-unit-2` → 11 files, 285 insertions, 96 deletions (381 authored changed lines; `config.yaml` counted whole-file as new since it was previously untracked).

## Commits

### U1 (PR 1)

1. `898806b` feat(notes): add notes content collection with seed note
2. `41f2592` feat(notes): add published-notes helpers with tests
3. `d580a9e` feat(blog): add operativos-de-salud index routes

### U2 (PR 2)

1. `6865c4d` fix(notes): format note dates in UTC to preserve calendar day
2. `5c9a653` feat(blog): add note card and detail page template
3. `fe3764f` fix(blog): use NoteCard in blog index via entry id
4. `e01905e` feat(landing): source Terreno cards from featured notes
5. `ed95d7f` feat(nav): add Operativos de salud link
6. `5e47be1` docs(sdd): refresh testing context with vitest

## Deviations from Design

- **`note.id` used as the slug, not `note.slug`**: Astro 7.2 content layer REMOVED the `slug` property from entries (runtime.js `warnForPropertyAccess` marks it deprecated → returns `undefined`). The glob loader stores the slug in the entry `id`. VERIFIED against `node_modules/astro/dist/content/loaders/glob.js` (`generateIdDefault` returns `getContentEntryIdAndSlug().slug`) and `node_modules/astro/dist/content/runtime.js`. The U1 index shipped `note.slug` → broken `/operativos-de-salud/undefined/` links, fixed here by adopting `NoteCard` (uses `note.id`).
- **Blog index refactored to use `NoteCard`** (both es + en): blog-index RQ5 requires cards render as `NoteCard`, and U1's apply-progress explicitly deferred this ("NoteCard will replace this markup"). Also fixes the slug bug above.
- **`NoteCard` includes the `Reveal` wrapper** (with optional `delay` prop) for `data-reveal` parity with landing components; consumers no longer wrap manually.
- **`formatNoteDate` now formats in `timeZone: "UTC"`**: `z.coerce.date()` parses date-only YAML (`2024-06-15`) as UTC midnight, which shifted a day backwards under es-AR's UTC-3 offset ("14 de junio"). UTC formatting preserves the authored calendar day ("15 de junio de 2024"). Added a regression test.
- **`z`/`glob`/`defineCollection`/`render`/`getEntry`/`getCollection` confirmed** against `node_modules/astro` (`astro:content` virtual module + generated `.astro/content.d.ts`): `render` → `{ Content, headings, remarkPluginFrontmatter }`; `glob` in `astro/loaders`; `z` in `astro/zod` (already established in U1).
- **`NoteTemplate.Content` typed `any`**: Astro exposes `Content` as `AstroComponentFactory` via an internal path; no public clean type import. No linter in project; `any` is pragmatic.

## Issues

- **Pre-existing U1 bug — `note.slug` is `undefined`** (Astro 7.2 removed it): U1 index links were `/operativos-de-salud/undefined/`. Fixed in U2 via `NoteCard` (`note.id`). Root cause documented above.
- **Date off-by-one** (UTC vs local): seed date `2024-06-15` rendered "14 de junio de 2024" on the UTC-3 host before the UTC-format fix.
- **Pre-existing staged file** (`openspec/changes/archive/2026-09-02-site-implementation/tasks.md`) was unstaged before any commit; `README.md` (modified) and `openspec/changes/site-implementation/tasks.md` (deleted) left as foreign working-tree changes, untouched.

## PR Boundary

- Mode: chained PR slice (feature-branch-chain)
- Current work unit: U2 (PR 2 — FINAL slice)
- Boundary: starts from `feat/blog-operativos-unit-1` HEAD (`d580a9e`); adds note detail routes + NoteCard/NoteTemplate, adopts NoteCard in the blog index (fixing the slug bug), refactors Terreno + NavBar, refreshes config. Does NOT include write-side (auth/server islands) or Nginx migration (out of scope for this change).
- Estimated review budget impact: 381 authored changed lines (285 + 96), under the 400-line budget. After U2, only sdd-verify and sdd-archive remain.
