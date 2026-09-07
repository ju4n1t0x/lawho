# Tasks: Terreno Carousel

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~250–290 (code, excludes this tasks.md) |
| 400-line budget risk | Low |
| Session review budget (200) | Exceeded — chain recommended |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 (feature-branch-chain) |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR (base) | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Pure carousel helpers + unit tests + seed migration | PR 1 (base = feature/tracker branch) | `pnpm vitest run src/lib/carousel.test.ts` | N/A — pure helpers, no DOM runtime | Revert/deletable: `src/lib/carousel.ts`, `src/lib/carousel.test.ts`, `migrations/002-seed-terreno.sql` |
| 2 | NoteCard reveal opt-out + CSS snap + Misiones carousel UI | PR 2 (base = PR 1 branch) | `astro build` green + `pnpm vitest run` | Local `astro dev` scroll-snap/drag/chevron/keyboard check | Revert `src/components/Misiones.astro`, `NoteCard.astro`, `src/styles/global.css` to `2496bd5` |

## Phase 1: Foundation

- [x] 1.1 Create `migrations/002-seed-terreno.sql`: INSERT 3–4 published featured notes, `ON CONFLICT (slug) DO NOTHING`, `image_url` = `/uploads/notes/{slug}/{slug}.jpg` (read-only); match `001-init.sql` schema (`migrations/001-init.sql` read-only)
- [x] 1.2 Upload seed note images to `UPLOADS_DIR` or confirm placeholder path accepted (design open question — confirm before apply)
- [x] 1.3 Create `src/lib/carousel.ts`: export `resolveScrollBehavior(reducedMotion)` (reduce→`"auto"`, else `"smooth"`) and `exceedsDragThreshold(dx,dy,threshold=8)` (`|dx|>threshold && |dx|>|dy|`)
- [x] 1.4 Create `src/lib/carousel.test.ts` (vitest): reduce→auto; default→smooth; drag below/above threshold; vertical-dominant→false

## Phase 2: Component Integration

- [x] 2.1 Modify `src/components/NoteCard.astro`: add optional `reveal?: boolean = true` prop; `reveal={false}` renders `<a>` directly, skipping `<Reveal>` (backward-compatible)
- [x] 2.2 Modify `src/styles/global.css`: add scrollbar-hiding utility and `.carousel-track` snap tokens per design (Tailwind v4 `@utility`)
- [x] 2.3 Rework `src/components/Misiones.astro`: fetch `getLiveCollection("notes")`, filter `getPublishedNotes({ featuredOnly: true })`, sort date DESC, `slice(0,6)`; cap renders at 6
- [x] 2.4 Render `<ul>` snap track `[data-carousel-track]` with `<NoteCard reveal={false}>` per note, wrapped in ONE `<Reveal>`; header + empty-state message when 0 featured notes; no per-card vertical offset
- [x] 2.5 Add `<button data-carousel-prev>`/`[data-carousel-next]` chevrons, `role="region"` + `tabindex="0"`; inline `<script>` IIFE with global guard wiring click/keyboard (ArrowRight/Left)/pointer drag calling helpers from `src/lib/carousel.ts`

## Phase 3: Verification

- [x] 3.1 Run seed `001-init.sql` then `002-seed-terreno.sql`; query `notes` WHERE `featured=true AND draft!=true` → ≥3 rows
- [x] 3.2 Run `pnpm vitest run` → all tests green (carousel helpers + existing)
- [x] 3.3 Run `astro build` → green with seeded DB (home prerendered); visual check in `astro dev`: scroll-snap, chevrons, keyboard, drag/swipe, reduced-motion auto
