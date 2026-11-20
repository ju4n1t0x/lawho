# Archive Report: astro-image-refactor

- **Change**: astro-image-refactor
- **Archived**: 2026-09-10
- **Archive location**: `openspec/changes/archive/2026-09-10-astro-image-refactor/`
- **Artifact store mode**: openspec
- **Status**: ARCHIVED — SDD cycle complete

## Final State (at close)

The change is COMPLETE and delivered. Per the archival Final-State Authority hierarchy, the facts below reflect the state of the change AT CLOSE; earlier snapshots (`apply-progress.md`, `verify-report.md`) are intermediate records and are superseded where they disagree with git history and this report.

### Delivery

4 atomic commits pushed to `origin/dev` (verified in `git log origin/dev`):

| Commit | Scope |
|--------|-------|
| `7434ed0` | feat(assets): swap static landing images to avif |
| `0cb2ee8` | style(brand): adopt new favicon as navbar/footer logo and design polish |
| `6fb59d8` | docs(sdd): amend constitution rule 1 to permit sharp |
| `ce31ddd` | refactor(images): migrate static `<img>` to Astro `<Image>` in hero/historia/infancias/donar |

Commit ordering satisfies the `Amendment Commit Ordering` requirement: `6fb59d8` (amendment, touches only `docs/constitution.md`) precedes `ce31ddd` (touches `package.json` + `pnpm-lock.yaml`).

### Verification (final)

- Verdict: **PASS** — per `verify-report.md` `{verdict: pass, critical_findings: 0, blockers: 0}`.
- Requirements: **11/11**; Scenarios: **25/25** compliant.
- `pnpm build` exit 0 — 7 optimized `.webp` assets emitted via sharp in `dist/client/_astro/`.
- `pnpm test` (`vitest run`) — 95/95 passed, 12 files.

### Implementation (final)

- 7 static images migrated to `<Image>` from `astro:assets` in `src/components/{Hero,Historia,Infancias,Donar}.astro` (Hero 1 eager + Historia 1 lazy + Infancias 4 lazy + Donar 1 lazy).
- `sharp` `^0.35.4` added as explicit direct project dependency in `package.json` — required because pnpm's strict node_modules does not expose astro's optional sharp dependency to the emitted prerender bundle.
- `docs/constitution.md` rule 1 amended to list `sharp` (native image engine required by `astro:assets`/`<Image>` build pipeline).
- Spec-drift corrected: real assets are `ninos-esperanza.avif`, `como-trabajamos.avif`, `que-hacemos{,-1,-2,-3}.avif`, `hero-manos.jpg`.
- Out-of-scope images untouched: NavBar/Footer favicons and NoteCard/NoteTemplate/WriterNoteCard/WriterForm remain raw `<img>`/`<link>`.
- Donar gradient overlay `<div>` renders AFTER the `<Image>` in DOM (z-order preserved).

## Task Completion Gate Reconciliation

