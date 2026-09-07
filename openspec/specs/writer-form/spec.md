# Writer Form Specification

## Purpose

Defines the `/escritor/nueva` (read-only) page and `WriterForm` server island for authenticated note creation and editing.

## Requirements

### Requirement: Writer Page Route

The system MUST serve `/escritor/nueva` (read-only) as an on-demand page (`prerender = false`) that mounts a `<WriterForm server:defer />` server island.

#### Scenario: Writer page renders

- GIVEN the server is running
- WHEN an authenticated user visits `/escritor/nueva` (read-only)
- THEN the page MUST load with the WriterForm island

### Requirement: WriterForm Server Island

The `<WriterForm>` MUST be a server island (`server:defer`) that accepts a `mode` prop: `'create'` (default) or `'update'`. In `create` mode it renders an empty multipart form. In `update` mode it preloads the existing note's data into the form fields and switches its action to update the existing note instead of creating a new one. The form MUST contain fields: title (text, required), subtitle (text, required), body (textarea, required, Markdown), tag (text, optional), image (file, optional in create mode, read-only in update mode).

(Previously: only supported create mode with no preloading)

#### Scenario: Create mode renders empty form

- GIVEN the island renders with `mode="create"` (or no mode prop)
- WHEN inspecting the HTML
- THEN all input fields MUST be empty
- AND the form MUST have `enctype="multipart/form-data"`

#### Scenario: Update mode renders preloaded form

- GIVEN the island renders with `mode="update"` and note data `{ title: 'Post', subtitle: 'Sub', body: 'content', tag: 'salud' }`
- WHEN inspecting the HTML
- THEN title, subtitle, body, and tag inputs MUST be pre-filled with the provided values
- AND the image field MUST be read-only (existing image shown, no file input)

#### Scenario: Spanish UI

- GIVEN the island renders in either mode
- WHEN inspecting labels
- THEN all user-facing text MUST be in Spanish

### Requirement: In-Island Session Check

The island MUST verify the session cookie internally. If no valid session exists, the island MUST NOT render the form.

#### Scenario: Authenticated user sees form

- GIVEN a valid session cookie
- WHEN the island renders
- THEN the form MUST be displayed

#### Scenario: Unauthenticated user blocked

- GIVEN no valid session cookie
- WHEN the island renders
- THEN the form MUST NOT be displayed; a login prompt or redirect MUST occur

### Requirement: Server-Side Validation

On form submission, the island MUST validate: title is non-empty, subtitle is non-empty, body is non-empty, image (if present in create mode) is ≤5MB and passes magic-byte MIME sniff (jpeg/png/webp). In update mode, image validation is skipped since image is read-only.

(Previously: always validated image regardless of mode)

#### Scenario: Valid submission accepted

- GIVEN all required fields filled and a valid image (create mode)
- WHEN the form is submitted
- THEN validation MUST pass

#### Scenario: Update mode skips image validation

- GIVEN the form in update mode
- WHEN the form is submitted without an image file
- THEN validation MUST pass without image checks

#### Scenario: Missing required field

- GIVEN title is empty
- WHEN the form is submitted
- THEN a Spanish validation error MUST be displayed

#### Scenario: Oversized image rejected

- GIVEN an image file > 5MB in create mode
- WHEN the form is submitted
- THEN a Spanish error MUST be displayed (e.g., "La imagen no debe superar 5MB")

#### Scenario: Invalid MIME rejected

- GIVEN an image file that is not jpeg/png/webp (magic bytes mismatch) in create mode
- WHEN the form is submitted
- THEN a Spanish error MUST be displayed (e.g., "Formato de imagen no permitido")

### Requirement: Publish to Database

On successful validation in create mode, the island MUST insert a new row into the `notes` table and redirect to the public note URL. In update mode, the island MUST call `updateNote` with the submitted data (excluding image) and redirect to `/escritor/` (read-only).

(Previously: only created new notes)

#### Scenario: Note published (create mode)

- GIVEN a valid form submission in create mode
- WHEN the island processes it
- THEN a new row MUST be inserted into `notes`
- AND the response MUST redirect to `/operativos-de-salud/<slug>/` (read-only)

#### Scenario: Note updated (update mode)

- GIVEN a valid form submission in update mode for slug `mi-post`
- WHEN the island processes it
- THEN `updateNote('mi-post', ...)` MUST be called with the submitted fields
- AND the response MUST redirect to `/escritor/` (read-only)
- AND the slug MUST NOT change

### Requirement: Image Attachment

If an image is uploaded, it MUST be saved via the image-upload capability and the public URL stored in the note's `image` field.

#### Scenario: Image saved and linked

- GIVEN a valid image upload
- WHEN the note is published
- THEN the image MUST be stored on disk
- AND the note row `image` field MUST contain the public URL

#### Scenario: No image

- GIVEN no image file in the form
- WHEN the note is published
- THEN the note MUST be created; `image` MAY use a default or be empty per schema