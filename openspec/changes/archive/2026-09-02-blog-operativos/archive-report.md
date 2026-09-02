# Archive Report: blog-operativos

**Change**: blog-operativos
**Archived**: 2026-09-02
**Verification contract**: `gentle-ai.verify-result/v1` (verify-report.md)
**Artifact store**: openspec

## Scope

Read-side of the "Operativos de Salud" blog: `notes` content collection (glob + zod schema + seed), helpers (`getPublishedNotes`, `formatNoteDate`), blog index + detail routes (es + en), shared `NoteCard`/`NoteTemplate` components, and integrations into the Misiones (Terreno) section and the NavBar.

## Final State (AT CLOSE)

Facts below reflect state at close, ranked per the Final-State Authority:
1. **tasks.md persisted artifact** — completion visibility authority.
2. Orchestrator launch prompt final-state facts.
3. `verify-report.md` / `apply-progress.md` (intermediate snapshots).

### Tasks
- **18/18 implementation tasks complete** in the persisted `tasks.md` (all `[x]`, Phases 1–6). Zero unchecked (`- [ ]`) at close. Task Completion Gate passed before any spec sync or archive move.
- Verify-report at verification time reported the same 18/18 per its Completeness table {verify-report.md, line 27–31}.

### Verification
- **PASS WITH WARNINGS, 0 CRITICAL, 0 blockers** (verify-report.md header: `verdict: pass_with_warnings`, `critical_findings: 0`, `requirements: 35/35`, `scenarios: 55/55`, test exit 0, build exit 0, 6 pages). No CRITICAL issue → no archive override was required.
- Build (astro build) and 13 unit tests (vitest) passed at verification time.

### Open at Close (NOT fixed — carried as-is)
1. **WARNING** — `formatNoteDate` test fixtures are timezone-fragile: the `es-AR`/`en-US` cases construct dates via `new Date(2024, 2, 15)` (local midnight) while the formatter uses `timeZone: "UTC"`; on a positive-UTC-offset host the local day lands a day earlier in UTC. No production impact; all tests pass on this host (UTC-3).
2. **SUGGESTIONS** (4) — (a) seed note image is byte-identical to `src/assets/territorio.jpg` (Vite dedupes to one shared asset); (b) stale `src/lib/notes.ts` comment still mentions `slug` (Astro 7.2 uses `entry.id`); (c) `openspec/config.yaml` `verify.test_command` is `""` while `projects[0].test_command: "vitest run"` is set; (d) `NoteTemplate.astro` types `Content` as `any`.

These were already recorded in the verification report. They are NOT claimed fixed; recommend follow-up.

## Delivery State

**No delivery from this change.** Implementation code lives on branch `feat/blog-operativos-unit-2` (feature-branch-chain: PR 1 → tracker `feat/blog-operativos`, PR 2 → unit-1 branch — PENDING, human-owned). The LANDING chain (`site-implementation`) is also still pending delivery. Nothing pushed/merged. This archive closes only the SDD cycle; repository delivery follows ordinary policy independently.

## Spec Sync to Main Specs

Source of truth `openspec/specs/` updated before archive move.

### Copied whole (main spec did not exist — 5 FULL specs, mechanical `cp` + `diff -r`):
| Domain | Action |
|--------|--------|
| notes-collection | Created `openspec/specs/notes-collection/spec.md` |
| blog-index | Created `openspec/specs/blog-index/spec.md` |
| note-template | Created `openspec/specs/note-template/spec.md` |
| note-card | Created `openspec/specs/note-card/spec.md` |
| notes-helpers | Created `openspec/specs/notes-helpers/spec.md` |

All five copies were verified byte-identical (empty `diff -r` between source and destination) per the Mechanical Copy Contract.

### Merged into existing main spec (DELTA specs — no REMOVED/RENAMED sections):
- **misiones** (`openspec/specs/misiones/spec.md`): 2 MODIFIED requirements (`Section Header`, `Three Mission Cards`) replaced in full, 1 ADDED requirement (`Section ID Preserved`) appended. Preserved `# Misiones Specification` header and Purpose.
- **navbar** (`openspec/specs/navbar/spec.md`): 2 MODIFIED requirements (`Section Links`, `Mobile Hamburger Drawer`) replaced in full. Unchanged requirements preserved in place: `Sticky Pill Navbar`, `Logo and Tagline`, `Doná CTA`.

**Merge verification** (grep spot-check, per merge rules — this is a merge, not a byte-copy):
- misiones: 3 requirements (Section Header, Three Mission Cards, Section ID Preserved); 9 scenarios. New behavior present (`/operativos-de-salud/`, `notes` collection `featured === true`), `id="misiones"` condition present. Only occurrence of the old-card text `verbatim content` is the intentional `(Previously:)` note in the merged MODIFIED block — no stale original requirement content remains.
- navbar: 5 requirements (3 unchanged preserved); 9 scenarios. Blog link and drawer-blog-link scenarios present; unchanged `Sticky Pill Navbar`, `Logo and Tagline`, `Doná CTA` intact.

No destructive delta (no REMOVED section) was present, so `config.yaml` rule `archive: Warn before merging destructive deltas` did not require confirmation.

## Archive Move

- Source `openspec/changes/blog-operativos/` → `openspec/changes/archive/2026-09-02-blog-operativos/`.
- All change-folder files were UNTRACKED (0 `git ls-files` matches), so `git mv` failed (status 128) and the plain `mv` fallback was used after a source-unchanged readback (empty `diff -r` of snapshot vs source).
- Final readback: `diff -r` (pre-move recursive snapshot vs archived destination) → **EMPTY (byte-identical)**. Only additive file since the readback is `archive-report.md`, which did not exist in the source snapshot and is excluded by design.
- Active `openspec/changes/` no longer contains `blog-operativos`; it now holds only `archive/`.

## Archive Contents

- proposal.md ✅
- specs/ (7 domains: blog-index, misiones, navbar, note-card, note-template, notes-collection, notes-helpers) ✅
- design.md ✅
- tasks.md ✅ (18/18 tasks complete)
- verify-report.md ✅
- apply-progress.md ✅
- exploration.md ✅
- archive-report.md (this file, additive)

## Verdict / Behavior

Archive completed normally with no intentional override or partial-archive exception. The change is a complete, verified, read-side feature whose SDD lifecycle is closed. No conflicts or contradictions were recorded; the launch-prompt final-state facts, the persisted tasks artifact, and verify-report all agree.