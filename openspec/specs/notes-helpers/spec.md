# Notes Helpers Specification

## Purpose

Pure utility functions in `src/lib/notes.ts` for filtering, sorting, and formatting notes. Designed for unit testability with vitest.

## Requirements

### Requirement: getPublishedNotes

The system MUST provide `getPublishedNotes(collection, options?)` that returns notes filtered by draft status and sorted by date descending.

#### Scenario: Filters drafts

- GIVEN a collection with 2 published notes (draft=false) and 1 draft note (draft=true)
- WHEN `getPublishedNotes(collection)` is called
- THEN it MUST return only the 2 published notes

#### Scenario: Sorts by date descending

- GIVEN published notes dated 2024-01-01 and 2024-06-15
- WHEN `getPublishedNotes(collection)` is called
- THEN the 2024-06-15 note MUST appear first in the result

#### Scenario: featuredOnly option

- GIVEN published notes with `featured: true` and `featured: false`
- WHEN `getPublishedNotes(collection, { featuredOnly: true })` is called
- THEN only notes with `featured: true` MUST be returned

#### Scenario: Empty collection

- GIVEN an empty collection array
- WHEN `getPublishedNotes(collection)` is called
- THEN it MUST return an empty array

### Requirement: formatNoteDate

The system MUST provide `formatNoteDate(date, locale)` that formats a Date for the given locale, defaulting to es-AR style.

#### Scenario: es-AR formatting

- GIVEN a Date representing March 15, 2024
- WHEN `formatNoteDate(date, 'es-AR')` is called
- THEN it MUST return a string like "15 de marzo de 2024"

#### Scenario: Different locale

- GIVEN a Date representing March 15, 2024
- WHEN `formatNoteDate(date, 'en-US')` is called
- THEN it MUST return a string formatted in en-US style (e.g., "March 15, 2024")

### Requirement: Test Coverage

Both `getPublishedNotes` and `formatNoteDate` MUST have vitest unit test coverage in `src/lib/notes.test.ts`.

#### Scenario: All tests pass

- GIVEN the test suite runs via `pnpm test`
- WHEN tests execute
- THEN all helper tests MUST pass with no failures
