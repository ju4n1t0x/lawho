# Proposal: Terreno Carousel

## Intent

Restore data-driven cards to the Terreno section as a horizontal **carousel** of featured notes. `Misiones.astro` is a static stub after `2496bd5`.

## Scope

### In Scope
- Rework `Misiones.astro` stub → carousel via `getLiveCollection("notes")` + `getPublishedNotes({ featuredOnly: true })`.
- Reuse `NoteCard.astro` as-is in a flex + scroll-snap track.
- Scroll-snap CSS + vanilla TS: chevrons, horizontal scroll snap, drag/swipe (mouse + touch), keyboard arrows.
- Cap at **6** notes.
- Empty-state fallback when zero featured notes.
- `migrations/002-seed-terreno.sql` seeding 3–4 featured notes.

### Out of Scope
- New dependencies (constitution rule 1).
- `NoteCard` redesign / new variant.
- Autoplay (default no).
- `prerender = false` on `index.astro`.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `misiones`: replace `Three Mission Cards` grid (incl. "Second card offset on desktop") with a horizontal carousel contract — snap, chevrons, keyboard, drag, 6-card cap, empty-state fallback, `prefers-reduced-motion`.

## Approach

**Recommended A1** (CSS scroll-snap + vanilla TS). Fetch `featured` notes at build time (`getPublishedNotes(...).slice(0, 6)`), render `<NoteCard>` in a snap `<ul>` track, add `@utility scrollbar-none` + chevron utilities to `global.css`, and a ~50-line IIFE script mirroring `Reveal.astro` (global guard, `prefers-reduced-motion` short-circuit, `scrollBy` on chevron/key, pointer drag, `ResizeObserver`). Wrap the track in one `Reveal`; drop per-card `Reveal`. Static home keeps `prerender=true`; CI/deploy must migrate + seed before `astro build`.

**Rejected**: A2 (scroll-snap only) and A3 (Embla/Swiper — constitution rule 1).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/components/Misiones.astro` | Modified | Stub → carousel markup + inline script |
| `src/styles/global.css` | Modified | `scrollbar-none`, `carousel-arrow*` utilities |
| `migrations/002-seed-terreno.sql` | New | 3–4 featured notes |
| `openspec/specs/misiones/spec.md` | Modified | Delta spec (spec phase) |
| `src/components/NoteCard.astro` | Unchanged | Reused as-is |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Build-time DB required for static home | Med | Migrate+seed before `astro build`; empty DB → fallback |
| Drag conflicts with card link clicks | Low | `pointerdown` yields to anchors |
| Per-card `Reveal` vs slide | Low | Single `Reveal` on track |
| i18n H2 copy parity | Low | Confirm Spanish H2 stays on `/en/` (read-only) |

## Rollback Plan

Revert `Misiones.astro` + `global.css` utilities to `2496bd5` stub state; `002-seed-terreno.sql` is additive (no destructive columns), safe to leave or drop.

## Dependencies

- Existing `notes` live collection pipeline (`getPublishedNotes`) — no changes.

## Success Criteria

- [ ] Carousel renders 6 featured notes via `NoteCard`; chevrons, keyboard, and drag/swipe navigate.
- [ ] Zero featured notes → empty-state; `prefers-reduced-motion` disables smooth scroll.
- [ ] `pnpm test` and `astro build` pass; seed yields ≥3 featured notes.
