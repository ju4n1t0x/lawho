# Proposal: Writer Dashboard — Note List, Edit & Soft Delete

## Intent

Rework `/escritor` (read-only) so a logged-in writer lands on a note-list dashboard (horizontal cards: image left, tag, title, subtitle) with a green "+ Crear nota" top button and per-card "Editar" (yellow) / "Eliminar" (red). Today `/escritor` (read-only) always redirects to `/escritor/nueva` (read-only) after login — no list, edit, or delete exists.

## Scope

### In Scope
- Conditional dashboard at `/escritor` (read-only) (login form when unauthenticated, list when `Astro.locals.user` present)
- Horizontal card list component (`WriterNoteCard`) + "+ Crear nota" top button
- Repo functions `listAllNotesIncludingDrafts`, `updateNote`, `softDeleteNote`
- Migration `migrations/003-soft-delete-notes.sql` (`deleted_at TIMESTAMPTZ NULL` + partial index)
- `/escritor/editar/[slug]` (read-only) page (preloads `WriterForm` in update mode)
- `/escritor/eliminar/[slug]` (read-only) POST endpoint (soft delete)
- `deleted_at IS NULL` filtering in `listPublishedNotes` + `getNoteBySlug`

### Out of Scope
- Per-author authorization (any logged-in writer manages ALL notes)
- Pagination (newest first, show all non-deleted)
- Hard delete / orphan image cleanup (existing gap, unchanged)
- Role system

## Capabilities

### New Capabilities
- `writer-dashboard`: note-list dashboard at `/escritor` (read-only), `WriterNoteCard`, "+ Crear nota" button, edit page `/escritor/editar/[slug]` (read-only), delete endpoint `/escritor/eliminar/[slug]` (read-only).

### Modified Capabilities
- `notes-collection`: add `listAllNotesIncludingDrafts`, `updateNote`, `softDeleteNote`; `deleted_at IS NULL` in `listPublishedNotes`/`getNoteBySlug`; migration `003`.
- `writer-form`: add `mode: 'create' | 'update'` with preloaded values and `action` switch.
- `login`: `/escritor/` (read-only) becomes conditional (dashboard vs login form).

## Approach

**A1 (recommended)**: Conditional dashboard page + dedicated edit/delete pages + repo/SQL soft-delete. Reuses `WriterForm` verbatim; plain forms POST to page endpoints (server islands cannot receive POSTs). Rejected: B pure server-island dashboard (violates POST constraint); C inline modal (re-implements WriterForm).

- Colors: green `bg-leaf`, yellow `bg-sun`, red `bg-accent`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/pages/escritor/index.astro` | Modified | Conditional dashboard vs login |
| `src/pages/escritor/editar/[slug].astro` | New | Preloaded WriterForm update |
| `src/pages/escritor/eliminar/[slug].ts` | New | Soft-delete POST endpoint |
| `src/components/WriterNoteCard.astro` | New | Horizontal dashboard card |
| `src/components/server-islands/WriterForm.astro` | Modified | `mode` update + preload |
| `src/lib/notes-repo.ts` | Modified | 3 new functions + deleted_at filters |
| `migrations/003-soft-delete-notes.sql` | New | `deleted_at` column + index |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Migration deploy order (column missing) | Med | Run migration before code deploy |
| Orphan image on edit | Low | Keep image read-only on edit in v1 |
| Slug immutability | Low | `updateNote` never changes slug |
| No per-author authz | Med | Flag in design; role check later |

## Rollback Plan

Revert code commit; `DROP INDEX notes_active_idx; ALTER TABLE notes DROP COLUMN deleted_at;`. Soft-delete is non-destructive.

## Dependencies

- Migration `003` must run before deploy.

## Success Criteria

- [ ] Logged-in writer sees note list at `/escritor` (read-only); logged-out sees login form
- [ ] `updateNote` edits without changing slug
- [ ] `softDeleteNote` excludes note from writer list AND public blog
- [ ] `pnpm test` passes (new repo-function tests)

## Open Questions

- Slug immutability on edit — never change (resolved)
- Image on edit — v1 read-only (resolved)
- Delete confirmation — `onsubmit confirm()` (no client JS)
- List shows only non-deleted — yes
