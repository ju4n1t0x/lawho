# Delta for Writer Form

## MODIFIED Requirements

### Requirement: WriterForm Server Island

The `<WriterForm>` MUST be a server island (`server:defer`) accepting `mode: 'create' | 'update'`. Both modes MUST render a multipart form (`enctype="multipart/form-data"`) with an image file input (`accept="image/jpeg,image/png"`, label "JPG/PNG, máx. 5MB"). In create mode the image is required; in update mode it is optional and replaces the existing image. Fields: title (required), subtitle (required), body (Markdown, required), tag (optional).

(Previously: image optional in create, read-only in update with no file input)

#### Scenario: Create mode renders form with required image input

- GIVEN the island renders with `mode="create"`
- WHEN inspecting the HTML
- THEN the form MUST have `enctype="multipart/form-data"`
- AND an image file input MUST be present with `accept="image/jpeg,image/png"`

#### Scenario: Update mode renders form with replaceable image input

- GIVEN the island renders with `mode="update"` with existing image
- WHEN inspecting the HTML
- THEN the existing image preview MUST display
- AND a file input MUST be present for replacement
- AND the form MUST have `enctype="multipart/form-data"`

#### Scenario: Spanish UI

- GIVEN the island renders in either mode
- WHEN inspecting labels
- THEN all user-facing text MUST be in Spanish

### Requirement: Server-Side Validation

On submit, the island MUST validate title, subtitle, body are non-empty. Create mode: image MUST be present, ≤5MB, jpeg/png MIME. Update mode: if new image provided it MUST be ≤5MB and valid MIME; if no file, skip image checks.

(Previously: image optional in create, skipped entirely in update)

#### Scenario: Create without image rejected

- GIVEN create mode with no image file
- WHEN submitted
- THEN a Spanish error MUST indicate image is required

#### Scenario: Update with new valid image accepted

- GIVEN update mode with a new valid image file
- WHEN submitted
- THEN validation MUST pass

#### Scenario: Update without new image accepted

- GIVEN update mode with no new image file
- WHEN submitted
- THEN validation MUST pass without image checks

#### Scenario: Oversized image rejected

- GIVEN an image file > 5MB
- WHEN submitted
- THEN a Spanish error MUST display

#### Scenario: Invalid MIME rejected

- GIVEN a non-jpeg/png file (magic bytes mismatch)
- WHEN submitted
- THEN a Spanish error MUST display

### Requirement: Publish to Database

Create mode: insert new row with image URL, redirect to `/operativos-de-salud/<slug>/`. Update mode: call `updateNote` INCLUDING `imageUrl` when a new image was uploaded, redirect to `/escritor/`. Slug MUST NOT change.

(Previously: update excluded `image_url` from SET clause)

#### Scenario: Note created with image

- GIVEN valid create submission with image
- WHEN processed
- THEN a new row MUST be inserted with the image public URL

#### Scenario: Note updated with new image

- GIVEN valid update submission with new image
- WHEN processed
- THEN `updateNote` MUST be called with the new `imageUrl`

#### Scenario: Note updated without image change

- GIVEN valid update submission without new image
- WHEN processed
- THEN `updateNote` MUST retain the existing `imageUrl`

### Requirement: Image Attachment

Every note MUST have an image. Create requires an image file. Edit replaces when new file provided, retains when none provided. There MUST NOT be any "quitar imagen" affordance — a note can never be imageless.

(Previously: image optional; no remove action existed but absence was permitted)

#### Scenario: No remove-image action exists

- GIVEN the WriterForm in any mode
- WHEN inspecting the UI
- THEN there MUST NOT be any button or control to remove the existing image

#### Scenario: Image replaced on edit

- GIVEN a note with an image and a new upload in edit mode
- WHEN the note is updated
- THEN the new image MUST replace the old on disk
- AND the old file MUST be unlinked after DB write
