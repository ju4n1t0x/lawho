# Delta for Notes Collection

## MODIFIED Requirements

### Requirement: Collection Declaration

The system MUST declare a `notes` live collection in `src/live.config.ts` using `defineLiveCollection` with a `LiveLoader` that reads from PostgreSQL via `src/lib/notes-repo.ts`. The build-time `glob` loader in `src/content.config.ts` MUST be removed for the `notes` collection.

(Previously: `notes` was a build-time `glob` collection in `src/content.config.ts` over `src/content/notes/**/*.md`.)

#### Scenario: Collection loads from Postgres

- GIVEN the Astro server is running with a live DB connection
- WHEN `getLiveCollection('notes')` is called
- THEN it MUST return one entry per row in the `notes` table

#### Scenario: No build-time glob for notes

- GIVEN `src/content.config.ts` exists
- WHEN inspected
- THEN it MUST NOT contain a `notes` collection with a `glob` loader

### Requirement: Schema Fields

The live collection schema MUST declare these fields: `title` (string, MUST), `subtitle` (string, MUST), `image` (string URL, MUST), `date` (date, MUST), `draft` (boolean, default false, MUST), `featured` (boolean, default true, MUST), `author` (string, SHOULD), `tag` (string, MAY). The `image` field is now a string URL (from `PUBLIC_UPLOADS_URL`) rather than the Astro `image()` helper.

(Previously: `image` used the Astro `image()` helper resolving build-time assets.)

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

The `image` field MUST be a string URL pointing to the public origin (`PUBLIC_UPLOADS_URL` prefix). The Astro `image()` helper is no longer used for this collection.

#### Scenario: Image URL from DB

- GIVEN a note row with `image_url = '/uploads/notes/slug/photo.jpg'`
- WHEN the entry is loaded
- THEN `data.image` MUST be the string `'/uploads/notes/slug/photo.jpg'`

### Requirement: Markdown Body

Each entry MUST provide a Markdown body stored in the DB `body` column, rendered on demand via `context.renderMarkdown(body)` from the live loader context.

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

The system MUST ship at least one seed note as a DB row inserted by `migrations/001-init.sql` (or a seed script) so the blog index renders content on first deploy.

(Previously: seed note was `src/content/notes/primer-operativo-2024.md`.)

#### Scenario: Seed note present after migration

- GIVEN a fresh database with migrations applied
- WHEN `getLiveCollection('notes')` is called
- THEN at least one note entry MUST be returned
