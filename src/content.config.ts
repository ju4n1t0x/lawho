import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const notes = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/notes" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      subtitle: z.string(),
      image: image(),
      date: z.coerce.date(),
      draft: z.boolean().default(false),
      featured: z.boolean().default(true),
      author: z.string().optional(),
      tag: z.string().optional(),
    }),
});

export const collections = { notes };
