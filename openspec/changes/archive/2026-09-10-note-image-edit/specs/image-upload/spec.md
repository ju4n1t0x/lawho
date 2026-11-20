# Delta for Image Upload

## MODIFIED Requirements

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

## ADDED Requirements

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
