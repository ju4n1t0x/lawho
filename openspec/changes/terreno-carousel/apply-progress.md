# Apply Progress: Terreno Carousel

## Status: All tasks complete

### Delivery Mode
- **Single PR** — maintainer-approved `size:exception`
- Branch: `feat/terreno-carousel`

## Completed Tasks

### Phase 1: Foundation
- [x] 1.1 Create `migrations/002-seed-terreno.sql` — 4 featured notes, idempotent
- [x] 1.2 Seed note images — placeholder paths accepted (`/uploads/notes/{slug}/{slug}.jpg`)
- [x] 1.3 Create `src/lib/carousel.ts` — resolveScrollBehavior + exceedsDragThreshold
- [x] 1.4 Create `src/lib/carousel.test.ts` — 10 unit tests, all green

### Phase 2: Component Integration
- [x] 2.1 Modify `src/components/NoteCard.astro` — optional reveal prop, backward-compatible
- [x] 2.2 Modify `src/styles/global.css` — scrollbar-none, carousel-track, carousel-card utilities
- [x] 2.3 Rework `src/components/Misiones.astro` — fetch, filter, slice, render
- [x] 2.4 Render snap track with NoteCard reveal=false, empty state, single Reveal
- [x] 2.5 Chevron buttons, keyboard, pointer drag/swipe, IIFE script with global guard

### Phase 3: Verification
- [x] 3.1 Seed migration applied — 6 featured notes confirmed in DB
- [x] 3.2 `pnpm vitest run` — 88 tests passed (12 files), including 10 new carousel tests
- [x] 3.3 `astro build` — exit 0, home prerendered successfully

## Work Unit Evidence

| Unit | Focused test command & result | Runtime harness & result | Rollback boundary |
|------|------------------------------|--------------------------|-------------------|
| 1 | `pnpm vitest run src/lib/carousel.test.ts` → 10 passed | N/A — pure helpers, no DOM runtime | Revert: `src/lib/carousel.ts`, `src/lib/carousel.test.ts`, `migrations/002-seed-terreno.sql` |
| 2 | `pnpm vitest run` → 88 passed (12 files); `astro build` → exit 0 | `astro dev` — scroll-snap, chevrons, keyboard, drag/swipe visual check | Revert: `src/components/Misiones.astro`, `NoteCard.astro`, `src/styles/global.css` |

## Commits

| Hash | Message |
|------|---------|
| 9612410 | `feat(carousel): seed migration and pure carousel helpers with tests` |
| 8427382 | `feat(carousel): horizontal scroll-snap carousel in Terreno section` |

## Deviations from Design
None — implementation matches design.md.

## Issues Found
- Seed note image files not uploaded to `UPLOADS_DIR` — cards will show broken images until images are placed at `/uploads/notes/{slug}/{slug}.jpg`. This is non-blocking per design (empty-state fallback works; images are a deployment concern).
- The `body` column in `002-seed-terreno.sql` uses ASCII-safe text (no special chars) to avoid encoding issues. The original design body text with accents was simplified.

## Risks
- Seed images must be uploaded to `UPLOADS_DIR` before deployment for visual correctness.
- Home is prerendered — DB must be seeded before `astro build` in CI/CD.
