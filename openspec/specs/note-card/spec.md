# Note Card Specification

## Purpose

Shared miniature component (`NoteCard`) used by both the blog index and the Terreno section. Renders as a real link with image, title, subtitle, optional tag, and hover effect.

## Requirements

### Requirement: Link Wrapper

The NoteCard MUST be a real `<a>` element linking to `/operativos-de-salud/[slug]/`.

#### Scenario: Card is a link

- GIVEN a note with slug `mi-nota`
- WHEN the NoteCard renders
- THEN the root element MUST be `<a href="/operativos-de-salud/mi-nota/">`

### Requirement: Image Display

The card MUST display the note's image with a 4/5 aspect ratio and the `photo-zoom` effect.

#### Scenario: Image renders with aspect ratio

- GIVEN a note with an image
- WHEN the card renders
- THEN the image MUST display at 4/5 aspect ratio with the `photo-zoom` class

#### Scenario: Image has alt text

- GIVEN a note with an image
- WHEN the card renders
- THEN the `<img>` MUST have a non-empty `alt` attribute

### Requirement: Title Display

The card MUST display the note's title using the `font-display` class.

#### Scenario: Title styled

- GIVEN a note with title "Atención pediátrica"
- WHEN the card renders
- THEN the title text MUST be rendered with `font-display` styling

### Requirement: Subtitle Display

The card MUST display the note's subtitle using `text-muted-foreground` styling.

#### Scenario: Subtitle styled

- GIVEN a note with a subtitle
- WHEN the card renders
- THEN the subtitle MUST use `text-muted-foreground`

### Requirement: Tag Eyebrow

When the note has a `tag`, the card MUST display it as an eyebrow element. When absent, no eyebrow MUST appear.

#### Scenario: Tag present

- GIVEN a note with `tag: "Pediatría"`
- WHEN the card renders
- THEN a tag eyebrow MUST be visible above the title

#### Scenario: Tag absent

- GIVEN a note without a `tag`
- WHEN the card renders
- THEN no eyebrow element MUST appear

### Requirement: Hover Effect

The card MUST apply the `lift` hover effect on pointer hover.

#### Scenario: Lift on hover

- GIVEN a rendered NoteCard
- WHEN the user hovers over it
- THEN the `lift` visual effect MUST apply

### Requirement: Accessibility

The card MUST be keyboard-focusable with a visible focus style.

#### Scenario: Keyboard focus visible

- GIVEN a rendered NoteCard
- WHEN a user tabs to it
- THEN a visible focus indicator MUST appear
