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

The system MUST validate image type by reading magic bytes, not by file extension. Only `image/jpeg`, `image/png`, and `image/webp` are accepted.

#### Scenario: Valid JPEG accepted

- GIVEN a file whose first bytes match the JPEG magic number (`FF D8 FF`)
- WHEN validated
- THEN it MUST be accepted as `image/jpeg`

#### Scenario: Valid PNG accepted

- GIVEN a file whose first bytes match the PNG magic number (`89 50 4E 47`)
- WHEN validated
- THEN it MUST be accepted as `image/png`

#### Scenario: Valid WebP accepted

- GIVEN a file whose first bytes match the WebP signature
- WHEN validated
- THEN it MUST be accepted as `image/webp`

#### Scenario: Non-matching MIME rejected

- GIVEN a `.jpg` file that is actually a GIF (magic bytes `47 49 46 38`)
- WHEN validated
- THEN it MUST be rejected regardless of extension

#### Scenario: Executable disguised as image rejected

- GIVEN a `.png` file that is actually a shell script
- WHEN validated
- THEN it MUST be rejected

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
