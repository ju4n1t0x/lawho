# Archive Report: site-implementation

**Schema**: gentle-ai.sdd-archive/v1
**Change**: site-implementation
**Archived**: 2026-09-02
**Archived to**: `openspec/changes/archive/2026-09-02-site-implementation/`
**Artifact store**: openspec
**Mode**: openspec (filesystem)

## Purpose

Terminal record of the `site-implementation` SDD cycle **at close**. Describes the state
of the change as it was archived, not at earlier intermediate points. Where a fact below
reflects state that changed after an intermediate snapshot (`apply-progress`,
`verify-report`) was written, it is attributed to the higher-ranked source (persisted
tasks artifact, orchestrator launch-prompt final-state facts, or repository evidence) and
the stale snapshot claim is not echoed as current.

## Status At Close

- **Task Completion Gate**: PASS. `tasks.md` shows **26/26 implementation tasks checked
  `[x]`**, 0 unchecked `[ ]`. Applied before any spec sync or archive move.
- **Verification**: **PASS WITH WARNINGS**, **0 CRITICAL**. Per
  `verify-report.md` (`gentle-ai.verify-result/v1`, evidence_revision
  `sha256:5699f56cc1b79c4c764a0634d57415faa4bdc4462dd93387647a3c4195dfe8ca`):
  blockers 0, critical_findings 0, requirements **59/59**, scenarios **70/70**;
  test exit 0 (5 vitest tests in `src/lib/anim.ts`), build exit 0 (astro build).
- **No CRITICAL issues** → archive proceeded normally (no override required).
- **No unchecked implementation tasks** → no stale-checkbox reconciliation needed.

## Constitution Amendment (DONE at close)

`docs/constitution.md` rule 1 was amended to permit TailwindCSS v4 (Tailwind exception).
This was an in-change task (tasks.md 1.1) and is **complete at close**. Git ordering
evidence (`verify-report` scenario 3): commit `cf5a30b` (amendment) precedes the
dependency-install commit `f98c381`.

## Open Warnings Still True At Close (do NOT read as fixed)

The following advisory findings from `verify-report.md` remain true at close and are
recorded so a future reader does not mistake them for resolved:

1. **10 of 70 scenarios** are browser-behavior wiring (intersection-observer / rAF firing,
   marquee motion, drawer open/close) verified by **source inspection only** — their
   observable runtime behavior was not executed in a live browser. **Pending maintainer
   live-browser QA**.
2. **Pixel-perfect visual parity** against the reference is not automatable here and was
   not runtime-verified. **Pending maintainer live-browser QA**.
3. Automated per-scenario coverage is limited to `src/lib/anim.ts` (**5 vitest tests**);
   the remaining scenarios are verified via build output + source inspection (declared
   Standard-mode strategy, `strict_tdd: false`).

None of the above blocks archive (all WARNING, none CRITICAL). They are flagged as
human-owned QA follow-up, not closed.

## Actions Performed

### Spec Sync (16 new main spec files)

All **16 delta specs** had **no existing main spec** (`openspec/specs/{domain}/spec.md`
did not exist), so each delta (a full spec, not a delta-of-delta) was copied mechanically
via the mandatory shell block (`cp` → `diff -r` → `mv`). Every `diff -r` was empty. No
destructive merge was performed; `config.yaml` `rules.archive` ("Warn before merging
destructive deltas") required no warning because no merge destroyed existing content.

| Domain | Action | Requirements |
|--------|--------|--------------|
| constitution-amendment | Created | 2 |
| countup-animation | Created | 5 |
| design-tokens | Created | 5 |
| donar | Created | 4 |
| footer | Created | 4 |
| hero | Created | 4 |
| historia | Created | 4 |
| i18n-setup | Created | 3 |
| impacto | Created | 4 |
| infancias | Created | 3 |
| layout-template | Created | 6 |
| marquee | Created | 3 |
| misiones | Created | 3 |
| navbar | Created | 5 |
| reveal-animation | Created | 4 |
| voluntariado | Created | 3 |

Requirement counts are per-domain headings; global measured totals are 59 requirements /
70 scenarios (per `verify-report`).

The pre-existing `env-config` main spec (`openspec/specs/env-config/`) is unrelated to
this change and was left untouched.

### Archive Move

Mechanical move `openspec/changes/site-implementation/` →
`openspec/changes/archive/2026-09-02-site-implementation/` via the mandatory snapshot
block. `git mv` failed (the change directory mixes 1 tracked file `tasks.md` with
untracked files), so the guarded plain `mv` fallback applied after verifying the source
was still present and byte-identical to the pre-move snapshot. The `diff -r` readback
(snapshot vs destination) was **empty**. The `archive-report.md` is additive and excluded
from the comparison (it did not exist in the source snapshot).

## Delivery State

**No delivery from this change at close.** The implementation lives on branch
`feat/site-implementation-unit-3` (feature-branch-chain U1/U2/U3 commits; PRs #1→tracker,
#2→U1, #3→U2 **pending — human-owned**). Nothing was pushed, no PRs were opened, and no
merge to main occurred. The code itself is the deliverable; delivery is human-owned under
ordinary repository policy and is NOT part of the SDD cycle close.

## Verification Checks

- [x] Main specs updated correctly (16 created, empty `diff -r` each)
- [x] Change folder moved to archive (empty `diff -r`, snapshot vs destination)
- [x] Archive contains all artifacts (proposal.md, specs/ ×16, design.md, tasks.md,
      verify-report.md, apply-progress.md, exploration.md)
- [x] Archived `tasks.md` has no unchecked implementation tasks (0 `- [ ]`, 26 `[x]`)
- [x] Active changes directory no longer has this change

## Source of Truth

The following `openspec/specs/{domain}/spec.md` now reflect the implemented behavior:
constitution-amendment, countup-animation, design-tokens, donar, footer, hero, historia,
i18n-setup, impacto, infancias, layout-template, marquee, misiones, navbar,
reveal-animation, voluntariado.