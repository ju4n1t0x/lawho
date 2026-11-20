# Archive Report: Note Image Edit

**Change**: note-image-edit
**Archived to**: `openspec/changes/archive/2026-09-10-note-image-edit/`
**Archive date**: 2026-09-10
**Artifact store**: openspec

## Final State (at close)

- **Delivery**: Change DELIVERED and committed to `dev`; `origin/dev` updated. Commit `d75eeeb` — *feat(notes): writers can replace a note image (jpg/png, <=5mb) with server-side optimization*. Delivery accepted as `size:exception` (single-pr strategy, ~460 lines).
- **Verification**: `sdd-verify` verdict `pass_with_warnings` — 7/7 requirements, 25/25 scenarios. 19 scenarios runtime-tested; 6 maintainer-accepted manual/source verification (project declares `integration: false` / `e2e: false`, no UI/component runtime harness). `pnpm test` 114/114; `pnpm build` exit 0.
- **CRITICAL issues**: None.
- **Implementation facts**: Image replace/retain on edit via pure `resolveNoteImageReplacement`; create requires image ("La imagen es obligatoria"); no remove affordance; uploads narrowed to JPG/PNG ≤5MB; sharp server-side optimization (`image-optimize.ts`, format-preserving, EXIF strip, 2400px cap, OOM guard >8000); `updateNote` persists `image_url` conditionally (test guard reversed); old file unlinked after DB success.

> Per the Final-State Authority hierarchy, the launch prompt (`d75eeeb` delivery + verify `pass_with_warnings`) outranks the intermediate `apply-progress` (which still reported "22/25 tasks complete ... Phase 7 (commits) remains" as of apply time) and `verify-report` (which deferred Phase 7 to delivery). The change is delivered and closed; those intermediate pending claims are historical, not current.

## Verification record (as archived — kept as-is)

`verify-report.md` was preserved verbatim. It already reflects final state: `blockers: 0`, `critical_findings: 0`, `requirements: 7/7`, `scenarios: 25/25`, test exit 0, build exit 0. Its deferred Phase 7 note ("Orchestrator must gate archive on delivery commits") is satisfied by the delivery commit `d75eeeb` now on `origin/dev`.

## Stale-planning reconciliation (recorded)

Two Phase 7 tasks in `tasks.md` were unchecked at archive time. They are **delivery/archive process tasks, not implementation tasks** (all implementation tasks, Phases 1–6 and Phase 8, were `[x]`). The orchestrator explicitly instructed archive-time stale-planning reconciliation. Both were reconciled to `[x]` with evidence:

- **7.1** (work-unit commits): delivered instead as a single commit `d75eeeb` under the maintainer-approved `size:exception` (single-pr) strategy, which superseded the work-unit split. Evidence: git commit `d75eeeb` on `dev` == `origin/dev`.
- **7.2** (canonical specs synced at archive): completed by this `sdd-archive` run on 2026-09-10.

The archive audit trail therefore does not contain stale unchecked tasks for completed work. No conflict with any higher-ranked source.

## Specs synced to canonical source of truth

| Domain | Action | Details |
|--------|--------|---------|
| `image-upload` | Updated | MODIFIED `Magic-Byte MIME Sniff` (JPG/PNG only, WebP dropped); ADDED `Server-Side Optimization` (5 scenarios) + `Image Replacement on Edit` (3 scenarios). Preserved: Filesystem Storage, Size Cap, Sanitized Filenames, Public URL in DB. |
| `writer-form` | Updated | MODIFIED `WriterForm Server Island` (multipart both modes, file input, required-in-create, JPG/PNG), `Server-Side Validation` (create image required; update skip-if-absent), `Publish to Database` (`updateNote` includes `imageUrl`), `Image Attachment` (no remove affordance, never imageless). Preserved: Writer Page Route, In-Island Session Check. |

Canonical specs updated: `openspec/specs/image-upload/spec.md`, `openspec/specs/writer-form/spec.md`. The archived delta specs remain untouched as the record of the change.

## Archive move verification

- Change folder moved via `git mv` → `openspec/changes/archive/2026-09-10-note-image-edit/`.
- MANDATORY `diff -r` readback of the pre-move recursive snapshot vs the archived destination: **empty output, exit 0** — byte-identity confirmed.
- Active `openspec/changes/` no longer contains this change.

## Artifacts read during archive

- `openspec/changes/note-image-edit/apply-progress.md`, `proposal.md`, `design.md`, `exploration.md`, `tasks.md`, `verify-report.md`
- `openspec/changes/note-image-edit/specs/image-upload/spec.md`, `specs/writer-form/spec.md`
- Canonical: `openspec/specs/image-upload/spec.md`, `openspec/specs/writer-form/spec.md`

## Constraints respected

- No source files (`src/**`, `package.json`) modified.
- The stray unrelated `src/components/NavBar.astro` working-tree modification was NOT touched (flagged in verify-report; left for the orchestrator).
- No commit/push performed — the orchestrator owns the archive commit.

## Risks / outstanding

- The 6 source-verified scenarios remain unverified at runtime (no UI/component harness). Tracked as a SUGGESTION in verify-report for promotion when a component/endpoint test harness exists.
- `NavBar.astro` stray change remains in the working tree; must be staged/handled separately to avoid contaminating the archive commit.

## Verdict

Change `note-image-edit` archived. SDD cycle complete: planned, implemented (`d75eeeb`), verified (`pass_with_warnings`), and archived.