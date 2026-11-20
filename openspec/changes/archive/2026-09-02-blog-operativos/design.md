# Design: Blog "Operativos de Salud" (Read Side)

## Technical Approach

Astro 7.2 content-layer `notes` collection via `glob` loader over `src/content/notes/**/*.md` with a zod schema using `image()`. Two static route pairs — index (`/operativos-de-salud/`) and detail (`[slug]`) — plus `en` mirrors (Spanish body per `i18n-setup` fallback). Shared `NoteCard` reused by blog index and Terreno; `NoteTemplate` renders the detail hero + `<Content />`. Pure helpers in `src/lib/notes.ts` (vitest) mirror `anim.test.ts`. Zero new dependencies.

## Architecture Decisions

| Decision | Choice | Alternatives / Tradeoff | Rationale |
|---|---|---|---|
| Content source | `glob` loader + Markdown + `render()` | MDX (component map, dev-unfriendly for medical volunteers); DB-backed `Live` loader now (couples read-side to deferred write-side, needs SSR adapter) | Idiomatic Astro 7.2, static build, schema stays stable for future DB-loader swap |
| Images | `image()` helper, co-located `src/content/notes/images/` | `src/assets/*.jpg` reuse (cross-note coupling); `public/` (no optimization) | Mirrors `src/assets` Vite pipeline; single swap point for future Nginx (constitution rule 5) |
| Detail routing | `[slug].astro` + `getStaticPaths()` | `[...slug].astro` (proposal wording) | Flat `src/content/notes/*.md` yields one slug segment; `params.slug` is a `string`, not `string[]` — simpler and type-correct |
| Shared card | `NoteCard` consumed by blog index AND Terreno | Duplicate markup in both | Single source; keeps `tag`/`photo-zoom` parity with current cards |
| Helpers | `src/lib/notes.ts` pure fns + vitest | Inline logic in pages (untestable) | Constitution rule 4; mirrors `anim.test.ts` |
| Terreno | Keep `id="misiones"`; cards from `featured===true` | Rename `id="terreno"` | Preserves `#misiones` anchor |
| Seed | 1 note `primer-operativo-2024` (Spanish, featured=true, draft=false) | Zero notes | Renders real content on first build |

## Data Flow

```
src/content/notes/*.md ──glob──▶ notes collection ──getCollection──▶ notes.ts helpers
                                          │                              │
                                          │ filter draft / featured      │ sort DESC
                                          ▼                              ▼
                          index.astro / Misiones.astro ──▶ NoteCard ──▶ /operativos-de-salud/<slug>/
                                          │
                                [...slug].astro ──▶ render(entry) ──▶ NoteTemplate ──▶ <Content />
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/content.config.ts` | Create | `notes` collection: `glob` loader + zod schema |
| `src/content/notes/primer-operativo-2024.md` | Create | Seed note (featured) |
| `src/content/notes/images/*.jpg` | Create | Co-located note images |
| `src/lib/notes.ts` | Create | `getPublishedNotes`, `formatNoteDate` |
| `src/lib/notes.test.ts` | Create | vitest coverage |
| `src/components/NoteCard.astro` | Create | Shared miniature `<a>` |
| `src/components/NoteTemplate.astro` | Create | Detail layout + `<Content />` |
| `src/pages/operativos-de-salud/index.astro` | Create | Blog grid |
| `src/pages/operativos-de-salud/[slug].astro` | Create | Detail route |
| `src/pages/en/operativos-de-salud/index.astro` | Create | En mirror |
| `src/pages/en/operativos-de-salud/[slug].astro` | Create | En mirror |
| `src/components/Misiones.astro` | Modify | Array → `getCollection`, `<a>`-wrap, eyebrow link |
| `src/components/NavBar.astro` | Modify | Add blog link (desktop + drawer) |
| `openspec/config.yaml` | Modify | Refresh context; `unit.available: true` |

## Interfaces / Contracts

**Collection schema** (non-obvious — content-layer API):

```ts
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const notes = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/notes" }),
  schema: ({ image }) => z.object({
    title: z.string(), subtitle: z.string(),
    image: image(), date: z.coerce.date(),
    draft: z.boolean().default(false),
    featured: z.boolean().default(true),
    author: z.string().optional(), tag: z.string().optional(),
  }),
});
export const collections = { notes };
```

**Helpers**: `getPublishedNotes(collection, { featuredOnly?: boolean }): CollectionEntry<'notes'>[]` — filters `draft !== true`, sorts `date` DESC, optional `featured===true`. `formatNoteDate(date, locale = "es-AR"): string`.

**Detail route** (`getStaticPaths` + `render`):

```ts
export async function getStaticPaths() {
  const notes = await getCollection("notes");
  return notes.filter(n => n.data.draft !== true)
    .map(note => ({ params: { slug: note.slug }, props: { note } }));
}
const { note } = Astro.props;
const { Content } = await render(note);
```

**Routes**: `/operativos-de-salud/`, `/operativos-de-salud/<slug>/`, `/en/operativos-de-salud/`, `/en/operativos-de-salud/<slug>/` (trailing slash; `prefixDefaultLocale:false`). Unknown slug → Astro 404.

**Components**: `NoteCard` props `{ note }` (renders `href="/operativos-de-salud/{note.slug}/"`); `NoteTemplate` props `{ note, Content }`.

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | `getPublishedNotes` (draft/featured filter, DESC sort, empty) | vitest, `src/lib/notes.test.ts` |
| Unit | `formatNoteDate` es-AR / en-US | vitest |
| Integration | Route emission + trailing slash | `astro build`; assert emitted `.html` for the 4 routes |
| E2E | Visual/click-through correctness | Manual nav — honest note: no browser automation |

## Threat Matrix

`N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.`

## Migration / Rollout

No migration required — greenfield read-side; content dir starts with 1 seed note. The `glob` loader is a documented seam: schema stays stable when the write-side ships a DB-backed loader.

## Open Questions

- [ ] Seed note copy — user approval of the placeholder text (primer-operativo-2024).
- [ ] Nginx image migration timing — `image()` base-path swap is the seam, not this change.
- [ ] `[slug].astro` vs proposal's `[...slug].astro` — confirmed flat slugs warrant `[slug]`; flag if nested paths are ever intended.
