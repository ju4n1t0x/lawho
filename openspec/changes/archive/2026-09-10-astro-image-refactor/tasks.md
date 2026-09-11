# Tasks: Migrate static images to Astro `<Image>` (`astro:assets`)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~15 (4 files) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | single PR |
| Delivery strategy | single-pr |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Migrate 7 static `<img>` to `<Image>` in 4 components (Hero/Historia/Infancias/Donar) | PR 1 | `pnpm build` then `grep -rn "src={" src/components/{Hero,Historia,Infancias,Donar}.astro` → zero matches | `pnpm build` + dev visual check: Hero eager above fold, Donar gradient overlay above image | `src/components/{Hero,Historia,Infancias,Donar}.astro` only; `git revert` single atomic commit |

> **Spec-drift note**: the four delta specs (`openspec/changes/astro-image-refactor/specs/{hero,historia,infancias,donar}/spec.md`) already carry the corrected asset names and `<Image>` requirements — planning-only, authored in the spec phase. `sdd-apply` does NOT write spec files; main specs at `openspec/specs/**` merge at archive. Apply reconciles code only.

## Phase 1: Component Migration (<Image>)

- [x] 1.1 `src/components/Hero.astro` — add `import { Image } from "astro:assets"`; L78 `<img src={heroNinos.src}>` → `<Image src={heroNinos} width={1408} height={1008} loading="eager" alt="Niñas y niños de una comunidad originaria del norte argentino corriendo y riendo" class="aspect-5/4 w-full animate-slow-zoom object-cover" />`
- [x] 1.2 `src/components/Historia.astro` — add `Image` import; L72 `<img src={territorio.src}>` → `<Image src={territorio} width={1600} height={912} loading="lazy" alt="Camioneta de un equipo sanitario recorriendo un camino de ripio en el norte argentino al amanecer" class="h-full min-h-[18rem] w-full object-cover" />`
- [x] 1.3 `src/components/Infancias.astro` — add `Image` import; L40 `<img src={abuela.src}>` → `<Image src={abuela} width={1200} height={1504} loading="lazy" alt="Abuela de una comunidad originaria abrazando a su nieta frente a su casa" class="aspect-4/5 w-full object-cover" />`
- [x] 1.4 `src/components/Infancias.astro` — L75 `<img src={item.img.src}>` → `<Image src={item.img} width={600} height={600} loading="lazy" alt={item.alt} class="aspect-square w-full object-cover" />` (3 cards)
- [x] 1.5 `src/components/Donar.astro` — add `Image` import; L16 `<img src={heroManos.src}>` → `<Image src={heroManos} width={1600} height={1000} loading="lazy" alt="Médica voluntaria tomando la mano de una paciente durante una jornada sanitaria" class="absolute inset-0 size-full object-cover" />`; keep overlay `<div>` AFTER it in DOM

## Phase 2: Verification

- [x] 2.1 `pnpm build` — PASS (exit 0; 7 optimized .webp assets emitted via sharp in dist/client/_astro/)
- [x] 2.2 `grep -rn "src={" src/components/{Hero,Historia,Infancias,Donar}.astro` → zero matches (no raw `<img src={X.src}>`)
- [x] 2.3 `pnpm test` (`vitest run`) baseline green (no component tests exist)
- [x] 2.4 Donar DOM: gradient overlay `<div>` renders AFTER the `<Image>` element (z-order preserved)
- [x] 2.5 Confirm untouched: favicons in `NavBar.astro`/`Footer.astro` and note images (`NoteCard`/`NoteTemplate`/`WriterNoteCard`) remain raw `<img>`/`<link>`

## Phase 3: Commit (work unit)

- [x] 3.1 One atomic commit to `dev` per repo workflow (tests green before commit): `refactor(images): migrate static <img> to Astro <Image> in hero/historia/infancias/donar`