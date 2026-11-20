# Writer Dashboard Specification

## Purpose

Defines the writer note-list dashboard at `/escritor` (read-only), the horizontal card component (`WriterNoteCard`), and the note edit/delete workflows.

## Requirements

### Requirement: Dashboard Page Route

The system MUST serve `/escritor` (read-only) as an on-demand page (`prerender = false`) that conditionally renders a note-list dashboard when `Astro.locals.user` is present, or the login form when unauthenticated.

#### Scenario: Authenticated writer sees dashboard

- GIVEN a valid session cookie
- WHEN a user visits `/escritor/` (read-only)
- THEN the note-list dashboard MUST be rendered
- AND the login form MUST NOT be shown

#### Scenario: Unauthenticated user sees login form

- GIVEN no valid session cookie
- WHEN a user visits `/escritor/` (read-only)
- THEN the login form MUST be rendered
- AND the dashboard MUST NOT be shown

### Requirement: Note Card Component

The system MUST provide a `WriterNoteCard` component (Astro component, not server island) that renders a horizontal card with: image on the left, tag badge, title, and subtitle. Each card MUST include an "Editar" (yellow) button linking to `/escritor/editar/[slug]` (read-only) and an "Eliminar" (red) button that POSTs to `/escritor/eliminar/[slug]` (read-only).

#### Scenario: Card renders with all elements

- GIVEN a note with image, tag, title, and subtitle
- WHEN `WriterNoteCard` is rendered
- THEN it MUST display the image on the left, the tag, title, and subtitle
- AND it MUST contain a yellow "Editar" button linking to `/escritor/editar/<slug>` (read-only)
- AND it MUST contain a red "Eliminar" button with a form POST to `/escritor/eliminar/<slug>` (read-only)

#### Scenario: Card without tag

- GIVEN a note without a tag
- WHEN `WriterNoteCard` is rendered
- THEN the card MUST render successfully with tag omitted

### Requirement: Create Note Button

The dashboard MUST display a green "+ Crear nota" button at the top that links to `/escritor/nueva` (read-only).

#### Scenario: Create button links correctly

- GIVEN the dashboard is rendered
- WHEN inspecting the "+ Crear nota" button
- THEN it MUST link to `/escritor/nueva` (read-only)
- AND it MUST use green styling (`bg-leaf`)

### Requirement: Note List Display

The dashboard MUST display all non-deleted notes (`deleted_at IS NULL`) from the writer collection, ordered newest first. The list MUST show all notes without pagination.

#### Scenario: Notes listed newest first

- GIVEN 3 notes exist with dates Jan 5, Jan 10, and Jan 15
- WHEN the dashboard is rendered
- THEN the notes MUST appear in order: Jan 15, Jan 10, Jan 5

#### Scenario: Deleted notes excluded

- GIVEN a note with `deleted_at` set
- WHEN the dashboard is rendered
- THEN that note MUST NOT appear in the list

#### Scenario: Empty list

- GIVEN no notes exist
- WHEN the dashboard is rendered
- THEN the list MUST be empty and the "+ Crear nota" button MUST still be visible

### Requirement: Edit Note Page

The system MUST serve `/escritor/editar/[slug]` (read-only) as an on-demand page that mounts the `WriterForm` server island in update mode, preloaded with the existing note's data.

#### Scenario: Edit page renders with preloaded data

- GIVEN a note with slug `mi-post` exists
- WHEN an authenticated user visits `/escritor/editar/mi-post` (read-only)
- THEN the `WriterForm` MUST render in update mode with title, subtitle, body, and tag pre-filled
- AND the image field MUST be read-only (existing image displayed, no new upload allowed)

#### Scenario: Non-existent slug

- GIVEN no note with the requested slug exists
- WHEN an authenticated user visits `/escritor/editar/nonexistent` (read-only)
- THEN a Spanish not-found message MUST be shown or the user MUST be redirected

### Requirement: Delete Note Endpoint

The system MUST provide a POST-only endpoint at `/escritor/eliminar/[slug]` (read-only) that soft-deletes the note (sets `deleted_at` to current timestamp) and redirects to `/escritor/` (read-only).

#### Scenario: Successful soft delete

- GIVEN a note with slug `mi-post` exists and is not deleted
- WHEN POST `/escritor/eliminar/mi-post` (read-only) is called
- THEN the note's `deleted_at` MUST be set to the current timestamp
- AND the response MUST redirect to `/escritor/` (read-only)

#### Scenario: Delete confirmation

- GIVEN the "Eliminar" button on `WriterNoteCard`
- WHEN the user clicks it
- THEN a browser confirmation dialog MUST appear before the form submits
