# Writer Form Specification

## Purpose

Defines the `/escritor/nueva` (read-only) page and `WriterForm` server island for authenticated note creation.

## Requirements

### Requirement: Writer Page Route

The system MUST serve `/escritor/nueva` (read-only) as an on-demand page (`prerender = false`) that mounts a `<WriterForm server:defer />` server island.

#### Scenario: Writer page renders

- GIVEN the server is running
- WHEN an authenticated user visits `/escritor/nueva` (read-only)
- THEN the page MUST load with the WriterForm island

### Requirement: WriterForm Server Island

The `<WriterForm>` MUST be a server island that renders a multipart form with fields: title (text, required), subtitle (text, required), body (textarea, required, Markdown), tag (text, optional), image (file, optional, ≤5MB, jpeg/png/webp).

#### Scenario: Form renders with all fields

- GIVEN the island renders
- WHEN inspecting the HTML
- THEN it MUST contain inputs for title, subtitle, body, tag, and image
- AND the form MUST have `enctype="multipart/form-data"`

#### Scenario: Spanish UI

- GIVEN the island renders
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

On form submission, the island MUST validate: title is non-empty, subtitle is non-empty, body is non-empty, image (if present) is ≤5MB and passes magic-byte MIME sniff (jpeg/png/webp).

#### Scenario: Valid submission accepted

- GIVEN all required fields filled and a valid image
- WHEN the form is submitted
- THEN validation MUST pass

#### Scenario: Missing required field

- GIVEN title is empty
- WHEN the form is submitted
- THEN a Spanish validation error MUST be displayed

#### Scenario: Oversized image rejected

- GIVEN an image file > 5MB
- WHEN the form is submitted
- THEN a Spanish error MUST be displayed (e.g., "La imagen no debe superar 5MB")

#### Scenario: Invalid MIME rejected

- GIVEN an image file that is not jpeg/png/webp (magic bytes mismatch)
- WHEN the form is submitted
- THEN a Spanish error MUST be displayed (e.g., "Formato de imagen no permitido")

### Requirement: Publish to Database

On successful validation, the island MUST insert a new row into the `notes` table and redirect to the public note URL.

#### Scenario: Note published

- GIVEN a valid form submission
- WHEN the island processes it
- THEN a new row MUST be inserted into `notes`
- AND the response MUST redirect to `/operativos-de-salud/<slug>/` (read-only)

#### Scenario: Note appears immediately

- GIVEN a note was just published
- WHEN the blog index is visited
- THEN the new note MUST appear without a rebuild

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
