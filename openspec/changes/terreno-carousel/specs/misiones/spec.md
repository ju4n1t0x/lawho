# Delta for Misiones

## ADDED Requirements

### Requirement: Carousel Interactions

The system MUST support horizontal carousel navigation via scroll-snap, chevron buttons, keyboard arrows, and drag/swipe. The carousel track MUST use `scroll-snap-type: x mandatory`. Chevron buttons MUST trigger `scrollBy({ behavior: smooth })`. Drag/swipe MUST work with both mouse and touch input. Keyboard arrows MUST navigate left/right. `prefers-reduced-motion: reduce` MUST disable smooth scrolling (use `auto` instead).

#### Scenario: Scroll-snap behavior

- GIVEN the carousel renders with featured notes
- WHEN the user scrolls the carousel track horizontally
- THEN scroll-snap MUST align cards to snap points (`scroll-snap-type: x mandatory`)

#### Scenario: Chevron navigation

- GIVEN the carousel renders with ≥2 cards
- WHEN the user clicks the right chevron
- THEN the carousel MUST scroll the next card into view via `scrollBy({ behavior: smooth })`

#### Scenario: Keyboard arrow navigation

- GIVEN the carousel has focus
- WHEN the user presses ArrowRight or ArrowLeft
- THEN the carousel MUST scroll right or left respectively

#### Scenario: Drag and swipe navigation

- GIVEN the carousel renders on a pointer device
- WHEN the user clicks-and-drags or swipes on the track
- THEN the carousel MUST scroll in the drag direction after pointer release

#### Scenario: Reduced motion

- GIVEN the user has `prefers-reduced-motion: reduce` enabled
- WHEN the carousel scrolls (chevron, keyboard, or drag)
- THEN scrolling MUST use `behavior: auto` (instant, no animation)

### Requirement: Reveal Animation on Carousel Track

The carousel track wrapper MUST be wrapped in a single `Reveal` component. Individual cards MUST NOT have their own `Reveal` wrapper to avoid conflict with slide motion.

#### Scenario: Single reveal on track

- GIVEN the carousel renders
- WHEN the section enters the viewport
- THEN only the track-level `Reveal` MUST trigger — not per-card reveals

### Requirement: Seed Migration

A migration file `migrations/002-seed-terreno.sql` MUST insert 3–4 featured notes into the `notes` collection so the carousel has content on first load.

#### Scenario: Seed data exists after migration

- GIVEN `002-seed-terreno.sql` has been applied
- WHEN querying `notes` WHERE `featured = true` AND `draft != true`
- THEN at least 3 rows MUST be returned

## MODIFIED Requirements

### Requirement: Data-Driven Carousel

The system MUST render featured notes from the `notes` collection in a horizontal carousel. Notes are fetched via `getPublishedNotes({ featuredOnly: true })` and sorted by `date` DESC. The carousel MUST show at most 6 notes. Each card MUST use the shared `NoteCard` component (image 4/5 aspect ratio, tag pill, title, subtitle) wrapped in an `<a>` linking to `/operativos-de-salud/{slug}/` (read-only). When zero featured notes exist, the section MUST render with the header but display an empty-state message. The second card MUST NOT have a vertical offset — the layout is a flat horizontal track, not a staggered grid.

(Previously: rendered 3 hardcoded cards in a static grid with second-card vertical offset.)

#### Scenario: Featured cards render from collection

- GIVEN the `notes` collection contains 4 featured published notes
- WHEN the carousel renders
- THEN exactly 4 cards MUST appear, one per featured note, in a horizontal scrollable track

#### Scenario: 6-card cap

- GIVEN the `notes` collection contains 8 featured published notes
- WHEN the carousel renders
- THEN exactly 6 cards MUST appear (the first 6 by date DESC)

#### Scenario: Cards link to detail pages

- GIVEN a featured note with slug `primer-operativo-2024`
- WHEN the carousel renders
- THEN its card MUST be an `<a>` with `href="/operativos-de-salud/primer-operativo-2024/"`

#### Scenario: Non-featured notes excluded

- GIVEN a published note with `featured: false`
- WHEN the carousel renders
- THEN that note MUST NOT appear as a card

#### Scenario: Draft notes excluded

- GIVEN a note with `draft: true` and `featured: true`
- WHEN the carousel renders
- THEN that note MUST NOT appear as a card

#### Scenario: Empty featured set

- GIVEN no notes have `featured: true` with `draft !== true`
- WHEN the carousel renders
- THEN the section MUST render with the header but display an empty-state message instead of cards

#### Scenario: Horizontal flat layout

- GIVEN viewport is at or above `md` and at least 2 featured cards render
- WHEN the carousel renders
- THEN cards MUST be laid out in a horizontal track with no vertical stagger/offset on any card
