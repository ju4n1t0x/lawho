import { defineLiveCollection } from "astro:content";
import { z } from "astro/zod";
import { listPublishedNotes, getNoteBySlug } from "./lib/notes-repo";
import { renderMarkdown } from "./lib/markdown";

/**
 * Live-collection schema for `notes`. `image` is now a public URL string
 * (from `PUBLIC_UPLOADS_URL`), not the build-time `image()` helper.
 */
const notesSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  image: z.string(),
  date: z.coerce.date(),
  draft: z.boolean().default(false),
  featured: z.boolean().default(true),
  author: z.string().optional(),
  tag: z.string().optional(),
});

export const collections = {
  notes: defineLiveCollection({
    loader: {
      name: "pg-notes",
      async loadCollection() {
        const notes = await listPublishedNotes();
        return {
          entries: await Promise.all(
            notes.map(async (note) => ({
              id: note.slug,
              data: note.data,
              rendered: { html: await renderMarkdown(note.body) },
            })),
          ),
        };
      },
      async loadEntry({ filter }) {
        const note = await getNoteBySlug(filter.id);
        if (!note) return undefined;
        return {
          id: note.slug,
          data: note.data,
          rendered: { html: await renderMarkdown(note.body) },
        };
      },
    },
    schema: notesSchema,
  }),
};
