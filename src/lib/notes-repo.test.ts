import { describe, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock("./db", () => ({ getPool: () => ({ query }) }));

import { createNote, getNoteBySlug, listPublishedNotes, slugify } from "./notes-repo";

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

describe("slugify", () => {
  it("lowercases, strips accents and collapses separators", () => {
    expect(slugify("Primer Operativo 2024")).toBe("primer-operativo-2024");
    expect(slugify("  ¡Salud Comunitaria!  ")).toBe("salud-comunitaria");
    expect(slugify("Café y Música")).toBe("cafe-y-musica");
  });

  it("falls back to a safe slug when nothing survives", () => {
    expect(slugify("¡¡¡")).toBe("nota");
  });
});

describe("createNote", () => {
  it("derives a slug from the title and inserts the row", async () => {
    query.mockClear();
    query.mockResolvedValueOnce({ rows: [] }); // no existing slug
    query.mockResolvedValueOnce({ rows: [sampleRow] }); // RETURNING

    const note = await createNote({
      title: "Primer operativo",
      subtitle: "Subtítulo",
      body: "Cuerpo",
      imageUrl: "/uploads/notes/x/foto.jpg",
      tag: "Salud comunitaria",
    });

    const insertCall = query.mock.calls[1];
    expect(insertCall[0]).toContain("INSERT INTO notes");
    expect(insertCall[1][0]).toBe("primer-operativo"); // slug
    expect(insertCall[1][4]).toBe("/uploads/notes/x/foto.jpg"); // image_url
    expect(insertCall[1][6]).toBe(false); // draft default
    expect(insertCall[1][7]).toBe(true); // featured default
    expect(note.slug).toBe("primer-operativo-2024");
  });

  it("appends a random suffix when the slug already exists", async () => {
    query.mockClear();
    query.mockResolvedValueOnce({ rows: [{ slug: "primer-operativo" }] }); // collision
    query.mockResolvedValueOnce({ rows: [sampleRow] }); // RETURNING

    const note = await createNote({
      title: "Primer operativo",
      subtitle: "Subtítulo",
      body: "Cuerpo",
      imageUrl: "",
    });

    const insertCall = query.mock.calls[1];
    expect(insertCall[1][0]).toMatch(/^primer-operativo-[a-f0-9]{6}$/);
    expect(note.slug).toBe("primer-operativo-2024");
  });
});
