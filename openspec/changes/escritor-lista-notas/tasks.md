# Tasks: Writer Dashboard — Note List, Edit & Soft Delete

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 420–520 |
| 400-line budget risk | High |
| Session budget (200) risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 (feature-branch-chain) |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units (Chain: PR #1 base = `dev` tracker branch `feat/escritor-lista-notas`; PR #2 base = PR#1 branch; PR #3 base = PR#2 branch)

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Migration + notes-repo layer (listAllIncludingDrafts, updateNote, softDeleteNote, `deleted_at IS NULL` filters) + unit tests | PR 1 | `vitest run src/lib/notes-repo.test.ts` | `psql` migration 003 then shutdown/restart no visible behavior change; dashboard unaffected | Revert PR1: `DROP INDEX IF EXISTS notes_active_idx; ALTER TABLE notes DROP COLUMN IF EXISTS deleted_at;` |
| 2 | WriterForm `mode` + edit page + delete endpoint | PR 2 | `vitest run src/lib/notes-repo.test.ts` (update/softDelete) | `astro dev` POST `/escritor/editar/[slug]` (read-only) + `/escritor/eliminar/[slug]` (read-only) after manual login | Revert PR2: no new pages/routes reachable, create-only flow intact |
| 3 | Dashboard page + WriterNoteCard + login redirect → `/escritor/` (read-only) | PR 3 | `vitest run` (repo + login) | `astro dev` GET `/escritor/` (read-only) authed: list + cards render | Revert PR3: index.astro falls back to login form only |

## Phase 1: Foundation — Migration & Data Layer

- [x] 1.1 Create `migrations/003-soft-delete-notes.sql`: `ALTER TABLE notes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL` + `CREATE INDEX IF NOT EXISTS notes_active_idx ON notes(id) WHERE deleted_at IS NULL` (idempotent)
- [x] 1.2 Apply `migrations/003-soft-delete-notes.sql` to the live DB
- [x] 1.3 In `src/lib/notes-repo.ts` add `NoteUpdate {title,subtitle,body,tag?}` (no slug, no image)
- [x] 1.4 In `src/lib/notes-repo.ts` add `listAllNotesIncludingDrafts()`: `WHERE deleted_at IS NULL ORDER BY date DESC, id DESC`
- [x] 1.5 In `src/lib/notes-repo.ts` add `updateNote(slug,f)`: SET title/subtitle/body/tag, `updated_at=now()`, `WHERE slug=$1 AND deleted_at IS NULL`, RETURNING note or null
- [x] 1.6 In `src/lib/notes-repo.ts` add `softDeleteNote(slug)`: `UPDATE notes SET deleted_at=now() WHERE slug=$1 AND deleted_at IS NULL` → boolean
- [x] 1.7 In `src/lib/notes-repo.ts` add `AND deleted_at IS NULL` to `listPublishedNotes` and `getNoteBySlug`

## Phase 2: Core — WriterForm Modes + Edit/Delete Routes

- [x] 2.1 In `src/components/server-islands/WriterForm.astro` add `mode: 'create'|'update'` prop (default create), preloaded values, action switch, skip image validation/input in update, show existing thumbnail read-only
- [x] 2.2 Create `src/pages/escritor/editar/[slug].astro` (prerender=false): session-guarded, load note, render `WriterForm mode="update"` preloaded; 404/Spanish not-found if missing or soft-deleted
- [x] 2.3 Create `src/pages/escritor/eliminar/[slug].ts`: POST-only, session-guarded, call `softDeleteNote`, redirect `/escritor/` (read-only)

## Phase 3: Integration — Dashboard + Card + Login Redirect

- [x] 3.1 Modify `src/pages/escritor/index.astro` (prerender=false): conditional login form vs dashboard (list `listAllNotesIncludingDrafts()` + green `bg-leaf` "+ Crear nota" → `/escritor/nueva` (read-only))
- [x] 3.2 Create `src/components/WriterNoteCard.astro`: horizontal card (image left, tag/title/subtitle), yellow Editar → `/escritor/editar/[slug]` (read-only), red Eliminar form POST → `/escritor/eliminar/[slug]` (read-only) with onsubmit confirm
- [x] 3.3 Modify `src/components/server-islands/LoginForm.astro`: successful-login redirect from `/escritor/nueva` (read-only) to `/escritor/` (read-only)

## Phase 4: Verification

- [x] 4.1 Extend `src/lib/notes-repo.test.ts`: assert SQL + params/filters for all 4 new/modified functions (incl. slug/image immutability, soft-delete exclusion)
- [x] 4.2 Run `vitest run` green
- [x] 4.3 Run `astro build` green
- [ ] 4.4 Manual: authed `/escritor/` (read-only) renders list + cards, delete confirm, edit preloads, public blog excludes soft-deleted