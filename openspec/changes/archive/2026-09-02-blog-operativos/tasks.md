# Tasks: Blog "Operativos de Salud" (Read Side)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~350–450 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Collection + schema + seed + helpers/tests + blog index (es+en) | PR 1 (base: tracker branch off `feat/site-implementation-unit-3`) | `pnpm test -- src/lib/notes.test.ts` | `astro build` under nvm v22.22.3 (system node v18); assert index.html emits | Delete `src/content.config.ts` + `notes/`, `notes.*`, both `index.astro` |
| 2 | Note detail (es+en) + NoteCard/NoteTemplate + Terreno + NavBar + config refresh | PR 2 (base: PR 1 branch) | `pnpm test` | `astro build` (nvm v22.22.3); assert 4 blog routes + `/` `/en/` emit | Revert `Misiones.astro`/`NavBar.astro`; delete `[slug].astro` + new components, restore `config.yaml` |

## Phase 1: Collection Foundation

- [x] 1.1 Create `src/content.config.ts`: `notes` glob collection over `src/content/notes/**/*.md` + zod schema (title, subtitle, `image()`, date, draft=false, featured=true, author?, tag?) — notes-collection SC1–5
- [x] 1.2 Create seed `src/content/notes/primer-operativo-2024.md` (Spanish, featured, draft=false) — notes-collection SC8

## Phase 2: Helpers + Seed Images

- [x] 2.1 Add co-located `src/content/notes/images/` image referenced `./images/...` — notes-collection SC6
- [x] 2.2 Create `src/lib/notes.ts`: `getPublishedNotes(collection, {featuredOnly?})` (draft filter, date DESC) + `formatNoteDate(date, 'es-AR')` — notes-helpers RQ1–2
- [x] 2.3 Write `src/lib/notes.test.ts` covering notes-helpers SC (draft, DESC, featuredOnly, empty, es-AR, en-US); mirror `anim.test.ts` precedent

## Phase 3: Routes

- [x] 3.1 Create `src/pages/operativos-de-salud/index.astro`: header (eyebrow, H1, intro) + published grid via `getPublishedNotes` + empty state — blog-index RQ1–5
- [x] 3.2 Create `src/pages/en/operativos-de-salud/index.astro` mirror — blog-index RQ6

## Phase 4: Detail + Shared Components

- [x] 4.1 Create `src/components/NoteCard.astro`: `<a href="/operativos-de-salud/{slug}/">`, photo-zoom 4/5 image + alt, font-display title, muted subtitle, optional tag eyebrow, lift hover — note-card all
- [x] 4.2 Create `src/components/NoteTemplate.astro`: hero image + title/subtitle + es-AR date + optional author/tag + `<Content />` — note-template RQ2–5
- [x] 4.3 Create `src/pages/operativos-de-salud/[slug].astro`: `getStaticPaths` (draft filter) + `render(note)`; unknown slug → Astro 404 — note-template RQ1,6
- [x] 4.4 Create `src/pages/en/operativos-de-salud/[slug].astro` mirror — note-template RQ7

## Phase 5: Integrations

- [x] 5.1 Refactor `src/components/Misiones.astro`: `getPublishedNotes(...,{featuredOnly:true})`, keep `id="misiones"`, NoteCard `<a>` wrap, eyebrow links blog — misiones all
- [x] 5.2 Add "Operativos de salud" → `/operativos-de-salud/` to `src/components/NavBar.astro` desktop + drawer, drawer closes on click — navbar RQ1–2
- [x] 5.3 Refresh `openspec/config.yaml`: `unit.available: true`, add `test_command: vitest run`, fix stale context (vitest IS installed, `test` script + `anim.test.ts` exist)

## Phase 6: Verification

- [x] 6.1 `pnpm test` green (notes + anim) — notes-helpers RQ3
- [x] 6.2 `astro build` (nvm v22.22.3) emits the 4 blog routes + `/` + `/en/`
- [x] 6.3 grep-env gate: assert no `process.env`/`import.meta.env` in changed files — config apply rule
- [x] 6.4 Confirm unknown slug returns Astro 404 — note-template SC5