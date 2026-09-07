# Exploration: `/escritor` (read-only) Writer Dashboard — Note List

## Current State

### `/escritor` (read-only) page (`src/pages/escritor/index.astro`)
- Pure login page (`prerender = false`). Renders `<LoginForm server:defer />` only.
- Owns the POST handler: it reads email/password from `formData`, calls `checkPassword`, on success creates a session via `createSession`, sets the session cookie and `Astro.redirect("/escritor/nueva")`.
- **There is no list of notes after login.** The login flow always lands the writer on `/escritor/nueva` (read-only), which is the create-note form. No dashboard, no overview, no index of existing notes.

### In-island session check
- The `LoginForm` server island re-checks the session cookie via `getActiveSessionAndTouch` in-island (server islands run in an isolated context, so page middleware does not protect them). When authenticated, the island renders a "Sesión iniciada" panel with a logout button — no writer UI.
- The `WriterForm` server island does the same check: unauthenticated visitors see a "Necesitás iniciar sesión" panel with a link back to login.

### `/escritor/nueva` (read-only) page (`src/pages/escritor/nueva.astro`)
- Protected by middleware (`Astro.locals.user` is populated).
- The page owns the POST handler for publishing a note:
  - Reads `title`, `subtitle`, `body`, `tag` from `formData`.
  - Validates required fields; on missing fields returns a Spanish error.
  - Slug = `slugify(title)`.
  - If a file image is uploaded, persists it via `saveImageUpload` (filesystem + magic-byte MIME check, 5MB cap).
  - Calls `createNote({ title, subtitle, body, imageUrl, slug, tag })` and `Astro.redirect(\`/operativos-de-salud/${note.slug}/\` (read-only))`.
- The `WriterForm` server island renders the multipart form (title, subtitle, body textarea, tag, image) and posts to `/escritor/nueva` (read-only).

### Notes repo (`src/lib/notes-repo.ts`)
- Exports: `slugify`, `listPublishedNotes`, `getNoteBySlug`, `createNote`.
- `NOTE_COLUMNS` = `slug, title, subtitle, body, image_url, date, draft, featured, author, tag`.
- `listPublishedNotes`: `SELECT … FROM notes WHERE draft = false ORDER BY date DESC, id DESC`.
- `getNoteBySlug`: `SELECT … FROM notes WHERE slug = $1`.
- `createNote`: ensures slug uniqueness with random suffix; defaults `draft=false`, `featured=true`.
- **There is no `updateNote`, no `deleteNote`, no `softDeleteNote`, no `listAllNotes` (including drafts).** The writer dashboard cannot read drafts or modify/delete existing notes today.

### DB schema (`migrations/001-init.sql`)
- `notes` columns: `id, slug UNIQUE, title, subtitle, body, image_url, date, draft, featured, author, tag, created_at, updated_at`.
- **No `deleted_at`, no `is_deleted`, no `status` column.** Soft-delete would require a new migration.
- `users` columns: `id, email (citext UNIQUE), password_hash, role, is_active, created_at`.
- `sessions`: standard session row.

### Session / auth (`src/middleware.ts`, `src/lib/session-repo.ts`)
- `Astro.locals.user` is set in the middleware for every `/escritor/**` (read-only) request when a valid session cookie exists. Shape: `{ id, email, role }`.
- `/escritor` (read-only) and `/escritor/logout` (read-only) are explicitly excluded from the redirect guard, so the login form and logout endpoint stay reachable.
- Server islands still need to re-check the session cookie internally (`getActiveSessionAndTouch`) because middleware does not run in their isolated context.
- Sliding TTL is renewed on every authenticated request.

### Live collection (`src/live.config.ts`, `src/lib/notes.ts`)
- `defineLiveCollection` loader reads through `listPublishedNotes` and `getNoteBySlug` and renders Markdown via `renderMarkdown`.
- `getPublishedNotes(entries, opts)` in `lib/notes.ts` filters `draft !== true` and (optionally) `featuredOnly`. Used by:
  - `src/pages/operativos-de-salud/index.astro` (Spanish blog index)
  - `src/pages/en/operativos-de-salud/index.astro` (English blog index)
  - `src/components/Misiones.astro` (Terreno carousel, `featuredOnly: true`)
- The detail page `src/pages/operativos-de-salud/[slug].astro` calls `getLiveEntry("notes", slug)` and 404s if missing.

