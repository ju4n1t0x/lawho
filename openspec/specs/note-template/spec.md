# Note Template Specification

## Purpose

The `/operativos-de-salud/[...slug]` detail page renders a single note with hero image, metadata, and Markdown body.

## Requirements

### Requirement: Detail Route

The system MUST serve a page at `/operativos-de-salud/[slug]/` for each published note.

#### Scenario: Detail page renders

- GIVEN a published note with slug `primer-operativo-2024`
- WHEN a user visits `/operativos-de-salud/primer-operativo-2024/`
- THEN the page MUST render that note's content

### Requirement: Hero Image

The detail page MUST display the note's image as a hero image.

#### Scenario: Hero image renders

- GIVEN a note with `image` in frontmatter
- WHEN the detail page renders
- THEN the image MUST appear as a prominent hero element

### Requirement: Title and Subtitle

The page MUST display the note's `title` and `subtitle`.

#### Scenario: Title and subtitle present

- GIVEN a note with title "Primer operativo 2024" and subtitle "Campaña inaugural"
- WHEN the detail page renders
- THEN both MUST be visible

### Requirement: Date Display

The page MUST display the note's date formatted for the es-AR locale.

#### Scenario: Date formatted

- GIVEN a note with date 2024-03-15
- WHEN the detail page renders
- THEN the date MUST appear formatted in es-AR style (e.g., "15 de marzo de 2024")

### Requirement: Author and Tag Display

When `author` is present, the page MUST display it. When `tag` is present, the page MUST display it. When absent, no placeholder MUST appear.

#### Scenario: Optional metadata shown

- GIVEN a note with `author: "Dra. García"` and `tag: "Pediatría"`
- WHEN the detail page renders
- THEN both author and tag MUST be visible

#### Scenario: Optional metadata absent

- GIVEN a note without `author` or `tag`
- WHEN the detail page renders
- THEN no author or tag section MUST appear

### Requirement: Markdown Body

The page MUST render the note's Markdown body via the `Content` component from `await render(entry)`.

#### Scenario: Body renders

- GIVEN a note with Markdown body content
- WHEN the detail page renders
- THEN the body MUST be rendered as HTML

### Requirement: Nonexistent Slug

Visiting a slug that does not match any note MUST return a 404 response.

#### Scenario: Unknown slug returns 404

- GIVEN no note exists with slug `inexistente`
- WHEN a user visits `/operativos-de-salud/inexistente/`
- THEN the system MUST return a 404 status

### Requirement: English Mirror

The system MUST serve an English mirror at `/en/operativos-de-salud/[slug]/`.

#### Scenario: En mirror renders same note

- GIVEN a published note with slug `primer-operativo-2024`
- WHEN a user visits `/en/operativos-de-salud/primer-operativo-2024/`
- THEN the same note content MUST render
