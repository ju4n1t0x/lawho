# Image Upload Specification

## Purpose

Defines filesystem-based image storage with magic-byte MIME validation, size caps, sanitized filenames, and public URL persistence.

## Requirements

### Requirement: Filesystem Storage

Uploaded images MUST be written to the directory specified by `UPLOADS_DIR`. The system MUST NOT store image binaries in the database.

#### Scenario: File written to disk

- GIVEN a valid image upload
- WHEN processed
- THEN the file MUST exist at `${UPLOADS_DIR}/notes/<slug>/<filename>`

#### Scenario: Directory created if missing

- GIVEN `UPLOADS_DIR` does not exist
- WHEN the first upload occurs
- THEN the directory MUST be created automatically

### Requirement: Magic-Byte MIME Sniff

The system MUST validate image type by reading magic bytes. Only `image/jpeg` and `image/png` are accepted.

(Previously: accepted `image/jpeg`, `image/png`, and `image/webp`)

#### Scenario: Valid JPEG accepted

- GIVEN a file whose first bytes match `FF D8 FF`
- WHEN validated
- THEN it MUST be accepted as `image/jpeg`

#### Scenario: Valid PNG accepted

- GIVEN a file whose first bytes match `89 50 4E 47`
- WHEN validated
- THEN it MUST be accepted as `image/png`

#### Scenario: WebP rejected

- GIVEN a file matching the WebP signature
- WHEN validated
- THEN it MUST be rejected

#### Scenario: Non-matching MIME rejected

- GIVEN a `.jpg` file that is actually a GIF
- WHEN validated
- THEN it MUST be rejected regardless of extension

### Requirement: Size Cap

The system MUST reject files exceeding 5MB. The cap SHOULD be configurable via an env var (default 5MB).

#### Scenario: File under cap accepted

- GIVEN a 3MB image
- WHEN validated
- THEN it MUST be accepted

#### Scenario: File over cap rejected

- GIVEN a 6MB image
- WHEN validated
- THEN it MUST be rejected with an error

#### Scenario: File at exact cap

- GIVEN a 5MB image exactly
- WHEN validated
- THEN it MUST be accepted (boundary inclusive)

### Requirement: Sanitized Filenames

Stored filenames MUST be sanitized to contain only `[a-z0-9._-]` characters. The system MUST generate a unique filename to prevent collisions.

#### Scenario: Path traversal blocked

- GIVEN an uploaded file named `../../etc/passwd` (read-only)
- WHEN sanitized
- THEN the stored filename MUST NOT contain `..` or `/` (read-only)

#### Scenario: Unique filename

- GIVEN two uploads with the same original name
- WHEN stored
- THEN they MUST have different filenames on disk

#### Scenario: Special characters stripped

- GIVEN an uploaded file named `Mi Foto (1).JPG`
- WHEN sanitized
- THEN the stored name MUST contain only `[a-z0-9._-]`

### Requirement: Public URL in DB

The database MUST store the public URL (constructed from `PUBLIC_UPLOADS_URL` + relative path), never the local filesystem path.

#### Scenario: Public URL stored

- GIVEN `PUBLIC_UPLOADS_URL=/uploads` and a file stored at `${UPLOADS_DIR}/notes/slug/photo.jpg`
- WHEN the note row is inserted
- THEN the `image` field MUST be `/uploads/notes/slug/photo.jpg` (read-only)

#### Scenario: CDN origin stored

- GIVEN `PUBLIC_UPLOADS_URL=https://cdn.lawho.org.ar/uploads`
- WHEN the note row is inserted
- THEN the `image` field MUST start with `https://cdn.lawho.org.ar/uploads/`

#### Scenario: Local path never persisted

- GIVEN any upload
- WHEN the DB row is inspected
- THEN the `image` value MUST NOT contain the local `UPLOADS_DIR` path

### Requirement: Server-Side Optimization

Every accepted image MUST be re-encoded with sharp BEFORE disk write. Format MUST be preserved (no transcode). The system MUST apply `rotate()` EXIF strip, cap longest edge at ~2400px (`fit: "inside"`, `withoutEnlargement`), and bail if `metadata()` reports any axis > ~8000px. The 5 MB cap applies to INPUT before optimization. Output MUST NOT exceed input bytes.

#### Scenario: JPEG re-encoded

- GIVEN a valid JPEG within size cap
- WHEN processed
- THEN output MUST be JPEG with mozjpeg quality ~82
- AND output bytes MUST NOT exceed input bytes

#### Scenario: PNG re-encoded

- GIVEN a valid PNG within size cap
- WHEN processed
- THEN output MUST be PNG with compression level 9 and palette mode

#### Scenario: EXIF orientation stripped

- GIVEN a JPEG with EXIF orientation tag
- WHEN processed
- THEN output MUST have correct orientation and EXIF removed

#### Scenario: OOM guard on large dimensions

- GIVEN an image with any axis > 8000px
- WHEN optimization begins
- THEN the system MUST bail before decode allocation

#### Scenario: Long edge capped

- GIVEN a 4000×3000 image
- WHEN processed
- THEN longest output edge MUST NOT exceed 2400px
- AND aspect ratio MUST be preserved

### Requirement: Image Replacement on Edit

When a writer provides a new image on edit, the system MUST save+optimize it, persist the new public URL, and unlink the previous file AFTER the DB write succeeds. When no new file is provided, the existing image MUST be retained.

#### Scenario: New image replaces existing

- GIVEN a note with an existing image
- WHEN the writer submits a new image file
- THEN the new image MUST be saved and optimized
- AND `image_url` MUST be updated in the DB
- AND the old file MUST be unlinked after DB success

#### Scenario: No new image retains existing

- GIVEN a note with an existing image
- WHEN the writer submits without a new image
- THEN the existing file MUST remain on disk
- AND `image_url` MUST NOT change

#### Scenario: Unlink gated on DB success

- GIVEN an image replacement in progress
- WHEN the DB write fails
- THEN the old file MUST NOT be unlinked
