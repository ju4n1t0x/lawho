import { describe, expect, it, vi } from "vitest";

const { listPublishedNotes, getNoteBySlug } = vi.hoisted(() => ({
  listPublishedNotes: vi.fn(),
  getNoteBySlug: vi.fn(),
}));

vi.mock("./lib/notes-repo", () => ({ listPublishedNotes, getNoteBySlug }));
vi.mock("./lib/markdown", () => ({
  renderMarkdown: vi.fn(async (body: string) => `<p>${body}</p>`),
}));
vi.mock("astro:content", () => ({
  defineLiveCollection: (config: unknown) => config,
}));

import { collections } from "./live.config";

const sampleNote = {
  slug: "primer-operativo-2024",
  data: {
    title: "Primer operativo",
    subtitle: "Subtítulo",
    image: "/uploads/notes/primer-operativo-2024/foto.jpg",
    date: new Date("2024-06-15"),
    draft: false,
    featured: true,
    author: "Equipo LaWho",
    tag: "Salud comunitaria",
  },
  body: "# Primer operativo",
};

describe("live notes collection", () => {
  it("loadCollection returns entries with rendered.html", async () => {
    listPublishedNotes.mockResolvedValueOnce([sampleNote]);

    const result = await collections.notes.loader.loadCollection({
      collection: "notes",
    });

    expect(result).toHaveProperty("entries");
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].id).toBe("primer-operativo-2024");
    expect(result.entries[0].rendered.html).toBe("<p># Primer operativo</p>");
  });

  it("loadEntry returns a rendered entry for an existing slug", async () => {
    getNoteBySlug.mockResolvedValueOnce(sampleNote);

    const entry = await collections.notes.loader.loadEntry({
      filter: { id: "primer-operativo-2024" },
      collection: "notes",
    });

    expect(entry).not.toBeUndefined();
    expect(entry?.id).toBe("primer-operativo-2024");
    expect(entry?.rendered.html).toBe("<p># Primer operativo</p>");
  });

  it("loadEntry returns undefined for a missing slug", async () => {
    getNoteBySlug.mockResolvedValueOnce(null);

    const entry = await collections.notes.loader.loadEntry({
      filter: { id: "no-existe" },
      collection: "notes",
    });

    expect(entry).toBeUndefined();
  });
});
