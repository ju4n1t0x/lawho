# Notes Collection — Delta

## ADDED Requirements

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

The system MUST provide an `updateNote` function in `src/lib/notes-repo.ts` that updates an existing note by `slug`. The function MUST NOT change the `slug` field under any circumstance. The `image` field MUST be read-only on update — existing image URL is preserved, no new image is accepted through this function.

#### Scenario: Update title and subtitle

- GIVEN a note with slug `mi-post`
- WHEN `updateNote('mi-post', { title: 'Nuevo', subtitle: 'Sub' })` is called
- THEN the note's `title` and `subtitle` MUST be updated in the database

#### Scenario: Slug immutable on update

- GIVEN a note with slug `mi-post`
- WHEN `updateNote('mi-post', { slug: 'otro-slug' })` is called
- THEN the slug MUST remain `mi-post`
- AND no error MUST be thrown

#### Scenario: Image read-only on update

- GIVEN a note with image `/uploads/notes/mi-post/photo.jpg` (read-only)
- WHEN `updateNote('mi-post', { image: '/uploads/notes/mi-post/new.jpg' })` is called
- THEN the image MUST remain `/uploads/notes/mi-post/photo.jpg` (read-only)

#### Scenario: Non-existent slug

- GIVEN no note with slug `ghost`
- WHEN `updateNote('ghost', { title: 'X' })` is called
- THEN it MUST throw or return an error indicating the note was not found

### Requirement: Soft Delete Note

The system MUST provide a `softDeleteNote` function in `src/lib/notes-repo.ts` that sets `deleted_at` to the current timestamp for the note matching the given slug.

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

## MODIFIED Requirements

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
