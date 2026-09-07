# Exploration: Terreno Carousel — featured notes slider on the home page

## Current State

The home page (`src/pages/index.astro` + `src/pages/en/index.astro`) renders a static composition through `src/components/HomeSections.astro`, which imports `Misiones` as the "Terreno" section. After commit `2496bd5` (`fix(landing): stop reading the notes collection on the static home`) Misiones was deliberately reverted to a **stub** that does **not** read from the notes collection:

```astro
---
import Reveal from "./Reveal.astro";
---

<section id="misiones" class="mx-auto max-w-6xl px-4 py-24 md:py-32">
  <Reveal>
    <div class="mb-14 flex flex-col items-baseline justify-between gap-4 md:flex-row">
      <h2 class="font-display text-4xl font-semibold tracking-tight md:text-5xl">
        Lo que pasa en el terreno
      </h2>
      <a href="/operativos-de-salud/" class="text-xs uppercase tracking-[0.25em] text-muted-foreground transition-colors hover:text-accent">
        Operativos de salud
      </a>
    </div>
  </Reveal>
  <p class="text-muted-foreground">
    Los últimos operativos de salud, crónica a crónica, están disponibles en
    la bitácora pública.
  </p>
</section>
```

So the user is asking us to reintroduce data-driven cards, but as a **carousel/slider** rather than the staggered 3-column grid that the `2026-09-02-blog-operativos` archive had implemented (and that commit `2496bd5` reverted).

The home page itself is **statically prerendered** — neither `index.astro` nor `en/index.astro` sets `prerender = false`. Only `/operativos-de-salud/` (read-only) (and its `/en/` (read-only) mirror) are on-demand. That means the carousel will render against a **build-time snapshot** of `notes`; new notes won't appear on the home until the next rebuild.

## Affected Areas

- `src/components/Misiones.astro` — currently static; will gain the carousel markup, `getLiveCollection("notes")` + `getPublishedNotes({ featuredOnly: true })`, and a small inline `<script>` for arrow / drag / keyboard nav.
- `openspec/specs/misiones/spec.md` — currently describes a **3-card staggered grid**. Needs a `MODIFIED` block replacing `Three Mission Cards` (and possibly the offset scenario) with a horizontal carousel contract.
- `src/styles/global.css` — likely needs new `@utility` rules for `scroll-snap`, `scrollbar-hide`, etc., following the existing `@utility photo-zoom` / `@utility lift` pattern.
- `src/components/NoteCard.astro` — **no changes required**; it already renders an `<a>` with `photo-zoom`, `lift`, image + tag + title + subtitle (4/5 aspect). It can be reused inside a flex/snap container with width utilities. (Slight visual concern: the `Reveal` IntersectionObserver animation may not fire for off-screen cards. Worth deciding whether to drop `Reveal` for carousel cards or use a different approach.)
- `src/components/HomeSections.astro` — no structural change; Misiones already composed in.
- `src/pages/index.astro`, `src/pages/en/index.astro` — no change; static prerender continues.
- `src/lib/notes.ts`, `src/lib/notes-mapper.ts`, `src/lib/notes-repo.ts`, `src/live.config.ts`, `migrations/001-init.sql` — no change; existing pipeline already exposes `featuredOnly` + `date DESC` sort.
- `docs/constitution.md` — **no change**. Existing rule 1 already prohibits new deps.

## Field availability (DB + schema)

| Field     | DB column      | `NoteData`    | `NoteCard` uses | Notes |
|-----------|----------------|---------------|-----------------|-------|
| `slug`    | `slug` (PK)    | n/a (entry id)| `href`          | already used to build `/operativos-de-salud/{slug}/` (read-only) |
| `image`   | `image_url`    | `image` (URL) | `<img src>`     | already `PUBLIC_UPLOADS_URL` origin |
| `tag`     | `tag` nullable | `tag?`        | tag pill        | already optional in schema + UI |
| `title`   | `title`        | `title`       | `<h2>`          | required |
| `subtitle`| `subtitle`     | `subtitle`    | `<p>`           | required |
| `date`    | `date`         | `date`        | not shown       | used only for sort |
| `featured`| `featured` (default true) | `featured` | filter only | drives `featuredOnly` |
| `draft`   | `draft`        | `draft`       | not shown       | drives draft filter |

