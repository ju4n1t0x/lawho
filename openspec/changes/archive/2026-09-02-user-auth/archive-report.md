# Archive Report — user-auth

**Change**: user-auth
**Archived to**: `openspec/changes/archive/2026-09-02-user-auth/`
**Archived on**: 2026-09-07 (change work completed 2026-09-02)
**Artifact store**: openspec
**Branch at archive**: `feat/user-auth-unit-5-docs`

## Final State

At close, the change was fully implemented, verified, and complete:

- **Tasks**: 33/33 complete (no unchecked implementation tasks in the persisted `tasks.md`).
- **Verification**: `pass_with_warnings` — 71/71 requirements, 141/141 scenarios compliant; build green (`pnpm exec astro build`, exit 0) and 78/78 tests passing (`pnpm vitest run`, exit 0).
- **CRITICAL findings**: none.
- **Non-blocking warning (W1)**: `login` spec "LoginForm Server Island" wording says the form "MUST POST to the island's endpoint"; the implementation posts to `/escritor/` and the page frontmatter owns `checkPassword → createSession → cookie → redirect` because Astro server islands cannot receive form POSTs. Documented in design + apply-progress; all login scenarios pass at runtime. Noted per `verify-report` at verification time.

Verification evidence: `verify-report.md` (envelope `gentle-ai.verify-result/v1`, evidence_revision `sha256:168d335b2fd0f8916cf7cae538154ae44c1f058dc03bf73426af143930ee4966`).

## Specs Synced to Main (`openspec/specs/`)

| Domain | Action | Details |
|--------|--------|---------|
| blog-index | Updated | MODIFIED 6 requirements (Blog Index Route, Sort Order, Draft Exclusion, Page Header, NoteCard Rendering, English Mirror) — live collection + on-demand rendering |
| constitution-amendment | Updated | MODIFIED 2 requirements (Rule 1 Amendment: sanctioned deps list; Amendment Commit Ordering) |
| env-config | Updated | MODIFIED 1 (PostgreSQL Variable Declaration + runtime DSN consumption) and ADDED 4 (Session TTL, Uploads Directory, Public Uploads URL, Session Secret Reservation) |
| note-template | Updated | MODIFIED 8 requirements — live entry + on-demand detail, renderMarkdown body, image URL |
| notes-collection | Updated | MODIFIED 6 requirements; `Image Helper` renamed to `Image Field` (string URL, `image()` helper retired); glob → LiveLoader |
| db-connection | Created | NEW full spec (4 requirements) |
| deploy-nginx | Created | NEW full spec (5 requirements) |
| dev-environment | Created | NEW full spec (3 requirements) |
| image-upload | Created | NEW full spec (5 requirements) |
| login | Created | NEW full spec (7 requirements, incl. Writer Section Not Indexable) |
| password-hashing | Created | NEW full spec (4 requirements) |
| session | Created | NEW full spec (5 requirements) |
| users-auth | Created | NEW full spec (5 requirements) |
| writer-form | Created | NEW full spec (6 requirements) |

For MODIFIED deltas, delta-only `(Previously: ...)` transition notes were stripped from the main specs so the source-of-truth reflects current behavior only; the full delta content (including those notes) is preserved in this archive.

## Archive Contents

- exploration.md ✅
- proposal.md ✅
- design.md ✅
- specs/ — 14 delta specs ✅
- tasks.md ✅ (33/33 tasks complete)
- verify-report.md ✅
- apply-progress.md ✅
- archive-report.md (this file, additive)

## Archive Integrity

The change folder was moved mechanically with `git mv` (verified byte-identical via `diff -r` against a pre-move snapshot; empty diff). The 9 new main specs were copied mechanically (`cp` → `diff` → `mv`; empty diffs). No archived artifact passed through model Read/Write.

## Notes

- No destructive/unexpected removals were performed; merge required deleting the obsolete `notes-collection` "Image Helper" requirement block in favor of the delta's "Image Field" requirement (reflected the sanctioned `image()` helper retirement). Flagged here for traceability.
- Archive proceeded with `dependencies.archive: ready` / `nextRecommended: archive` per native `gentle-ai.sdd-status`; `actionContext.mode: repo-local`, edits stayed within `allowedEditRoots`.
