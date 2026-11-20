# Notes Collection Specification

## Purpose

Defines the `notes` content collection: schema, loader, and the contract between the read-side and the future write-side (DB/loader swap).

## Requirements

### Requirement: Collection Declaration

The system MUST declare a `notes` collection in `src/content.config.ts` using a `glob` loader over `src/content/notes/**/*.md`.

#### Scenario: Collection loads Markdown entries

- GIVEN the Astro build runs
- WHEN `getCollection('notes')` is called
- THEN it MUST return one entry per `.md` file under `src/content/notes/`

### Requirement: Schema Fields

The zod schema MUST declare these fields: `title` (string, MUST), `subtitle` (string, MUST), `image` (image() helper, MUST), `date` (date, MUST), `draft` (boolean, default false, MUST), `featured` (boolean, default true, MUST), `author` (string, SHOULD), `tag` (string, MAY).

#### Scenario: Required fields validated

- GIVEN a note frontmatter missing `title`
- WHEN the collection loads
- THEN the build MUST fail with a schema validation error

#### Scenario: Optional fields omitted

- GIVEN a note frontmatter without `author` and `tag`
- WHEN the collection loads
- THEN the entry MUST load successfully with `author` and `tag` as undefined

#### Scenario: Defaults applied

- GIVEN a note frontmatter without `draft` or `featured`
- WHEN the collection loads
- THEN `draft` MUST be `false` and `featured` MUST be `true`

### Requirement: Image Helper

The `image` field MUST use the Astro `image()` schema helper so images are resolved and optimized at build time.

#### Scenario: Image resolved from frontmatter

- GIVEN a note with `image: ./images/photo.jpg` in frontmatter
- WHEN the entry is loaded
- THEN `data.image` MUST be an `ImageMetadata` object pointing to the resolved asset

### Requirement: Markdown Body

Each entry MUST provide a Markdown body accessible via `await render(entry)`.

#### Scenario: Body renders via Content component

- GIVEN a note entry with Markdown body
- WHEN `await render(entry)` is called
- THEN the result MUST include a `Content` component that renders the Markdown body as HTML

### Requirement: Write-Side Contract Stability

The schema fields and their types MUST remain stable across loader migrations (e.g., future swap from `glob` to a database-backed loader).

#### Scenario: Loader swap preserves schema

- GIVEN the `notes` collection is migrated from `glob` to a database-backed loader
- WHEN entries are loaded
- THEN the `data` shape MUST match the current zod schema exactly

### Requirement: Seed Note

The system MUST ship at least one seed note (e.g., `primer-operativo-2024.md`) so the blog index and Terreno section render content on first build.

#### Scenario: Seed note present

- GIVEN a fresh checkout of the repository
- WHEN the Astro build runs
- THEN at least one note entry MUST be returned by `getCollection('notes')`
