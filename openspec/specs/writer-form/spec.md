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

The `<WriterForm>` MUST be a server island (`server:defer`) accepting `mode: 'create' | 'update'`. Both modes MUST render an image file input (`accept="image/jpeg,image/png"`, Spanish label indicating a 5 MiB maximum). In create mode the image is required; in update mode it is optional and replaces the existing image. Fields: title (required), subtitle (required), body (Markdown, required), tag (optional). Browser code MUST first obtain authenticated same-origin upload authorization, PUT the raw file directly to private pending storage, and submit note fields plus the pending reference. The note POST MUST NOT contain raw image bytes, base64 image data, or a client-supplied delivery URL; multipart image submission is retired to avoid Vercel's 4.5 MB function limit without reducing the 5 MiB allowance.

#### Scenario: Create mode renders form with required image input

- GIVEN the island renders with `mode="create"`
- WHEN inspecting the HTML
- THEN an image file input MUST be present with `accept="image/jpeg,image/png"`
- AND publishing MUST wait for the direct pending upload and server finalization

#### Scenario: Update mode renders form with replaceable image input

- GIVEN the island renders with `mode="update"` with existing image
- WHEN inspecting the HTML
- THEN the existing image preview MUST display
- AND a file input MUST be present for replacement
- AND the note POST MUST send only fields and a pending reference, never the replacement file bytes

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

On submit, the write handler MUST validate title, subtitle, and Markdown body are non-empty and recheck the DB-backed session independently of middleware/island rendering. Create requires a pending image reference. Replacement finalization MUST recheck user ownership/prefix, enforce actual size ≤5242880 bytes with bounded reads, validate JPEG/PNG magic bytes and dimensions, optimize with existing `sharp` in Node, and write a new unique finalized key before persisting the note. Client validation is advisory. An edit without replacement MUST retain its existing image and skip new-object validation; legacy imageless notes MUST supply an image. See `image-upload` for the optimization and cleanup contract.

#### Scenario: Create without image rejected

- GIVEN create mode with no pending image reference
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

- GIVEN a pending image object > 5 MiB
- WHEN submitted
- THEN a Spanish error MUST display

#### Scenario: Invalid MIME rejected

- GIVEN a non-jpeg/png file (magic bytes mismatch)
- WHEN submitted
- THEN a Spanish error MUST display

### Requirement: Publish to Database

Create mode: insert the finalized `image_key` and stable `/media/<key>` `image_url`, then redirect to `/operativos-de-salud/<slug>/`. Update mode: call `updateNote` with both `imageKey` and `imageUrl` only when replacing, then redirect to `/escritor/`. Slug MUST NOT change. Never persist a signed GET or pending key. Failed upload/finalization MUST NOT publish a partial note; a failed DB write MUST preserve the old image and attempt cleanup of the new unreferenced final object. Post-commit cleanup failure MUST produce a sanitized operational warning without failing a successful edit.

#### Scenario: Note created with image

- GIVEN valid create submission with image
- WHEN processed
- THEN a new row MUST be inserted with the finalized key and stable image delivery URL

#### Scenario: Note updated with new image

- GIVEN valid update submission with new image
- WHEN processed
- THEN `updateNote` MUST be called with the new `imageKey` and `imageUrl` together

#### Scenario: Note updated without image change

- GIVEN valid update submission without new image
- WHEN processed
- THEN `updateNote` MUST retain the existing `imageUrl` and nullable `imageKey`

### Requirement: Image Attachment

Every newly created/saved note MUST have an image reference. Create requires a finalized upload; edit replaces when provided and otherwise retains the existing reference. A nullable `image_key` supports legacy URLs, not removing the required image. There MUST NOT be any "quitar imagen" affordance. An expired PUT link or failed finalization MUST show a safe Spanish retry error without publishing incomplete data.

#### Scenario: No remove-image action exists

- GIVEN the WriterForm in any mode
- WHEN inspecting the UI
- THEN there MUST NOT be any button or control to remove the existing image

#### Scenario: Image replaced on edit

- GIVEN a note with an image and a new upload in edit mode
- WHEN the note is updated
- THEN the new finalized key and delivery URL MUST replace the old references in the DB
- AND an old managed object MAY be deleted only after DB success and safety/reference checks
- AND soft deletion MUST NOT delete image objects
