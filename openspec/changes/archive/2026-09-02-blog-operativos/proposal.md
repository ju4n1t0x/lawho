# Proposal: Blog "Operativos de Salud" (Read Side)

## Intent

Surface "operativos de salud" notes as clickable content: Terreno miniatures link to a blog at `/operativos-de-salud`. Read-only; write-side (auth + form) is a future change.

## Scope

### In Scope
- `notes` collection (`glob` loader + zod `image()` schema), Markdown body via `render()`.
- Blog index `/operativos-de-salud/` + detail `[...slug]`; en mirrors under `/en/operativos-de-salud/`.
- Shared `NoteCard` + `NoteTemplate` (reuse design tokens).
- Terreno (`Misiones.astro`) → `featured` cards linking to notes; keep `id="misiones"`.
- NavBar "Operativos de salud" link (desktop + drawer).
- Pure helpers `src/lib/notes.ts` + vitest; one seed note.

### Out of Scope
- Write-side (auth subdomain, server islands, publish form); DB loader; editing/deletion.
- Pagination; per-note translations; Nginx image migration.

## Capabilities

### New Capabilities
- `notes-collection`: `notes` collection + zod schema (title, subtitle, image, date, draft, featured, author, tag) + Markdown body.
- `blog-index`: grid of published notes (date DESC) + header; en mirror.
- `note-template`: note detail layout + `<Content />` body; en mirror.
- `note-card`: shared miniature `<a>` (photo-zoom, font-display title, muted subtitle, tag, lift).
- `notes-helpers`: `getPublishedNotes()`, `formatNoteDate()`, vitest.

### Modified Capabilities
- `misiones`: array → `featured===true` notes date DESC, `<a>`-wrapped; eyebrow links blog.
- `navbar`: add "Operativos de salud" → `/operativos-de-salud/` (desktop + drawer).

## Approach

Content-layer `glob` collection over `src/content/notes/**/*.md`; images co-located (future Nginx swap, constitution rule 5); helpers mirror `anim.test.ts` precedent.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/content.config.ts` | New | collection + schema |
| `src/content/notes/` (+`images/`) | New | notes + seed |
| `src/pages/operativos-de-salud/` | New | index + detail |
| `src/pages/en/operativos-de-salud/` | New | en mirrors |
| `NoteCard.astro`, `NoteTemplate.astro`, `src/lib/notes.ts`, `notes.test.ts` | New | components + helpers + tests |
| `src/components/Misiones.astro` | Modified | featured cards + links |
| `src/components/NavBar.astro` | Modified | add blog link |
| `openspec/config.yaml` | Modified | refresh context |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| ~6-9 files → 400-line budget | Medium | 2 chained PRs |
| `id="misiones"` vs label "Terreno" | Low | keep id |
| Misiones `tag` vs schema | Low | keep `tag` in schema |
| en mirror route duplication | Low | follow `/en/` convention |
| Seed content placeholder | Low | Spanish, on-theme |

## Rollback Plan

Revert `Misiones.astro`/`NavBar.astro`; delete `src/content.config.ts`, `src/content/notes/`, both route dirs, new components + `src/lib/notes.*`; restore `openspec/config.yaml`. No DB/env/deploy.

## Dependencies

None external; vitest installed (`unit.available` flag stale).

## Success Criteria

- [ ] `/operativos-de-salud/` lists published notes date DESC; Terreno featured card opens its note.
- [ ] NavBar + eyebrow links reach the blog.
- [ ] `astro build` passes `/`, `/en/`, `/operativos-de-salud/`, `/en/operativos-de-salud/`.
- [ ] `pnpm test` green; no `process.env`/`import.meta.env`.