### Look & feel (`src/styles/global.css`)
Design tokens (`@theme inline`) mapped to `:root` variables (all `oklch`):

| Token | Variable | oklch | Used by |
|-------|----------|-------|---------|
| `primary` | `--primary` | `0.678 0.181 49.5` (orange) | WriterForm/LoginForm submit buttons, primary CTA |
| `accent` | `--accent` | `0.615 0.22 25.5` (red-orange) | NavBar CTA, Donar CTA, hover accents, link underlines |
| `sun` | `--sun` | `0.939 0.198 105.3` (yellow) | Tag eyebrows (`NoteCard`, `NoteTemplate`), Hero floaty chip |
| `leaf` | `--leaf` | `0.589 0.161 150.2` (green) | Impacto section background, Hero floaty chip |
| `sky`, `violet`, `border`, `card`, `muted`, etc. | various | various | Misc surfaces |

- **Pure "danger red" token does NOT exist** — the design system's red is `accent` (red-orange).
- Note cards use `bg-card`, `rounded-[2rem]`, `lift`, `photo-zoom`, tag eyebrow `bg-sun`.

### Existing button styles
- Primary CTAs: `rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2`
- Donar-style accent: `rounded-full bg-accent px-6 py-3 text-sm font-bold text-accent-foreground transition-transform hover:scale-105`

## Affected Areas

- `src/pages/escritor/index.astro` — currently pure login page. **Must become the writer dashboard** (list + create button) when authenticated, while still serving the login form when not.
- `src/pages/escritor/nueva.astro` — existing create flow; stays as the dedicated "create" page reachable from the dashboard's "+ Crear nota" button.
- `src/pages/escritor/editar/[slug].astro` (NEW) — reuses `WriterForm` with prefilled values from `getNoteBySlug`.
- `src/pages/escritor/eliminar/[slug].ts` (NEW) or in-page POST handling on the dashboard — soft-delete endpoint.
- `src/components/server-islands/WriterForm.astro` — needs an `update` mode (preload values + change `action` to `/escritor/editar/[slug]` (read-only)). Reuses the existing form fields and validation. Must remain a server island so the in-island session check keeps working.
- `src/components/NoteCard.astro` — **stays as-is for the public blog**. The dashboard uses its own horizontal variant (image left, buttons right) — either a new `WriterNoteCard.astro` component or an inline layout in the dashboard page. Reusing `NoteCard` is NOT a good fit because it wraps the whole card in `<a href="/operativos-de-salud/...">`, which would navigate away from the dashboard on click.
- `src/lib/notes-repo.ts` — needs `listAllNotesIncludingDrafts` (for the dashboard), `updateNote(slug, patch)` and `softDeleteNote(slug)`.
- `src/lib/notes-mapper.ts` — currently maps raw rows; if `deleted_at` is added it could surface it (or stay agnostic and filter upstream).
- `src/lib/notes.ts` — `getPublishedNotes` keeps its JS-side `draft !== true` filter. The DB-side `draft = false` filter in `listPublishedNotes` and the `slug = $1` filter in `getNoteBySlug` become the second line of defense once the migration adds `deleted_at`.
- `src/live.config.ts` — uses `listPublishedNotes` and `getNoteBySlug`. The repo functions are the single filter point.
- `migrations/003-soft-delete-notes.sql` (NEW) — `ALTER TABLE notes ADD COLUMN deleted_at timestamptz NULL;` plus a partial index for fast non-deleted lookups.
- `src/styles/global.css` — possibly add a `--color-danger` token if we want a semantic red distinct from `accent`. Otherwise `accent` is the red in the system.

## Approaches

### A. New dashboard at `/escritor` (read-only) + dedicated edit/delete pages

**Description**: Replace the pure login layout on `src/pages/escritor/index.astro` with a conditional: if `Astro.locals.user`, render the writer dashboard (list of all notes incl. drafts as horizontal cards + "+ Crear nota"); else render the existing `LoginForm` island. Reuse `WriterForm` on a new `/escritor/editar/[slug]` (read-only) page that preloads values via `getNoteBySlug`. Delete via a page-POST endpoint or a dedicated `.ts` API route that calls `softDeleteNote`. Add soft-delete column + repo functions.

