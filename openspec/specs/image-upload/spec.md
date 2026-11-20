# Image Upload Specification

## Purpose

Defines private Neon S3-compatible storage, direct browser uploads, server-side image validation/optimization, and stable delivery URLs. Vercel Node MUST NOT depend on persistent local disk or receive raw image bytes in the note form POST.

## Requirements

### Requirement: Server-Only Storage Client

The application MUST use the private `lawhobucket` bucket (verified in the project's Neon account) with separate pending and finalized prefixes. Binaries MUST NOT be stored in PostgreSQL. The server-only S3 client MUST use validated `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `STORAGE_BUCKET`, `forcePathStyle: true`, and `requestChecksumCalculation: 'WHEN_REQUIRED'`. It MUST be import-safe with no top-level upload/download, secret/signed-URL logging, or `dotenv/config` import. Reuse `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`, authorized by the constitution before installation.

#### Scenario: Import without side effects

- GIVEN the storage module is imported
- WHEN no storage operation is called
- THEN it MUST perform no remote writes or test uploads and MUST NOT log credentials or signed URLs

#### Scenario: Verify actual bucket before activation

- GIVEN the verified `lawhobucket` bucket on the branch targeted by the deployment
- WHEN preparing live storage tests
- THEN the maintainer MUST verify supported region, branch endpoint, credential scopes, and CORS for explicit production/Preview/localhost origins
- AND a public-read bucket MUST NOT be silently recreated; an alternative stable public-URL design requires documentation and private staging before implementation

### Requirement: Authenticated Direct Upload

An authenticated, same-origin authorization endpoint MUST recheck the DB-backed session, choose an unguessable pending key scoped to that user, and issue a short-lived presigned PUT for that key only. The browser MUST upload directly to private pending storage, then submit note fields and a pending reference instead of raw bytes. Bucket CORS MUST allow explicit intended origins and required PUT headers; CORS MUST NOT substitute for authorization. The flow MUST retain the 5 MiB input limit despite Vercel's 4.5 MB function request limit.

#### Scenario: Unauthorized or expired upload

- GIVEN no valid session or an expired upload link
- WHEN upload authorization/finalization is attempted
- THEN it MUST fail with a safe Spanish error and MUST NOT publish an incomplete note

### Requirement: Server Finalization

Finalization MUST recheck the active session, pending ownership and permitted prefix, reject traversal/foreign keys/arbitrary URLs, enforce the input cap with bounded reads, sniff magic bytes, inspect actual dimensions, and optimize with existing `sharp` in Node. It MUST NOT trust client MIME, filename, size, URL, or object reference. Metadata checks alone MUST NOT replace bounded reads of the actual bytes. The optimized image MUST be written to a new unique finalized key before the database insert/update; a client-writable pending key MUST NEVER become a served final key.

#### Scenario: Presigned PUT remains reusable

- GIVEN an unexpired PUT link for a pending key
- WHEN a valid image has already been finalized
- THEN re-uploading to that pending key MUST NOT overwrite the final image

#### Scenario: Foreign or oversized pending object

- GIVEN a reference owned by another user, outside pending storage, or exceeding the actual byte cap
- WHEN finalization runs
- THEN it MUST reject without changing a note or exposing the object

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

The system MUST reject input exceeding 5 MiB (5242880 bytes), inclusive at the boundary. `MAX_UPLOAD_SIZE_BYTES` defaults to this value; authorization and finalization MUST use the same effective cap. Client checks are advisory only.

#### Scenario: File under cap accepted

- GIVEN a 3 MiB image
- WHEN validated
- THEN it MUST be accepted

#### Scenario: File over cap rejected

- GIVEN a 6 MiB image
- WHEN validated
- THEN it MUST be rejected with an error

#### Scenario: File at exact cap

- GIVEN a 5 MiB image exactly
- WHEN validated
- THEN it MUST be accepted (boundary inclusive)

### Requirement: Sanitized Filenames

Any retained filename component MUST be sanitized to contain only `[a-z0-9._-]` characters without traversal or leading hidden-file dots. The server MUST generate collision-resistant keys under controlled prefixes, independent of client paths. Extensions MUST match sniffed JPEG/PNG content. User/prefix path separators are server-controlled, not derived from the original filename.

#### Scenario: Path traversal blocked

- GIVEN an uploaded file named `../../etc/passwd` (read-only)
- WHEN sanitized
- THEN the stored filename MUST NOT contain `..` or `/` (read-only)

#### Scenario: Unique filename

- GIVEN two uploads with the same original name
- WHEN stored
- THEN they MUST have different finalized object keys

#### Scenario: Special characters stripped

- GIVEN an uploaded file named `Mi Foto (1).JPG`
- WHEN sanitized
- THEN the stored name MUST contain only `[a-z0-9._-]`

### Requirement: Durable References and Delivery

New managed images MUST persist a finalized key in nullable `notes.image_key` and a stable application URL `/media/<key>` in existing `notes.image_url`. Neither expiring signed URLs, credentials, pending keys, nor local paths may be persisted as delivery URLs. Existing `image_url` values MUST remain readable when `image_key` is null. The collection's `data.image` MUST remain a string for public pages, cards, carousel, and writer previews.

The read-only delivery route MUST resolve a finalized key associated with an accessible non-deleted note, generate a fresh short-lived signed GET, and redirect. It MUST NOT sign arbitrary bucket keys or pending uploads. Published images MUST be available anonymously; draft access MUST follow writer authentication. Redirects MUST use nonpersistent redirects and `Cache-Control: no-store`; draft object responses MUST also prevent shared caching, and no cache lifetime may outlive signed access. Signed links MUST NOT be persisted or logged.

#### Scenario: Expired GET does not break persisted reference

- GIVEN a published note whose previous signed GET expired
- WHEN an anonymous reader requests its stable `/media/<key>` URL
- THEN the route MUST redirect using a newly signed GET without changing the DB URL

#### Scenario: Pending, arbitrary, draft, or deleted image blocked

- GIVEN an unassociated/pending key, a soft-deleted note, or a draft requested without writer authentication
- WHEN delivery is requested
- THEN the route MUST deny access without issuing a signed GET

### Requirement: Server-Side Optimization

Every accepted image MUST be re-encoded with sharp in memory BEFORE final object write. Format MUST be preserved (no transcode). The system MUST apply `rotate()` EXIF strip, cap longest edge at 2400px (`fit: "inside"`, `withoutEnlargement`), and bail if `metadata()` reports any axis > 8000px. Invalid/unreadable dimensions MUST be rejected. The 5 MiB cap applies to INPUT before optimization. Output MUST NOT exceed input bytes; if processing cannot satisfy this, reject safely rather than publishing unvalidated/raw bytes.

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

When replacing an image, finalize a unique new object and atomically persist its key and stable URL in the note before deleting the previous managed object. Delete only a verified managed key in the configured bucket that is no longer referenced by any note; never derive deletion authority from an arbitrary URL, another post, or another bucket. When no replacement is provided, retain both existing references. Legacy local originals MUST NOT be automatically deleted.

Concurrent image replacements MUST lock the note row and obtain its actually displaced key in the same transaction as the update. Cleanup MUST use that committed displaced key, not a stale page snapshot.

#### Scenario: New image replaces existing

- GIVEN a note with an existing image
- WHEN the writer submits a new image file
- THEN the new image MUST be saved and optimized
- AND `image_key` and `image_url` MUST be updated together in the DB
- AND old managed-object deletion MUST occur only after DB success and reference checks

#### Scenario: No new image retains existing

- GIVEN a note with an existing image
- WHEN the writer submits without a new image
- THEN the existing image MUST remain available
- AND `image_url` and `image_key` MUST NOT change

#### Scenario: Cleanup gated on DB success

- GIVEN an image replacement in progress
- WHEN the DB write fails
- THEN the old image MUST remain untouched and the new unreferenced final object SHOULD be cleaned up

#### Scenario: Cleanup fails after commit

- GIVEN the replacement DB write succeeded
- WHEN deleting an old or pending object fails
- THEN the edit MUST remain successful with a sanitized operational warning, not data loss

### Requirement: Soft Delete, Orphans, and Legacy Transfer

Soft-deleting a note MUST NOT delete its assets. Successfully finalized pending objects SHOULD be removed. Abandoned pending and unreferenced finalized objects MUST have an explicit safe cleanup procedure with reference and in-flight upload checks; Neon lifecycle expiration configuration MUST NOT be relied on for automatic cleanup because expiration rules are not enforced.

Before transferring legacy files, inventory real source files and DB URLs. Any transfer/backfill tool MUST support dry-run and repeatable execution, verify destination contents before updating only matching DB references, preserve unreadable/untransferred legacy URLs, and never automatically remove local originals. Seed `/uploads/...` URLs alone are not proof of source files or successful migration. Preview operations MUST use isolated branch endpoints/credentials and MUST NOT mutate production objects or notes.

#### Scenario: Missing legacy source

- GIVEN a seed URL whose local image file is absent
- WHEN backfill runs
- THEN it MUST report the missing source without rewriting its reference or claiming a migrated image
