# Apply Progress: Site Implementation (U3 / PR 3 slice — FINAL)

## Batch

- **Change**: site-implementation
- **Work unit**: U3 (tasks 2.9–2.11, 5.1–5.2, 6.1–6.3) — Donar, Voluntariado, Footer, page composition + i18n, starter cleanup, verification
- **Mode**: Standard (`strict_tdd: false`)
- **Branch**: `feat/site-implementation-unit-3` (from `feat/site-implementation-unit-2`)
- **Chain strategy**: feature-branch-chain — PR #3 targets PR #2 (`feat/site-implementation-unit-2`); never targets main/tracker.

## Completed Tasks (cumulative)

U1 (2.1–2.3, 2.12–2.13, phases 1/3/4) and U2 (2.4–2.8) were already `[x]` and remain untouched. This batch completes:

- [x] 2.9 `src/components/Donar.astro` — full-bleed `hero-manos.jpg`, dark gradient overlay, 3 aportes, `mailto` CTA
- [x] 2.10 `src/components/Voluntariado.astro` — two-card block (`bg-sun` 2nd), `mailto` CTA
- [x] 2.11 `src/components/Footer.astro` — logo, description, Instagram + email links, `©year`
- [x] 5.1 `src/pages/index.astro` (rewritten) + `src/pages/en/index.astro` (new) — 10 sections in `BaseLayout`; `/` (es) + `/en/` (en) via i18n localized folders
- [x] 5.2 Delete `Welcome.astro`, `Layout.astro`, `astro.svg`, `background.svg`
- [x] 6.1 Grep-env gate on `src/` + `astro.config.mjs` → 0 matches; `cf5a30b` is first site-implementation commit
- [x] 6.2 `astro build` → exit 0, `/` + `/en/` emitted; no Google Fonts in dist
- [x] 6.3 Visual parity, 7 animations, reduced-motion, mobile drawer (static verification; browser-only behavior noted honestly below)

All implementation tasks are now `[x]`. Only verify/archive remain.

## Work Unit Evidence

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `PATH="$HOME/.nvm/versions/node/v22.22.3/bin:$PATH" pnpm vitest run` → exit 0, 1 file, 5 tests passed (U1 `anim.test.ts` unchanged; U3 adds no logic — pure markup). |
| Runtime harness command/scenario and exact result | `PATH="$HOME/.nvm/versions/node/v22.22.3/bin:$PATH" pnpm exec astro build` → exit 0, "2 page(s) built": `/index.html` (lang="es") and `/en/index.html` (lang="en"). Compiled CSS (`dist/_astro/HomeSections.*.css`) contains all 7 `@keyframes` + 7 `animate-*` utilities + `prefers-reduced-motion` + `.reveal`/`.photo-zoom`/`.lift`/`.nav-drawer`. |
| Rollback boundary | Revert commits `0a74e45`, `ce45d62`, `86bd436` on `feat/site-implementation-unit-3` (delete the 3 section components + `HomeSections.astro` + `en/index.astro`; restore starter `index.astro`; re-add the 4 untracked starter files from the U2 branch). No U1/U2 files touched. |

## Verification Run (honest)

1. `astro build` (nvm v22.22.3) → exit 0; emitted `/` and `/en/`; `<html lang="es">` / `<html lang="en">` respectively.
2. `pnpm vitest run` → exit 0, 5 passed.
3. Grep-env gate `process.env` / `import.meta.env` on `src/` + `astro.config.mjs` → 0 matches.
4. `git log --oneline --reverse` → `cf5a30b docs(constitution): permit TailwindCSS v4` is the first site-implementation commit (after `8444c15 first commit`).
5. Visual parity (static): all 10 sections present in exact reference order (byte-offset check on `dist/index.html`); 7 animations + Reveal + CountUp wired; reduced-motion + drawer present. Browser-only animation behavior (IO/rAF firing, marquee motion, drawer interaction) is NOT verifiable statically — deferred to a live-browser pass by the maintainer.

## Commits

1. `0a74e45` feat: add donar, voluntariado, and footer sections
2. `ce45d62` feat: compose landing page with es/en locale routes
3. `86bd436` docs(sdd): mark site-implementation U3 tasks complete

## Deviations from Design

- **i18n routing uses localized folders, not `getStaticPaths`**: `prefixDefaultLocale: false` requires the `en` page at `src/pages/en/index.astro` (Astro folder-based i18n). `getStaticPaths` does not drive locale routing in this config. The task allowed "localized folders … unless simpler" — they are the canonical, correct mechanism here. Content is identical Spanish for both locales; `<html lang>` differs via `Astro.currentLocale` in `BaseLayout`.
- **Shared composition component** `src/components/HomeSections.astro` renders the 10 sections so `index.astro` and `en/index.astro` stay DRY (5 lines each). Not in the design's 12-component list; a deliberate addition to avoid duplicating 10 imports across the two locale folders. When `en` copy arrives, the pages can diverge independently.
- **`Reveal.astro` still has no `className` passthrough** (per design contract); the Donar `space-y-4` and Voluntariado grid classes are moved to wrapper `<div>`s inside `<Reveal>`, matching the U1/U2 pattern. Visual result identical.
- **Starter deletions are invisible to git**: `Welcome.astro`, `Layout.astro`, `astro.svg`, `background.svg` were never committed (repo was mid-init), so removing them produces no diff — files are gone from the working tree but no `git rm` history exists.

## Issues

None.

## PR Boundary

- Mode: chained PR slice (feature-branch-chain)
- Current work unit: U3 (FINAL)
- Boundary: starts from `feat/site-implementation-unit-2` HEAD; adds 3 sections + shared composition + 2 pages + tasks.md checkboxes.
- Estimated review budget impact: 192 additions + 8 deletions = 200 authored changed lines (under the 400-line budget).