- Pros:
  - Lowest blast radius — adds pages rather than rewriting the create flow.
  - `WriterForm` is reused almost verbatim (just adds an `update` mode + edit page route).
  - Plain HTML forms on the dashboard post to dedicated endpoints; no server-island POST gymnastics needed.
  - Soft-delete keeps the DB tidy: existing rows gain `deleted_at NULL` and stay queryable for recovery/audit.
  - Public blog exclusion lives entirely in the repo (`listPublishedNotes` and `getNoteBySlug` SQL get a `deleted_at IS NULL` filter) — `live.config.ts` and `getPublishedNotes` need no changes.
- Cons:
  - Requires a migration; deploy needs `psql -f migrations/003-...`.
  - Three new endpoints (`/escritor/editar/[slug]` (read-only), `/escritor/eliminar/[slug]` (read-only), plus dashboard page) — modest surface growth.
  - The dashboard is a non-island render that touches the session twice (middleware + page). Server islands inside the dashboard aren't strictly necessary; we can render the list in the page directly.
- Effort: **Medium** (one migration, three repo functions, two new pages, one new dashboard view, optional `WriterNoteCard` component).

### B. Pure server-island dashboard (no new endpoints)

**Description**: Make the dashboard a single server island that mounts inside `/escritor/index.astro` (read-only), handles POSTs to itself for delete (no separate endpoints), and re-renders on every action.

- Pros: Consistent with the existing `WriterForm`/`LoginForm` island pattern.
- Cons: Server islands cannot receive native form POSTs (this is the exact constraint the comment on `WriterForm.astro:18` documents — "Server islands cannot receive form POSTs"). Without a page POST, we'd need a `fetch` + JS handler, which breaks Astro's progressive-enhancement stance and adds client JS.
- Effort: **High** + violates a documented invariant of the existing codebase. **Reject.**

### C. Inline edit on dashboard modal (no separate edit page)

**Description**: Dashboard renders cards; clicking "Editar" reveals an inline edit form on the same page (e.g., an HTML `<details>` element or a `dialog`).

- Pros: No new page; everything in one URL.
- Cons: Re-implements the `WriterForm` server-island context (validation, file upload, image replacement) inline; the slug directory key would need to handle image updates carefully. Significantly more complex than reusing `WriterForm` on a dedicated edit page.
- Effort: **High**. **Reject** for v1.

## Recommendation

**Approach A**, with these concrete decisions:

1. **Dashboard at `/escritor` (read-only)**: `src/pages/escritor/index.astro` becomes conditional. When `Astro.locals.user` exists, render the list (no `server:defer` needed — the page itself reads the user via the middleware and queries `listAllNotesIncludingDrafts()`). When no user, fall through to the existing `LoginForm` island path (login POST still works on the same page).

2. **Notes repo additions** (`src/lib/notes-repo.ts`):
   - `listAllNotesIncludingDrafts()`: `SELECT … FROM notes WHERE deleted_at IS NULL ORDER BY date DESC, id DESC` (drafts + published, excludes soft-deleted).
   - `updateNote(slug, patch)`: `UPDATE notes SET … updated_at = now() WHERE slug = $1 AND deleted_at IS NULL RETURNING …`. Patch fields: `title`, `subtitle`, `body`, `imageUrl`, `tag`, `draft`, `featured`.
   - `softDeleteNote(slug)`: `UPDATE notes SET deleted_at = now() WHERE slug = $1 AND deleted_at IS NULL RETURNING slug`.

3. **Migration `migrations/003-soft-delete-notes.sql`**:
   ```sql
   ALTER TABLE notes ADD COLUMN deleted_at timestamptz NULL;
   CREATE INDEX IF NOT EXISTS notes_active_idx ON notes (deleted_at) WHERE deleted_at IS NULL;
   ```

4. **Public blog exclusion**: update both `listPublishedNotes` and `getNoteBySlug` in `notes-repo.ts` to add `AND deleted_at IS NULL` to their `WHERE` clauses. `live.config.ts` and `lib/notes.ts` need no changes — they already delegate filtering to the repo and never expose soft-deleted rows.

5. **Edit page** `src/pages/escritor/editar/[slug].astro`:
   - Middleware-protected.
   - Loads the existing note via `getNoteBySlug`.
   - If missing → 404 redirect to `/escritor/` (read-only).
   - Renders `<WriterForm server:defer mode="update" slug={slug} error={error} values={…} />`.
   - POST handler validates and calls `updateNote(slug, patch)`; redirects back to `/escritor/` (read-only).

6. **Delete endpoint** `src/pages/escritor/eliminar/[slug].ts` (POST handler):
   - Validates session (middleware already does this).
   - Calls `softDeleteNote(slug)`.
   - Redirects back to `/escritor/` (read-only).

