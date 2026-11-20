# Delta for Misiones

## MODIFIED Requirements

### Requirement: Section Header

The system MUST render H2 "Lo que pasa en el terreno" with an eyebrow "Operativos de salud" that links to `/operativos-de-salud/`.
(Previously: eyebrow "Operativos de salud" was plain text with no link.)

#### Scenario: Header text matches

- GIVEN the misiones section renders
- WHEN inspecting the header
- THEN the H2 MUST be "Lo que pasa en el terreno"

#### Scenario: Eyebrow links to blog index

- GIVEN the misiones section renders
- WHEN a user clicks the "Operativos de salud" eyebrow
- THEN navigation MUST target `/operativos-de-salud/`

### Requirement: Three Mission Cards

The system MUST render cards from the `notes` collection, filtered to entries where `featured === true` and `draft !== true`, sorted by `date` DESC. Each card MUST be a shared `NoteCard` component wrapped in an `<a>` linking to `/operativos-de-salud/[slug]/`.
(Previously: 3 hardcoded cards rendered from a static array with verbatim content for Pediatría y nutrición, Diagnóstico, and Comunidad.)

#### Scenario: Featured cards render from collection

- GIVEN the `notes` collection contains 2 featured published notes and 1 non-featured published note
- WHEN the misiones section renders
- THEN exactly 2 cards MUST appear, one per featured note

#### Scenario: Cards link to detail pages

- GIVEN a featured note with slug `primer-operativo-2024`
- WHEN the misiones section renders
- THEN its card MUST be an `<a>` with `href="/operativos-de-salud/primer-operativo-2024/"`

#### Scenario: Non-featured notes excluded

- GIVEN a published note with `featured: false`
- WHEN the misiones section renders
- THEN that note MUST NOT appear as a card in this section

#### Scenario: Draft notes excluded

- GIVEN a note with `draft: true` and `featured: true`
- WHEN the misiones section renders
- THEN that note MUST NOT appear as a card

#### Scenario: Empty featured set

- GIVEN no notes have `featured: true` with `draft !== true`
- WHEN the misiones section renders
- THEN the section MUST render with the header but zero cards

#### Scenario: Second card offset on desktop

- GIVEN viewport is at or above `md` and at least 2 featured cards render
- WHEN the misiones grid renders
- THEN the second card MUST be offset downward (visually staggered)

## ADDED Requirements

### Requirement: Section ID Preserved

The section element MUST retain `id="misiones"` to preserve existing navbar anchor links and deep-links.

#### Scenario: Anchor link works

- GIVEN the misiones section renders
- WHEN a user navigates to `#misiones`
- THEN the page MUST scroll to the misiones section
