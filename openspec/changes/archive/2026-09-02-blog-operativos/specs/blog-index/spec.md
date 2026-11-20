# Blog Index Specification

## Purpose

The `/operativos-de-salud/` page renders a grid of published note miniatures sorted by date.

## Requirements

### Requirement: Blog Index Route

The system MUST serve a page at `/operativos-de-salud/` that displays a grid of published notes.

#### Scenario: Index renders published notes

- GIVEN the `notes` collection contains 3 published notes (draft=false) and 1 draft
- WHEN a user visits `/operativos-de-salud/`
- THEN the page MUST display exactly 3 note cards

#### Scenario: Empty collection

- GIVEN the `notes` collection contains zero entries with draft=false
- WHEN a user visits `/operativos-de-salud/`
- THEN the page MUST render the header and an empty state with no cards

### Requirement: Sort Order

Notes MUST be sorted by `date` in descending order (newest first).

#### Scenario: Newest note appears first

- GIVEN published notes dated 2024-01-15 and 2024-03-01
- WHEN the index renders
- THEN the 2024-03-01 note MUST appear before the 2024-01-15 note

### Requirement: Draft Exclusion

Notes with `draft === true` MUST NOT appear on the blog index.

#### Scenario: Draft hidden from index

- GIVEN a note with `draft: true`
- WHEN the index renders
- THEN that note MUST NOT have a card on the page

### Requirement: Page Header

The page MUST include a header with an eyebrow label, an H1 title, and an introductory paragraph.

#### Scenario: Header renders

- GIVEN the blog index page loads
- WHEN inspecting the header
- THEN it MUST contain an H1, an eyebrow label, and an intro paragraph

### Requirement: NoteCard Rendering

Each published note MUST render as a `NoteCard` component linking to its detail page.

#### Scenario: Card links to detail

- GIVEN a published note with slug `primer-operativo-2024`
- WHEN the index renders
- THEN its card MUST be an `<a>` linking to `/operativos-de-salud/primer-operativo-2024/`

### Requirement: English Mirror

The system MUST serve an English mirror at `/en/operativos-de-salud/` rendering the same published notes per the i18n fallback convention.

#### Scenario: En mirror renders same content

- GIVEN a user visits `/en/operativos-de-salud/`
- WHEN the page loads
- THEN it MUST display the same published notes as the Spanish index
