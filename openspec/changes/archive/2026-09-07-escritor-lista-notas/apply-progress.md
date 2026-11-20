# Apply Progress: Writer Dashboard — Edit/Delete (PR2)

## PR2 Scope (feature-branch-chain, PR #2 of 3)

**Branch**: `feat/escritor-lista-notas-pr2` (base: `feat/escritor-lista-notas-pr1`)
**Mode**: Standard (strict_tdd: false)

## Completed Tasks

### PR1 (from prior batch)
- [x] 1.1 Create `migrations/003-soft-delete-notes.sql`
- [x] 1.2 Apply migration to live DB
- [x] 1.3 Add `NoteUpdate` interface to `notes-repo.ts`
- [x] 1.4 Add `listAllNotesIncludingDrafts()` function
- [x] 1.5 Add `updateNote(slug, fields)` function
- [x] 1.6 Add `softDeleteNote(slug)` function
- [x] 1.7 Add `deleted_at IS NULL` to `listPublishedNotes` and `getNoteBySlug`
- [x] 4.1 Extend unit tests for all new/modified functions
- [x] 4.2 Run `vitest run` — 95/95 tests pass
- [x] 4.3 Run `astro build` — exit 0

### PR2 (current batch)
- [x] 2.1 WriterForm `mode` prop (`'create'|'update'`), preloaded values, action switch, image read-only in update
- [x] 2.2 Edit page `/escritor/editar/[slug]` — prerender=false, session-guarded, loads note, renders WriterForm in update mode, 404 on missing/soft-deleted
- [x] 2.3 Delete endpoint `/escritor/eliminar/[slug]` — POST-only (405 on GET), session-guarded by middleware, calls `softDeleteNote`, redirects to `/escritor/`

## Files Changed (PR2 only)

| File | Action | Description |
|------|--------|-------------|
| `src/components/server-islands/WriterForm.astro` | Modified | Added `mode` prop (`'create'|'update'`), `imageUrl` prop, conditional heading/action/enctype/image field/button text |
| `src/pages/escritor/editar/[slug].astro` | Created | Edit page: loads note by slug, renders WriterForm in update mode with preloaded values, POST handler calls `updateNote`, 404 on missing |
| `src/pages/escritor/eliminar/[slug].ts` | Created | Delete endpoint: POST-only (405 on GET), calls `softDeleteNote`, redirects to `/escritor/` |

## Work Unit Evidence (PR2)

| Evidence | Value |
|----------|-------|
| Focused test command | `pnpm vitest run` → 95/95 pass (exit 0) |
| Runtime harness | `pnpm exec astro build` → exit 0 (server built, prerendering static routes complete) |
| Rollback boundary | Revert PR2: delete `editar/[slug].astro`, delete `eliminar/[slug].ts`, revert `WriterForm.astro` to create-only mode. PR1 data layer remains intact. |

## Deviations from Design

None — implementation matches design exactly.

## Issues Found

None.

## Remaining Tasks (PR3)

- [ ] 3.1 Dashboard at `/escritor` (conditional login vs list)
- [ ] 3.2 WriterNoteCard component
- [ ] 3.3 LoginForm redirect change

## PR Boundary

- Mode: chained PR slice (feature-branch-chain)
- Current work unit: PR2 — Edit/Delete routes + WriterForm update mode
- Boundary: `WriterForm.astro` modifications + `editar/[slug].astro` + `eliminar/[slug].ts` only
- Estimated review budget impact: ~120 changed lines (within 400-line budget)
