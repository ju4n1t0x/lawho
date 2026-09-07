# Design: Writer Dashboard — Note List, Edit & Soft Delete

## Technical Approach

Extend the DB-backed notes layer with soft delete (`deleted_at`) and add a
writer dashboard at `/escritor` (read-only) plus dedicated edit/delete routes, reusing the
existing `WriterForm` server island. Public-blog exclusion stays entirely in the
repo SQL (`deleted_at IS NULL`), so `live.config.ts` and `lib/notes.ts` are
untouched. Approach A from exploration, per confirmed decisions 1–9.

## Architecture Decisions

| Decision | Option | Tradeoff | Chosen |
|---|---|---|---|
| Delete semantics | Soft delete (`deleted_at`) vs hard delete | Hard delete loses audit/recovery | **Soft delete** |
| Dashboard render | Page-direct vs server island | Island can't receive form POSTs; page already has `Astro.locals.user` | **Page-direct** |
| Delete trigger | Plain form POST → `.ts` endpoint vs GET link | GET side-effects violate HTTP; no client JS available | **POST endpoint** |
| Edit UI | Dedicated `[slug].astro` reusing `WriterForm` vs inline modal | Modal re-implements validation/upload | **Dedicated page, `mode="update"`** |
| Image on edit | Read-only vs replace+cleanup | Replace needs orphan cleanup; deferred (risk) | **Read-only** |
| Migration idempotency | `IF NOT EXISTS` guards | `ADD COLUMN` without guard errors on re-run | **`ADD COLUMN IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS`** |

## Data Flow

```
Browser POST /escritor/eliminar/[slug]
  → middleware: locals.user? else redirect /escritor/
  → [slug].ts POST: getActiveSession → softDeleteNote(slug)
  → UPDATE notes SET deleted_at=now() WHERE slug=$1 AND deleted_at IS NULL
  → redirect /escritor/

Browser POST /escritor/editar/[slug]
  → [slug].astro POST: validate → updateNote(slug,{title,subtitle,body,tag})
  → redirect /escritor/

GET /escritor (authenticated)
  → page reads locals.user → listAllNotesIncludingDrafts()
  → WriterNoteCard[] + "+ Crear nota"
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `migrations/003-soft-delete-notes.sql` | Create | `ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL` + partial index `notes_active_idx ON notes(id) WHERE deleted_at IS NULL` |
| `src/lib/notes-repo.ts` | Modify | Add `listAllNotesIncludingDrafts`, `updateNote`, `softDeleteNote`, `NoteUpdate`; add `deleted_at IS NULL` to `listPublishedNotes`/`getNoteBySlug` |
| `src/pages/escritor/index.astro` | Modify | Conditional dashboard (user) vs login form; login redirect → `/escritor/` (read-only) |
| `src/components/WriterNoteCard.astro` | Create | Horizontal card: image left, tag/title/subtitle, Editar/`bg-sun`, Eliminar/`bg-accent` |
| `src/pages/escritor/editar/[slug].astro` | Create | Preloaded `WriterForm mode="update"`; POST calls `updateNote` |
| `src/pages/escritor/eliminar/[slug].ts` | Create | POST-only soft-delete endpoint |
| `src/components/server-islands/WriterForm.astro` | Modify | `mode` prop, preload values, `action` switch, image read-only on update |

## Interfaces / Contracts

```ts
// src/lib/notes-repo.ts
export interface NoteUpdate {
  title: string;
  subtitle: string;
  body: string;
  tag?: string;          // undefined/empty → cleared (NULL)
}
// image NOT in NoteUpdate — read-only on update
// slug NOT in NoteUpdate — immutable (WHERE slug=$1, never SET)

listAllNotesIncludingDrafts(): Promise<NoteRecord[]>   // deleted_at IS NULL, date DESC, id DESC
updateNote(slug: string, f: NoteUpdate): Promise<NoteRecord | null> // null = not found/soft-deleted
softDeleteNote(slug: string): Promise<boolean>          // true = deleted, false = not found
```

Mapper stays unchanged: `NOTE_COLUMNS` excludes `deleted_at`; `NoteData` does not
project it.

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit (vitest) | `listAllNotesIncludingDrafts` filters `deleted_at IS NULL` + order | assert SQL string + mapped rows |
| Unit | `updateNote` no slug/image in SET, `updated_at=now()`, null on missing | assert SQL + params |
| Unit | `softDeleteNote` sets `deleted_at=now()`, `WHERE ... AND deleted_at IS NULL` | assert SQL + boolean |
| Unit | `listPublishedNotes`/`getNoteBySlug` include `deleted_at IS NULL` | assert SQL string |

No e2e/integration layer exists (vitest only, per `openspec/config.yaml`).

## Threat Matrix

N/A — no shell, subprocess, VCS/PR automation, executable-file classification,
or process-integration boundary. The added HTTP routes are session-guarded
(middleware redirect + in-handler `getActiveSession` re-check), which is an auth
boundary outside this matrix.

## Migration / Rollout

Run `migrations/003-soft-delete-notes.sql` **before** deploying code (queries
reference `deleted_at`). Rollback: revert code; `DROP INDEX IF EXISTS
notes_active_idx; ALTER TABLE notes DROP COLUMN IF EXISTS deleted_at;`
non-destructive.

## Open Questions

- [ ] Draft badge on cards ("Borrador" pill) — not required by spec; include only if desired.
