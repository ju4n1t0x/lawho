# Apply Progress: astro-image-refactor

## Mode
Standard (strict_tdd: false)

## Workload
- Mode: single-pr
- Estimated changed lines: ~15 (4 files)
- Budget risk: Low
- Chain strategy: N/A

## Completed Tasks

### Phase 1: Component Migration

- [x] 1.1 `src/components/Hero.astro` — Added `import { Image } from "astro:assets"`; replaced `<img src={heroNinos.src}>` → `<Image src={heroNinos} width={1408} height={1008} loading="eager" ...>`
- [x] 1.2 `src/components/Historia.astro` — Added `Image` import; replaced `<img src={territorio.src}>` → `<Image src={territorio} width={1600} height={912} loading="lazy" ...>`
- [x] 1.3 `src/components/Infancias.astro` — Added `Image` import; replaced `<img src={abuela.src}>` → `<Image src={abuela} width={1200} height={1504} loading="lazy" ...>`
- [x] 1.4 `src/components/Infancias.astro` — Replaced `<img src={item.img.src}>` → `<Image src={item.img} width={600} height={600} loading="lazy" ...>` (3 cards)
- [x] 1.5 `src/components/Donar.astro` — Added `Image` import; replaced `<img src={heroManos.src}>` → `<Image src={heroManos} width={1600} height={1000} loading="lazy" ...>`; gradient overlay `<div>` after `<Image>` in DOM

### Phase 2: Verification (corrective re-run)

- [x] 2.1 `pnpm build` — PASS (exit 0; 7 optimized .webp assets emitted via sharp in `dist/client/_astro/`)
- [x] 2.2 Grep verification — zero `<img` tags in Hero/Historia/Infancias/Donar.astro
- [x] 2.3 `pnpm test` — 95 tests, 12 files, all green
- [x] 2.4 Donar DOM — `<Image>` at L17-24, gradient overlay `<div>` at L25-27 (correct z-order)
- [x] 2.5 Untouched files — NavBar/Footer favicons and NoteCard/NoteTemplate/WriterNoteCard/WriterForm still use raw `<img>`

## Work Unit Evidence (corrective re-run)

| Evidence | Value |
|---|---|
| Focused test command and exact result | `grep -rn '<img' src/components/{Hero,Historia,Infancias,Donar}.astro` → zero matches (PASS) |
| Runtime harness command/scenario and exact result | `pnpm build` → PASS (exit 0; 7 images optimized by sharp: hero-manos 61→35kB, ninos-esperanza 996→291kB, etc.) |
| Rollback boundary | `src/components/{Hero,Historia,Infancias,Donar}.astro` only; single atomic revert |

## Deviations from Design

None — implementation matches design exactly.

## Issues Found

None — build now passes after `sharp` was added as a direct project dependency (pnpm add sharp).

## Remaining Tasks

- [ ] 3.1 Commit to `dev` (repo workflow step — not part of apply scope)
