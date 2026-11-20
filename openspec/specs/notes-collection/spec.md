# Notes Collection Specification

## Purpose

Defines the PostgreSQL-backed live `notes` collection, Markdown rendering, and stable read/write image references on Vercel Node.

## Requirements

### Requirement: Collection Declaration

The system MUST declare a `notes` live collection in `src/live.config.ts` using `defineLiveCollection` with a `LiveLoader` that reads from PostgreSQL via `src/lib/notes-repo.ts`. The build-time `glob` loader in `src/content.config.ts` MUST be removed for the `notes` collection.

#### Scenario: Collection loads from Postgres

- GIVEN the Astro server is running with a live DB connection
- WHEN `getLiveCollection('notes')` is called
- THEN it MUST return one entry per published, non-deleted row in the `notes` table

#### Scenario: No build-time glob for notes

- GIVEN `src/content.config.ts` exists
- WHEN inspected
- THEN it MUST NOT contain a `notes` collection with a `glob` loader

### Requirement: Schema Fields

The live collection schema MUST declare these fields: `title` (string, MUST), `subtitle` (string, MUST), `image` (string URL, MUST), `date` (date, MUST), `draft` (boolean, default false, MUST), `featured` (boolean, default true, MUST), `author` (string, SHOULD), `tag` (string, MAY). The `image` field remains a stable URL string rather than the Astro `image()` helper; adding database storage metadata MUST NOT change this public data shape.

#### Scenario: Required fields validated

- GIVEN a DB row missing `title`
- WHEN the live loader maps the row
- THEN the entry MUST be rejected or the row MUST NOT be inserted without a title

#### Scenario: Optional fields omitted

- GIVEN a DB row without `author` and `tag`
- WHEN the live loader maps the row
- THEN the entry MUST load successfully with `author` and `tag` as undefined

#### Scenario: Defaults applied

- GIVEN a DB row without explicit `draft` or `featured`
- WHEN the live loader maps the row
- THEN `draft` MUST be `false` and `featured` MUST be `true`

### Requirement: Image Field

The `image` field MUST remain a string copied from compatible `image_url` references: a stable `/media/<key>` URL for new managed images or an existing legacy URL when `image_key` is null. The Astro `image()` helper is not used for this collection. No expiring signed GET, storage credential, or pending object key may be exposed as a persisted collection image reference. Public pages, cards, carousel, and writer previews MUST keep consuming `data.image` without a type change.

#### Scenario: Image URL from DB

- GIVEN a note row with `image_url = '/uploads/notes/slug/photo.jpg'`
- WHEN the entry is loaded
- THEN `data.image` MUST be the string `'/uploads/notes/slug/photo.jpg'`

#### Scenario: Managed image survives signed-link expiry

- GIVEN a note with a finalized `image_key` and `image_url = '/media/<key>'`
- WHEN the entry is loaded after an earlier signed GET expires
- THEN `data.image` MUST still be the stable `/media/<key>` string
- AND the delivery route MUST issue a new signed GET only after checking note accessibility

### Requirement: Markdown Body

Each entry MUST provide a Markdown body stored in the DB `body` column and rendered on demand into the live entry's `rendered.html` with the existing server-side Markdown helper and authorized `@astrojs/markdown-satteri` pipeline. Storage/deployment changes MUST preserve Markdown semantics and MUST NOT replace the body with plain text or pre-signed image data.

#### Scenario: Body renders via renderMarkdown

- GIVEN a note entry with Markdown body in the DB
- WHEN the page renders the body
- THEN the result MUST be HTML equivalent to rendering the Markdown

### Requirement: Write-Side Contract Stability

The schema fields and their types MUST remain stable across the loader migration from `glob` to `LiveLoader`.

#### Scenario: Loader swap preserves schema

- GIVEN the `notes` collection is migrated from `glob` to a `LiveLoader`
- WHEN entries are loaded
- THEN the `data` shape MUST match the schema exactly

### Requirement: Seed Note

Historical `migrations/001-init.sql` MUST remain unchanged and its existing example note MUST be disclosed for fresh databases. It creates no writer account and does not supply the `/uploads/...` image file. `002-seed-terreno.sql` is optional sample content and MUST NOT run in the default schema migration command. Do not silently add all samples to production or claim their images were transferred without verified sources.

#### Scenario: Seed note present after migration

- GIVEN a fresh database with migrations applied
- WHEN `getLiveCollection('notes')` is called
- THEN at least one note entry MUST be returned

### Requirement: List All Notes Including Drafts

The system MUST provide a `listAllNotesIncludingDrafts` function in `src/lib/notes-repo.ts` that returns all notes where `deleted_at IS NULL`, including drafts (`draft = true`), ordered by `date DESC` (newest first). Each returned row MUST include `slug`, `title`, `subtitle`, `image`, `tag`, `date`, and `draft`.

#### Scenario: Returns all non-deleted notes

- GIVEN 5 notes exist (2 published, 2 drafts, 1 soft-deleted)
- WHEN `listAllNotesIncludingDrafts()` is called
- THEN it MUST return 4 notes (published + drafts, excluding the soft-deleted one)

#### Scenario: Ordered newest first

- GIVEN 3 non-deleted notes with dates Jan 5, Jan 10, Jan 15
- WHEN `listAllNotesIncludingDrafts()` is called
- THEN the results MUST be ordered: Jan 15, Jan 10, Jan 5

#### Scenario: Empty table

- GIVEN no notes exist in the table
- WHEN `listAllNotesIncludingDrafts()` is called
- THEN it MUST return an empty array

