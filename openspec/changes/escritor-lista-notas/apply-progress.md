# Apply Progress: Writer Dashboard — PR1 Data Layer

## PR1 Scope (feature-branch-chain, PR #1 of 3)

**Branch**: `feat/escritor-lista-notas-pr1` (base: `dev`)
**Mode**: Standard (strict_tdd: false)

## Completed Tasks

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

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `migrations/003-soft-delete-notes.sql` | Created | `deleted_at TIMESTAMPTZ NULL` + `notes_active_idx` partial index |
| `src/lib/notes-repo.ts` | Modified | Added `NoteUpdate`, `listAllNotesIncludingDrafts`, `updateNote`, `softDeleteNote`; added `deleted_at IS NULL` to `listPublishedNotes` and `getNoteBySlug` |
| `src/lib/notes-repo.test.ts` | Modified | Added tests for 3 new functions + `deleted_at IS NULL` assertions on existing functions |

## Work Unit Evidence

| Evidence | Value |
|----------|-------|
| Focused test command | `pnpm vitest run src/lib/notes-repo.test.ts` → 14/14 pass |
| Runtime harness | `psql` migration applied: `ALTER TABLE` + `CREATE INDEX` confirmed in `information_schema` and `pg_indexes`. Build: `pnpm exec astro build` → exit 0 |
| Rollback boundary | `DROP INDEX IF EXISTS notes_active_idx; ALTER TABLE notes DROP COLUMN IF EXISTS deleted_at;` + revert `notes-repo.ts` + revert `notes-repo.test.ts` |

## Deviations from Design

None — implementation matches design exactly.

## Issues Found

None.

## Remaining Tasks (PR2 + PR3)

- [ ] 2.1 WriterForm `mode` prop
- [ ] 2.2 Edit page `/escritor/editar/[slug]`
- [ ] 2.3 Delete endpoint `/escritor/eliminar/[slug]`
- [ ] 3.1 Dashboard at `/escritor`
- [ ] 3.2 WriterNoteCard component
- [ ] 3.3 LoginForm redirect change

## PR Boundary

- Mode: chained PR slice (feature-branch-chain)
- Current work unit: PR1 — Data layer (migration + repo + tests)
- Boundary: `migrations/003` + `notes-repo.ts` + `notes-repo.test.ts` only
- Estimated review budget impact: ~80 changed lines (well within 400-line budget)
