import { describe, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock("./db", () => ({ getPool: () => ({ query }) }));

import { getNoteBySlug, listPublishedNotes } from "./notes-repo";

const sampleRow = {
  slug: "primer-operativo-2024",
  title: "Primer operativo",
  subtitle: "Subtítulo",
  body: "Cuerpo en markdown",
  image_url: "/uploads/notes/primer-operativo-2024/foto.jpg",
  date: "2024-06-15",
  draft: false,
  featured: true,
  author: "Equipo LaWho",
  tag: "Salud comunitaria",
};

describe("listPublishedNotes", () => {
  it("maps rows and filters drafts in SQL", async () => {
    query.mockResolvedValueOnce({ rows: [sampleRow] });

    const notes = await listPublishedNotes();

    expect(query).toHaveBeenCalledWith(expect.stringContaining("draft = false"));
    expect(notes).toHaveLength(1);
    expect(notes[0].slug).toBe("primer-operativo-2024");
    expect(notes[0].data.image).toBe(
      "/uploads/notes/primer-operativo-2024/foto.jpg",
    );
    expect(notes[0].data.date).toBeInstanceOf(Date);
  });
});

describe("getNoteBySlug", () => {
  it("returns a mapped note for an existing slug", async () => {
    query.mockResolvedValueOnce({ rows: [sampleRow] });

    const note = await getNoteBySlug("primer-operativo-2024");

    expect(query).toHaveBeenCalledWith(expect.stringContaining("slug = $1"), [
      "primer-operativo-2024",
    ]);
    expect(note).not.toBeNull();
    expect(note?.data.title).toBe("Primer operativo");
    expect(note?.data.author).toBe("Equipo LaWho");
  });

  it("returns null for a missing slug", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    const note = await getNoteBySlug("no-existe");

    expect(note).toBeNull();
  });
});