### Requirement: Update Note

The system MUST provide an `updateNote` function in `src/lib/notes-repo.ts` that updates an existing non-deleted note by `slug`. The function MUST NOT change the `slug` field under any circumstance. When a validated replacement is supplied, `imageKey` and `imageUrl` MUST update `image_key` and `image_url` atomically in the same DB write. When omitted, both current references MUST remain unchanged, including a null legacy key. Arbitrary client URLs/keys MUST NOT bypass upload finalization.

#### Scenario: Update title and subtitle

- GIVEN a note with slug `mi-post`
- WHEN `updateNote('mi-post', { title: 'Nuevo', subtitle: 'Sub' })` is called
- THEN the note's `title` and `subtitle` MUST be updated in the database

#### Scenario: Slug immutable on update

- GIVEN a note with slug `mi-post`
- WHEN `updateNote('mi-post', { slug: 'otro-slug' })` is called
- THEN the slug MUST remain `mi-post`
- AND no error MUST be thrown

#### Scenario: Image retained without replacement

- GIVEN a note with image `/uploads/notes/mi-post/photo.jpg` and null `image_key`
- WHEN a text-only update is performed without image fields
- THEN both image references MUST remain unchanged

#### Scenario: Finalized replacement persisted together

- GIVEN a validated replacement with a new finalized key and matching stable `/media/<key>` URL
- WHEN `updateNote` succeeds
- THEN both references MUST change together before any old-object deletion is attempted

#### Scenario: Non-existent slug

- GIVEN no note with slug `ghost`
- WHEN `updateNote('ghost', { title: 'X' })` is called
- THEN it MUST throw or return an error indicating the note was not found

### Requirement: Soft Delete Note

The system MUST provide a `softDeleteNote` function in `src/lib/notes-repo.ts` that sets `deleted_at` to the current timestamp for the note matching the given slug. It MUST NOT delete images or clear stored image references; managed-image delivery MUST deny access once the associated note is inaccessible.

#### Scenario: Soft delete sets timestamp

- GIVEN a note with slug `mi-post` and `deleted_at IS NULL`
- WHEN `softDeleteNote('mi-post')` is called
- THEN the note's `deleted_at` MUST be set to a non-null timestamp

#### Scenario: Note excluded from public blog after soft delete

- GIVEN a note with slug `mi-post` that has just been soft-deleted
- WHEN `listPublishedNotes()` or `getNoteBySlug('mi-post')` is called
- THEN the note MUST NOT be returned

#### Scenario: Non-existent slug

- GIVEN no note with slug `ghost`
- WHEN `softDeleteNote('ghost')` is called
- THEN it MUST throw or return an error indicating the note was not found

### Requirement: Migration 003 Soft Delete

The system MUST ship a migration file `migrations/003-soft-delete-notes.sql` that adds a `deleted_at TIMESTAMPTZ NULL` column to the `notes` table and a partial index on notes where `deleted_at IS NULL`.

#### Scenario: Migration adds column

- GIVEN the migration is applied to the database
- WHEN inspecting the `notes` table schema
- THEN the column `deleted_at` MUST exist with type `TIMESTAMPTZ` and default `NULL`

#### Scenario: Partial index created

- GIVEN the migration is applied
- WHEN inspecting database indexes
- THEN a partial index on `notes` where `deleted_at IS NULL` MUST exist

### Requirement: List Published Notes

The system MUST provide a `listPublishedNotes` function that returns all notes where `draft = false` AND `deleted_at IS NULL`, ordered by `date DESC`.

(Previously: returned notes where `draft = false` without `deleted_at` filtering)

#### Scenario: Published notes only

- GIVEN 3 notes: 2 published, 1 draft
- WHEN `listPublishedNotes()` is called
- THEN only the 2 published notes MUST be returned

#### Scenario: Soft-deleted notes excluded from public

- GIVEN a published note with `deleted_at` set
- WHEN `listPublishedNotes()` is called
- THEN that note MUST NOT be returned

#### Scenario: Ordered newest first

- GIVEN 3 published non-deleted notes with dates Jan 5, Jan 10, Jan 15
- WHEN `listPublishedNotes()` is called
- THEN the results MUST be ordered: Jan 15, Jan 10, Jan 5

### Requirement: Additive Image Key Migration

A new migration after the historical schema migrations MUST add nullable `notes.image_key` (text) without dropping/changing `image_url` or rewriting previously applied SQL. Existing rows MUST retain their URLs with null keys. New managed uploads MUST store a finalized key plus matching stable delivery URL; legacy backfill MAY set these only after verifying the destination image. Collection mapping MUST remain compatible with unmigrated legacy images.

#### Scenario: Existing rows survive migration

- GIVEN notes with legacy `image_url` values
- WHEN the additive migration runs
- THEN `image_key` MUST exist and remain null for those rows
- AND their URLs and Markdown bodies MUST remain unchanged

### Requirement: Get Note By Slug

The system MUST provide a `getNoteBySlug` function that returns a single note matching the given slug, only if `deleted_at IS NULL`.

(Previously: returned a note by slug without `deleted_at` filtering)

#### Scenario: Note found and not deleted

- GIVEN a note with slug `mi-post` and `deleted_at IS NULL`
- WHEN `getNoteBySlug('mi-post')` is called
- THEN the note MUST be returned

#### Scenario: Note soft-deleted

- GIVEN a note with slug `mi-post` and `deleted_at` set
- WHEN `getNoteBySlug('mi-post')` is called
- THEN `null` MUST be returned