- `tasks.md` task 3.1 ("One atomic commit to `dev`") was unchecked in the persisted artifact. This was a **stale checkbox**: the task was provably complete via git evidence (`ce31ddd`, matching the task's commit message text, exists on `origin/dev`), `apply-progress.md` recorded it as outside apply scope ("repo workflow step"), and `verify-report.md` documented it as stale. The orchestrator's launch prompt explicitly instructed the reconcile as part of the final-state handoff.
- Exception applied per the Task Completion Gate (orchestrator explicit instruction + apply-progress/verify-proof): `tasks.md` 3.1 marked `[x]` at archive time.
- **Result**: archived `tasks.md` contains **zero** unchecked tasks. 11/11 tasks complete.

## Spec Sync (deltas → canonical specs)

Delta specs under `specs/{hero,historia,infancias,donar,constitution-amendment}` merged into `openspec/specs/**` BEFORE the archive move. No REMOVED or RENAMED requirements; only MODIFIED replacements + ADDED requirements.

| Domain | Action | Details |
|--------|--------|---------|
| hero | Updated | MODIFIED `Hero Photo with Floating Badges` (ninos-esperanza.avif, `<Image>`, 1408x1008); ADDED `Static Image Rendering via Astro Image` (3 scenarios: optimized assets, favicons/runtime unaffected, sharp direct dep) |
| historia | Updated | MODIFIED `Territory Photo` (como-trabajamos.avif, `<Image>`, 1600x912); ADDED `Static Image Rendering via Astro Image` (2 scenarios: optimized assets, sharp direct dep) |
| infancias | Updated | MODIFIED `Abuela Photo` (que-hacemos.avif, `<Image>`, 1200x1504); MODIFIED `Three Datos Cards` (que-hacemos-1/2/3.avif, `<Image>`, 600x600); ADDED `Static Image Rendering via Astro Image` (2 scenarios) |
| donar | Updated | MODIFIED `Background Photo and Overlay` (hero-manos.jpg via `<Image>`, 1600x1000, overlay above); ADDED `Static Image Rendering via Astro Image` (3 scenarios incl. gradient z-order, sharp direct dep) |
| constitution-amendment | Updated | Purpose extended (TailwindCSS v4 **and** sharp); ADDED `Rule 1 Amendment (sharp)` (4 scenarios); `Amendment Commit Ordering` **preserved as superset** — the delta re-stated this requirement by name with a narrower guard (package.json only); the canonical requirement (guards package.json, astro.config.mjs, global.css, db.ts, password.ts) strictly subsumes it, so no duplicate requirement was added and no wider guarantee was regressed |

Merge notes:

- Canonical specs carry FINAL state only. The delta `(Previously: ...)` drift notes are change-narrative and were NOT merged into the canonical specs (they were the mechanism for the drift correction, not spec surface).
- All non-delta requirements in each canonical spec were preserved verbatim. Requirements counts after merge: hero 6, historia 5, infancias 4, donar 5, constitution-amendment 3.

## Stale Planning Claims (superseded)

Per the Final-State Authority, the following intermediate claims are superseded by the final state above and must NOT be read as current facts:

- `proposal.md` (written 2026-09-10 19:55): "No new dependency … No `package.json`, `pnpm add`, or constitution amendment" and success criterion "No `package.json` diff" — **superseded**: sharp ^0.35.4 IS a direct dependency and `docs/constitution.md` rule 1 WAS amended. Verified in `package.json` and `docs/constitution.md` (commits `6fb59d8`, `ce31ddd`).
- `design.md` (written 2026-09-10 19:59): "No deletions. No `package.json`, `astro.config.mjs`, or `docs/constitution.md` changes" and "`src/assets/**` imports are already correct" — **superseded**: 9 `.jpg` assets were deleted/renamed to 6 `.avif` (commit `7434ed0`), `package.json` and `constitution.md` changed. The `<Image>` mappings table in design.md (dimensions, classes, loading strategy) were followed exactly.
- `tasks.md` 3.1 unchecked — reconciled as documented above.

No unrankable contradictions remain: every superseded claim is corroborated by git history (highest-ranked repository evidence).

## Archive Verification

- Mechanical move via `git mv` (all artifacts git-tracked) with pre-move recursive snapshot and mandatory `diff -r` readback: **empty diff (zero differences)** — the only passing evidence. The `archive-report.md` is additive-only and was written after the readback.
- Active `openspec/changes/astro-image-refactor/` no longer exists.
- Archived folder contains all artifacts: `proposal.md`, `exploration.md`, `specs/` (5 domains), `design.md`, `tasks.md`, `apply-progress.md`, `verify-report.md`, `archive-report.md`.
- No unchecked implementation tasks in archived `tasks.md`.

## Risks / Remaining

- None blocking. Verbatim `diff -r` output: empty. Deliberately NOT committed/pushed per archive constraints (orchestrator commits the archive).