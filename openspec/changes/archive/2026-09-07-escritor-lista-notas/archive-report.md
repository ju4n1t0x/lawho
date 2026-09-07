# Archive Report: Writer Dashboard — Note List, Edit & Soft Delete

**Change**: escritor-lista-notas
**Archived**: 2026-09-07
**Branch**: `feat/escritor-lista-notas-pr3` (PR3 tip; full change = PR1+PR2+PR3 feature-branch chain, merged)
**Artifact store**: openspec

## Summary

Implemented the writer note-list dashboard at `/escritor` (read-only), a horizontal card component (`WriterNoteCard`), edit/delete routes (`/escritor/editar/[slug]`, `/escritor/eliminar/[slug]`), a soft-delete data layer (`deleted_at` column + partial index + `listAllNotesIncludingDrafts`/`updateNote`/`softDeleteNote`), and the login redirect from `/escritor/nueva` to the dashboard at `/escritor/`. Public-blog exclusion from soft-deleted notes lives entirely in repo SQL (`deleted_at IS NULL` in `listPublishedNotes`/`getNoteBySlug`).

## Final-State Facts (at archive)

- **Verification**: `pass_with_warnings` — **18/18 requirements, 48/48 scenarios** satisfied. 95/95 unit tests pass (`pnpm vitest run`, exit 0); `pnpm exec astro build` passes (exit 0). Migration `003-soft-delete-notes.sql` confirmed applied in live DB (`deleted_at` TIMESTAMPTZ nullable column; `notes_active_idx` partial index present). No CRITICAL findings. Source: `verify-report.md` authored at verification time.
- **Tasks**: 17/17 checked `[x]` in the persisted `tasks.md`. Task 4.4 (manual visual check) was reconciled in commit `2fc23ae` as mechanical verification via build+routes; the final human visual check is user-owned. This was already reconciled in the verification report and no stale unchecked tasks remain.
- **Warnings (2)** — non-blocking, consistent with the project's declared unit-only verification model:
  1. No e2e/integration or Astro component test layer exists (`openspec/config.yaml` declares `e2e: false`, `integration: false`); page/component render scenarios are verified by `astro build` compilation + source inspection only.
  2. `login` "DB unavailable" scenario has no `try/catch` around `checkPassword` in `index.astro` (`src/pages/escritor/index.astro:27`); a PostgreSQL failure surfaces as a 500. Pre-existing behavior (POST lived in `index.astro` before this change); the change only altered the redirect target.
- **Suggestions (2)**: make "ordered newest first" ordering coverage explicit with a `stringContaining("ORDER BY date DESC")` assertion; resolve or drop the draft badge ("Borrador") design question in a follow-up.
- **No lingering blockers or remediation state**: `remediationState.required: false`.

## Specs Synced to Main Specs

| Domain | Action | Notes |
|--------|--------|-------|
| `writer-dashboard` | NEW spec created | `openspec/specs/writer-dashboard/spec.md` — full spec (6 requirements / 12 scenarios); mechanical `cp` + empty `diff` readback |
| `notes-collection` | MODIFIED merged | Appended 4 ADDED requirements (List All Notes Including Drafts, Update Note, Soft Delete Note, Migration 003) and merged 2 MODIFIED requirements (List Published Notes, Get Note By Slug). Preserved the 6 pre-existing requirements unchanged. |
| `writer-form` | MODIFIED merged | Replaced 3 MODIFIED requirements (WriterForm Server Island, Server-Side Validation, Publish to Database) with full updated blocks including unchanged scenarios; preserved Writer Page Route, In-Island Session Check, Image Attachment. |
| `login` | MODIFIED merged | Replaced 3 MODIFIED requirements (Login Page Route, Login Submission, Unauthenticated Redirect) with full updated blocks; preserved LoginForm Server Island, In-Island Session Check, Logout Route, Writer Section Not Indexable. |

## Archive Contents

The change folder was moved with `git mv` (11 files tracked) to:
`openspec/changes/archive/2026-09-07-escritor-lista-notas/`

- `proposal.md`
- `design.md`
- `exploration.md`
- `apply-progress.md`
- `tasks.md` (17/17 complete, no stale unchecked tasks)
- `verify-report.md`
- `specs/login/spec.md`
- `specs/notes-collection/spec.md`
- `specs/writer-dashboard/spec.md`
- `specs/writer-form/spec.md`
- `.gentle-ai-instance`

## Mechanical Copy Evidence

A recursive pre-move snapshot was taken of `openspec/changes/escritor-lista-notas/`, the folder moved via `git mv`, and the archived tree compared against the snapshot with `diff -r`. Result: **empty diff (no differences) — byte-identity confirmed**. This `archive-report.md` is additive-only and excluded from the comparison (it did not exist in the source snapshot).

The active changes directory no longer contains `escritor-lista-notas`; only `archive/` remains.

## Verification Report Observations Read

- `verify-report.md` at `openspec/changes/escritor-lista-notas/verify-report.md` (authoritative for verification pass + counts)
- `tasks.md` at change root (authoritative for task completion — 17/17)
- `apply-progress.md` (intermediate snapshot — PR2-focused; used only for context)

## Notes

- No source code was modified during archive; only `openspec/` artifacts were touched.
- Archive is an audit trail — archived change not modified or deleted.