**Conclusion:** `NoteCard` already exposes every field the user's reference slider needs. **No new fields, no schema change, no migration needed.**

## Existing carousel/slider infra

None. Searched for `carousel|swiper|slider|scroll-snap|slidesPerView|owl-carousel|embla|glide|splide|overflow-x-scroll|overflow-x-auto` — zero hits in `src/`. Only one horizontal-scroll component exists: `src/components/Marquee.astro`, which uses a **CSS keyframe loop** (`@keyframes marquee` in `src/styles/global.css:203`) — that is, a continuous animated track, **not** a user-driven snap carousel.

So we are starting from zero on carousel patterns. We have, however, a clean precedent for vanilla TS component scripts: `src/components/Reveal.astro` uses an IIFE with a `window.__lawhoReveal` guard, an `IntersectionObserver`, and a `prefers-reduced-motion` short-circuit. The carousel script should mirror that pattern.

## Constitution constraints

- Rule 1 (Stack mínimo): Astro 7.2 standard library + the four listed exceptions (TailwindCSS v4, `@astrojs/node`, `pg`, `argon2`, `@astrojs/markdown-satteri`). **No Embla / Swiper / Splide / Glide / Flickity**. The choice is pure CSS scroll-snap + a small vanilla JS `<script>`.
- Rule 2 (Spec antes que código): the spec (`openspec/specs/misiones/spec.md`) MUST be updated with a `MODIFIED` block **before** implementation, per this change.
- Rule 4 (Tests): unit-test additions should target any new pure logic (e.g., a "limit cards to N" helper or snap-step math). Component-level rendering tests are not currently in the suite (`*.test.ts` files cover `password`, `session`, `users-repo`, `uploads`, `uploads-mime`, `markdown`, `notes`, `notes-repo`, `anim`, `live` — no Astro component tests).
- Rule 6 (Idioma): variables English, user-facing copy Spanish.

## Seed-data reality check

`migrations/001-init.sql` ships exactly **one** seed note (`primer-operativo-2024`, featured=true, draft=false). With one card, a carousel renders a single card and looks empty/awkward. The carousel should:

- gracefully handle 0, 1, 2, or N featured cards;
- look meaningful once at least 3 featured notes exist.

The user (or the writer area) needs to author **at least 3 more featured notes** for the carousel to look right. This is a real open question for the orchestrator — either seed more notes in a new migration (`002-seed-terreno.sql`) or rely on the writer flow.

## Approaches

### 1. Pure CSS scroll-snap — no JS controls

- **Pros:** zero JS payload, native touch / wheel / keyboard scroll, respects `prefers-reduced-motion` automatically, lowest maintenance.
- **Cons:** no explicit prev/next chevrons (the user reference image likely shows arrows), no drag-to-snap ergonomics, snap alignment depends on the browser.
- **Effort:** Low.

### 2. CSS scroll-snap + small vanilla JS for chevrons, drag, keyboard ←→