7. **Card layout** for the dashboard: new `src/components/WriterNoteCard.astro` (NOT `NoteCard`, which is a full-card anchor to the public URL). Horizontal: image left (`w-32 aspect-square rounded-2xl`), text middle (tag eyebrow + title + subtitle), buttons right ("Editar" → `bg-sun text-sun-foreground`, "Eliminar" → `bg-accent text-accent-foreground`).

8. **Color tokens mapping** (no new tokens needed):
   - "+ Crear nota" GREEN → `bg-leaf text-leaf-foreground` (existing token).
   - "Editar" YELLOW → `bg-sun text-sun-foreground` (existing token; already used for tag eyebrows).
   - "Eliminar" RED → `bg-accent text-accent-foreground` (existing token; the system's only "red" — used for Donar CTA, NavBar CTAs).
   - All three reuse the standard rounded-full + focus-ring pattern.

9. **`WriterForm` update mode**: extend `WriterForm.astro` to accept an optional `mode: 'create' | 'update'`, optional `slug`, and change `action` and submit-button text accordingly. Validation and image-upload logic stay identical.

## Risks

- **Migration deploy order**: the new `updateNote` and `softDeleteNote` functions reference `deleted_at`. If the app boots before the migration runs, queries will fail with `column "deleted_at" does not exist`. Mitigation: the migration must run before the new code deploys, and queries must include `AND deleted_at IS NULL` from day one (not as a follow-up).
- **Image update on edit**: if the writer replaces the image on `/escritor/editar/[slug]` (read-only), the old image file under `UPLOADS_DIR/notes/<slug>/` stays on disk unless we add cleanup. Existing create flow does not delete old images either. Either add a `replaceImage` helper or accept orphaned files (filesystem-only impact, no DB issue).
- **Race between delete and edit**: if a writer deletes a note while another writer edits it, the edit will 404 silently (the row is filtered out). Acceptable for a single-admin site, but worth a Spanish error message on the edit page if `getNoteBySlug` returns null.
- **Authorization scope**: middleware guards all `/escritor/**` (read-only) for any logged-in user. There is no per-author filter — any writer sees and can delete any other writer's notes. The `notes.author` column exists but is informational. If the site grows past a single trusted writer, role-based checks (`Astro.locals.user.role`) will be needed. Not blocking for this change, but should be flagged in the proposal.
- **Slug immutability on update**: `updateNote` should NOT change the slug (the public URL would break). The edit form must not expose slug as an input — `slugify(title)` happens only on create.
- **Dashboard visibility when list is empty**: the page must still show "+ Crear nota" when there are zero notes. Empty-state copy in Spanish ("Todavía no hay notas. Creá la primera.") recommended.

## Open Questions

- Should the dashboard filter out drafts by default (only show published + drafts as separate sections) or show everything together? Current proposal: show all (incl. drafts) in one list, ordered by `date DESC`. Drafts could be visually marked with a `bg-muted` tag pill "Borrador".
- Should "Eliminar" prompt for confirmation? Native `<form>` POST with no JS means a single click deletes. Recommend a `<form onsubmit="return confirm('¿Eliminar esta nota?')">` inline confirm, or a `dialog`/details pattern. No client JS available — using a simple `onsubmit` confirm is acceptable.
- Should edit allow changing the cover image, or only text fields in v1? Image replacement on edit is the most complex part (file cleanup). Recommend v1: image is read-only on edit (current image shown but no file input). A "Cambiar imagen" toggle can come later.

## Ready for Proposal

Yes — Approach A is concrete, scoped, and reuses most existing code. The proposal phase should:

1. Add the `notes-collection` (or new `writer-dashboard`) domain spec covering: dashboard list, edit page, delete endpoint, `updateNote`/`softDeleteNote` repo functions, and the soft-delete migration.
2. MODIFY the `writer-form` spec to cover the `update` mode of `WriterForm`.
3. MODIFY the `notes-collection` spec to require `deleted_at IS NULL` filtering in both `listPublishedNotes` and `getNoteBySlug` (public-blog exclusion).
4. Design phase covers: dashboard layout, color-token mapping per button, server-island vs page-POST choices, migration script shape.
5. Tasks: migration → repo functions → repo tests → dashboard page → edit page → delete endpoint → WriterForm update mode → integration test (`pnpm test`).
