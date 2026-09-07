# Design: Terreno Carousel

## Technical Approach

Restore data-driven cards to Terreno as a horizontal scroll-snap carousel. `Misiones.astro` (a stub since `2496bd5`) fetches `getLiveCollection("notes")`, filters via `getPublishedNotes({ featuredOnly: true })`, caps at 6, and renders a `<NoteCard>` snap track wrapped in one `Reveal`. Navigation is CSS scroll-snap + a vanilla TS IIFE mirroring `Reveal.astro`/`CountUp.astro` (global guard, `prefers-reduced-motion` short-circuit). No new dependency (constitution rule 1).

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| A1 CSS scroll-snap + vanilla TS | ~50-line script; manual drag/pointer wiring | **Chosen** — zero deps, matches constitution |
| A2 scroll-snap only | No chevrons/keyboard/drag — fails spec scenarios | Rejected |
| A3 Embla/Swiper | Adds dep, violates rule 1 | Rejected |
| Inline `<script>` vs module | Module is unit-testable; inline matches existing pattern | **Inline `<script>` for DOM wiring + pure helpers in `src/lib/carousel.ts`** (mirrors `CountUp.astro` ↔ `lib/anim.ts`) |
| `prerender=true` vs `false` on home | Static = DB at build; on-demand = DB per request | **Keep static** — README line 126 + `dist/client/index.html` confirm home is prerendered; migrate+seed before `astro build` |
| NoteCard `Reveal` wrapper | Spec forbids per-card `Reveal`; proposal said "unchanged" | **Add optional `reveal?: boolean = true` prop** — backward compatible, blog grid unchanged |

## Data Flow

```
build ──► getLiveCollection("notes") ──► listPublishedNotes() (DB)
              │
              ▼
 getPublishedNotes({featuredOnly:true}) ──► sort date DESC ──► slice(0,6)
              │
              ▼
 Misiones.astro ──► <ul snap track> ──► <NoteCard reveal={false} xN>
              │
              ▼
 <Reveal> (single) ──► empty-state when 0 notes
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/components/Misiones.astro` | Modify | Stub → fetch + header + chevrons + snap track + inline carousel script + empty-state |
| `src/components/NoteCard.astro` | Modify | Add optional `reveal?: boolean` prop; `reveal={false}` skips `<Reveal>` |
| `src/lib/carousel.ts` | Create | Pure helpers: `resolveScrollBehavior`, `exceedsDragThreshold` |
| `src/lib/carousel.test.ts` | Create | Unit tests for the two helpers |
| `src/styles/global.css` | Modify | Add `@utility scrollbar-none` (hide track scrollbar) |
| `migrations/002-seed-terreno.sql` | Create | 3–4 featured notes, `ON CONFLICT (slug) DO NOTHING` |

## Interfaces / Contracts

```ts
// src/lib/carousel.ts
export function resolveScrollBehavior(reducedMotion: boolean): ScrollBehavior
// reducedMotion ? "auto" : "smooth"

export function exceedsDragThreshold(dx: number, dy: number, threshold = 8): boolean
// |dx| > threshold && |dx| > |dy|  (horizontal drag, suppresses click)
```

```astro
<!-- NoteCard.astro -->
interface Props { note: LiveNoteEntry; delay?: number; reveal?: boolean }
const { note, delay = 0, reveal = true } = Astro.props;
{reveal ? <Reveal delay={delay}>…</Reveal> : <a …>…</a>}
```

**Misiones markup**: root `[data-carousel]`; track `[data-carousel-track]` = `<ul class="flex gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-none">`; `li` = `snap-start shrink-0 basis-[85%] sm:basis-[45%] md:basis-[32%]`; chevrons `[data-carousel-prev]`/`[data-carousel-next]`; region `tabindex="0" role="region" aria-label`.

## Carousel Script Outline

```ts
(() => {
  const KEY = "__lawhoCarousel";
  const g = window as unknown as Record<string, unknown>;
  if (g[KEY]) return; g[KEY] = true;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const behavior = resolveScrollBehavior(reduced);

  document.querySelectorAll<HTMLElement>("[data-carousel]").forEach((root) => {
    const track = root.querySelector<HTMLElement>("[data-carousel-track]")!;
    const step = () => (track.firstElementChild?.getBoundingClientRect().width ?? 0) + 24;
    const go = (dir: number) => track.scrollBy({ left: dir * step(), behavior });

    root.querySelector<HTMLButtonElement>("[data-carousel-next]")?.addEventListener("click", () => go(1));
    root.querySelector<HTMLButtonElement>("[data-carousel-prev]")?.addEventListener("click", () => go(-1));

    root.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    });

    let startX = 0, startScroll = 0, dragging = false;
    track.addEventListener("pointerdown", (e) => {
      startX = e.clientX; startScroll = track.scrollLeft; dragging = false;
      track.style.scrollSnapType = "none";
    });
    track.addEventListener("pointermove", (e) => {
      if (e.buttons !== 1) return;
      const dx = e.clientX - startX;
      if (!dragging && exceedsDragThreshold(dx, e.clientY - startX)) dragging = true;
      if (dragging) track.scrollLeft = startScroll - dx;
    });
    track.addEventListener("pointerup", () => { track.style.scrollSnapType = ""; });
    track.addEventListener("pointercancel", () => { track.style.scrollSnapType = ""; });
    track.addEventListener("click", (e) => { if (dragging) { e.preventDefault(); e.stopPropagation(); dragging = false; } }, { capture: true });
  });
})();
```

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | `resolveScrollBehavior` (reduce→auto, else smooth); `exceedsDragThreshold` (below/above threshold, vertical-dominant false) | `carousel.test.ts` via vitest |
| Integration/E2E | N/A — no infra (config) | — |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

`002-seed-terreno.sql` is additive + idempotent. Run `001-init.sql` then `002-seed-terreno.sql` **before** `astro build` (home is prerendered; loader hits the DB at build). Empty DB → 0 featured → empty-state (safe). Seed `image_url` uses `/uploads/notes/{slug}/{slug}.jpg` (read-only); upload those images to `UPLOADS_DIR` or cards show broken images (non-blocking). Rollback: revert `Misiones.astro`/`global.css`/`NoteCard.astro` to `2496bd5`.

## Open Questions

- [ ] Proposal lists `NoteCard.astro` as "unchanged", but the spec forbids per-card `Reveal` → this design adds an optional `reveal` prop. Confirm this deviation is accepted.
- [ ] Seed image files for the 3–4 notes: who supplies/upload them (or reuse existing uploads)?