- **Pros:** all of (1), plus arrow buttons (matches the user's reference slider), programmatic `scrollBy({ left: cardWidth + gap, behavior: 'smooth' })`, left/right key handling, optional `pointerdown` → drag handler that disables native snap during drag and snaps to the nearest card on release.
- **Cons:** ~50 lines of vanilla TS to test/maintain. Must mirror `Reveal.astro`'s IIFE + global guard pattern. Must short-circuit under `prefers-reduced-motion: reduce`.
- **Effort:** Low–Medium. Recommended.

### 3. Third-party carousel (Embla / Swiper / Splide / Glide)

- **Pros:** full-featured out of the box, well-tested a11y.
- **Cons:** **forbidden** by `docs/constitution.md` rule 1. Would require a constitution amendment before adding the dep.
- **Effort:** Low to integrate, but blocked by governance.

## Recommendation

**Approach 2** (CSS scroll-snap + vanilla JS for arrows, drag, keyboard). Reuses `NoteCard` as-is inside a horizontal `flex` container with `scroll-snap-type: x mandatory` and per-card `scroll-snap-align: start`.

### Data query

```ts
import { getLiveCollection } from "astro:content";
import NoteCard from "../components/NoteCard.astro";
import { getPublishedNotes } from "../lib/notes";

export const prerender = true; // static home (default; explicit for clarity)

const result = await getLiveCollection("notes");
const featured = getPublishedNotes(result.entries ?? [], { featuredOnly: true });
// Optional: limit to the most recent N for a tidy carousel.
// const notes = featured.slice(0, 8);
const notes = featured;
```

- `getPublishedNotes` already filters `draft !== true`, `featured === true`, and sorts `date` DESC.
- At build time, the live loader queries Postgres (`listPublishedNotes()`) and the snapshot freezes.
- The Misiones section becomes on-demand-friendly if we later flip `prerender = false` on `index.astro`; the same query path works.

### Markup sketch

```astro
<section id="misiones" class="mx-auto max-w-6xl px-4 py-24 md:py-32">
  <Reveal>
    <div class="mb-14 flex items-baseline justify-between gap-4">
      <h2 class="font-display text-4xl font-semibold tracking-tight md:text-5xl">
        Lo que pasa en el terreno
      </h2>
      <a href="/operativos-de-salud/" class="text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-accent">
        Operativos de salud
      </a>
    </div>
  </Reveal>

  {notes.length === 0 ? (
    <p class="text-muted-foreground">
      Los últimos operativos de salud, crónica a crónica, están disponibles en la bitácora pública.
    </p>
  ) : (
    <div class="carousel relative">
      <button type="button" class="carousel-arrow carousel-arrow--prev" aria-label="Anterior" data-carousel-prev>
        <svg viewBox="0 0 24 24" aria-hidden="true">…</svg>
      </button>
      <ul
        class="carousel-track flex gap-6 overflow-x-auto pb-4 [scroll-snap-type:x_mandatory] [scrollbar-width:none]"
        data-carousel-track
      >
        {notes.map((note, i) => (
          <li
            class="carousel-item shrink-0 basis-[80%] sm:basis-[55%] md:basis-[40%] lg:basis-[30%] [scroll-snap-align:start]"
            style={`transition-delay: ${i * 80}ms;`}
          >
            <NoteCard note={note} />
          </li>
        ))}
      </ul>
      <button type="button" class="carousel-arrow carousel-arrow--next" aria-label="Siguiente" data-carousel-next>
        <svg viewBox="0 0 24 24" aria-hidden="true">…</svg>
      </button>
    </div>
  )}
</section>

<script>
  // IIFE guarded by window.__lawhoTerrenoCarousel; mirrors Reveal.astro.
  // - Click prev/next → scrollBy({ left: ±(cardWidth + gap), behavior: 'smooth' })
  // - Keydown ArrowLeft / ArrowRight when track is focused → same
  // - Optional pointer drag (pointerdown/move/up) → translate scrollLeft
  // - ResizeObserver to recompute step on layout change
  // - Short-circuit under prefers-reduced-motion (no smooth scroll)
</script>
```

### CSS additions (in `src/styles/global.css`)

```css
@utility scrollbar-none {
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
}

@utility carousel-arrow {
  position: absolute;
  top: 50%;
  z-index: 10;
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--color-card) 90%, transparent);
  color: var(--color-foreground);
  box-shadow: var(--shadow-soft);
  transition: transform 0.4s var(--ease-out-expo), opacity 0.3s ease;
}

@utility carousel-arrow-prev { left: -1rem; }
@utility carousel-arrow-next { right: -1rem; }
```

(Exact tokens — `--color-card`, `--ease-out-expo`, `--shadow-soft` — already exist in `global.css`.)

### Why reuse `NoteCard` as-is (no carousel-specific variant)

- It already encapsulates the entire visual contract (image / tag / title / subtitle / link / focus / hover) that the spec at `openspec/specs/note-card/spec.md` codifies.
- A carousel-specific variant would duplicate that contract and require a parallel spec file. Not worth it.
- Two minor tweaks happen at the **wrapper** (`<li>`) level, not in `NoteCard`:
  - width sizing (`basis-[80%] sm:basis-[55%] md:basis-[40%] lg:basis-[30%]`) so each card is wider than the screen edge but more than one fits on desktop.
  - drop the `Reveal` IntersectionObserver animation (or short-circuit for off-screen cards). The carousel slides into view as a whole; per-card fade-up conflicts with the slide motion.

### Risks

- **Seed starvation (Medium).** Only 1 featured note ships today. The carousel will look like a single oversized card. We must decide whether to ship a `002-seed-terreno.sql` with 3–4 additional featured notes or document the gap and rely on the writer area.
- **Build-time DB dependency (Medium).** Because the home is statically prerendered, `astro build` needs a reachable Postgres. CI and the VPS deploy script must run migrations + seed before `astro build`. This already exists for the blog index (on-demand), but becomes a hard prerequisite for the static home as well. If the DB is empty, `getLiveCollection` returns empty and the carousel falls back to the empty-state paragraph.
- **Vanilla JS drag UX (Low).** Native CSS scroll-snap already handles trackpad / touch swipe. Adding a custom pointer-drag layer is nice-to-have, not required; if implemented, it must not conflict with link clicks inside cards (i.e., pointerdown must yield to anchors).
- **`prefers-reduced-motion` (Low).** The carousel script must disable `behavior: 'smooth'` and the staggered `transition-delay` fade-in under `prefers-reduced-motion: reduce`. Same pattern as `Reveal.astro`.
- **i18n parity (Low).** `/en/` (read-only) mirrors `/` via `HomeSections.astro`, so the carousel will render identically on both routes. Confirm with the user that the H2 copy "Lo que pasa en el terreno" stays Spanish on `/en/` (read-only) (current behavior — the home mirror is identical Spanish copy per `i18n-setup`).
- **`NoteCard` Reveal wrapper (Low).** The existing `Reveal` adds `class="reveal"` to each card and only fires when intersecting the viewport. For cards outside the initial viewport on load, the cards would be `opacity: 0`. **Recommended**: wrap the carousel `<ul>` in `<Reveal>` once instead of wrapping each card, or skip the per-card animation for this section.

## Open questions for the orchestrator

1. **Should we seed more notes now**, or accept the current single-note state and let the writer area populate over time? If seed, propose a `002-seed-terreno.sql` with 3–4 more featured notes.
2. **Carousel UX scope** — pure scroll-snap, or scroll-snap + chevrons + keyboard + drag (recommended)? The user's reference image is the deciding input; this exploration assumed chevrons match the reference.
3. **Card cap** — render all featured notes, or cap at N (e.g., 8) to keep the carousel bounded? Recommended: render all featured (no cap) and let CSS snap + width utilities handle overflow; revisit if seed grows past ~12.
4. **Autoplay** — none (recommended, per a11y) or auto-advance every N seconds with pause-on-hover? Default to no autoplay unless the user asks.
5. **`Reveal` inside the carousel** — keep one `Reveal` on the section header only, or skip `Reveal` on the carousel entirely (cards are always-visible, scroll drives entry)?

## Ready for Proposal

**Yes.** With the four answers above, the next phase (`sdd-propose`) can write:

- `openspec/changes/terreno-carousel/proposal.md` — scope, approach (Approach 2), rollback (revert the two modified files), seed strategy.
- `openspec/changes/terreno-carousel/specs/misiones/spec.md` — `MODIFIED` block replacing `Three Mission Cards` with the carousel contract (visible cards, snap behavior, arrow controls, keyboard, empty-state fallback, prefers-reduced-motion, drop of the "second card offset" scenario).
- A follow-up `sdd-tasks` and `sdd-apply` for the actual `Misiones.astro` rewrite + `global.css` utilities + a small `notes.test.ts` case for the optional `slice` helper if introduced.