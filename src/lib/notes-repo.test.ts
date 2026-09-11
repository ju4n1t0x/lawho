import { describe, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock("./db", () => ({ getPool: () => ({ query }) }));

import {
  createNote,
  getNoteBySlug,
  listAllNotesIncludingDrafts,
  listPublishedNotes,
  slugify,
  softDeleteNote,
  updateNote,
} from "./notes-repo";

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
  it("maps rows and filters drafts and soft-deleted in SQL", async () => {
    query.mockResolvedValueOnce({ rows: [sampleRow] });

    const notes = await listPublishedNotes();

    expect(query).toHaveBeenCalledWith(expect.stringContaining("draft = false"));
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("deleted_at IS NULL"),
    );
    expect(notes).toHaveLength(1);
    expect(notes[0].slug).toBe("primer-operativo-2024");
    expect(notes[0].data.image).toBe(
      "/uploads/notes/primer-operativo-2024/foto.jpg",
    );
    expect(notes[0].data.date).toBeInstanceOf(Date);
  });
});

describe("getNoteBySlug", () => {
  it("returns a mapped note for an existing slug (excludes soft-deleted)", async () => {
    query.mockResolvedValueOnce({ rows: [sampleRow] });

    const note = await getNoteBySlug("primer-operativo-2024");

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("slug = $1"),
      ["primer-operativo-2024"],
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("deleted_at IS NULL"),
    );
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

describe("listAllNotesIncludingDrafts", () => {
  it("includes drafts and excludes soft-deleted notes, ordered newest first", async () => {
    query.mockClear();
    const draftRow = { ...sampleRow, slug: "draft-post", draft: true };
    query.mockResolvedValueOnce({ rows: [sampleRow, draftRow] });

    const notes = await listAllNotesIncludingDrafts();

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("deleted_at IS NULL"),
    );
    expect(query).toHaveBeenCalledWith(
      expect.not.stringContaining("draft = false"),
    );
    expect(notes).toHaveLength(2);
    expect(notes[0].slug).toBe("primer-operativo-2024");
    expect(notes[1].data.draft).toBe(true);
  });

  it("returns an empty array when no notes exist", async () => {
    query.mockClear();
    query.mockResolvedValueOnce({ rows: [] });

    const notes = await listAllNotesIncludingDrafts();

    expect(notes).toEqual([]);
  });
});

describe("updateNote", () => {
  it("updates title, subtitle, body, tag and sets updated_at", async () => {
    query.mockClear();
    const updatedRow = {
      ...sampleRow,
      title: "Nuevo título",
      subtitle: "Nueva subtítulo",
    };
    query.mockResolvedValueOnce({ rows: [updatedRow] });

    const result = await updateNote("primer-operativo-2024", {
      title: "Nuevo título",
      subtitle: "Nueva subtítulo",
      body: "Cuerpo actualizado",
      tag: "Nueva etiqueta",
    });

    const updateCall = query.mock.calls[0];
    expect(updateCall[0]).toContain("SET title = $2");
    expect(updateCall[0]).toContain("subtitle = $3");
    expect(updateCall[0]).toContain("body = $4");
    expect(updateCall[0]).toContain("tag = $5");
    expect(updateCall[0]).toContain("updated_at = now()");
    expect(updateCall[0]).toContain("WHERE slug = $1");
    expect(updateCall[0]).toContain("deleted_at IS NULL");
    expect(updateCall[0]).not.toContain("SET slug");
    // image_url must NOT appear in SET clause when omitted (retain existing)
    const setClause = updateCall[0].split("SET")[1]?.split("WHERE")[0] ?? "";
    expect(setClause).not.toContain("image_url");
    expect(updateCall[1]).toEqual([
      "primer-operativo-2024",
      "Nuevo título",
      "Nueva subtítulo",
      "Cuerpo actualizado",
      "Nueva etiqueta",
    ]);
    expect(result).not.toBeNull();
    expect(result?.data.title).toBe("Nuevo título");
  });

  it("includes image_url in SET clause when imageUrl is provided", async () => {
    query.mockClear();
    query.mockResolvedValueOnce({ rows: [sampleRow] });

    await updateNote("primer-operativo-2024", {
      title: "Test",
      subtitle: "Test",
      body: "Test",
      imageUrl: "/uploads/notes/slug/new-foto.jpg",
    });

    const updateCall = query.mock.calls[0];
    const setClause = updateCall[0].split("SET")[1]?.split("WHERE")[0] ?? "";
    expect(setClause).toContain("image_url = $6");
    // imageUrl should be the 6th param (index 5)
    expect(updateCall[1][5]).toBe("/uploads/notes/slug/new-foto.jpg");
    expect(updateCall[1]).toHaveLength(6);
  });

  it("omits image_url from SET clause when imageUrl is omitted (retain existing)", async () => {
    query.mockClear();
    query.mockResolvedValueOnce({ rows: [sampleRow] });

    await updateNote("primer-operativo-2024", {
      title: "Test",
      subtitle: "Test",
      body: "Test",
    });

    const updateCall = query.mock.calls[0];
    const setClause = updateCall[0].split("SET")[1]?.split("WHERE")[0] ?? "";
    expect(setClause).not.toContain("image_url");
    expect(updateCall[1]).toHaveLength(5);
  });

  it("returns null for a non-existent or soft-deleted slug", async () => {
    query.mockClear();
    query.mockResolvedValueOnce({ rows: [] });

    const result = await updateNote("ghost", {
      title: "X",
      subtitle: "Y",
      body: "Z",
    });

    expect(result).toBeNull();
  });

  it("never changes the slug", async () => {
    query.mockClear();
    query.mockResolvedValueOnce({ rows: [sampleRow] });

    await updateNote("primer-operativo-2024", {
      title: "Test",
      subtitle: "Test",
      body: "Test",
    });

    const sql = query.mock.calls[0][0];
    // SET clause must not reference slug
    const setClause = sql.split("SET")[1]?.split("WHERE")[0] ?? "";
    expect(setClause).not.toContain("slug");
  });
});

describe("softDeleteNote", () => {
  it("sets deleted_at and returns true when note exists", async () => {
    query.mockClear();
    query.mockResolvedValueOnce({ rowCount: 1 });

    const result = await softDeleteNote("primer-operativo-2024");

    const sql = query.mock.calls[0][0];
    expect(sql).toContain("SET deleted_at = now()");
    expect(sql).toContain("WHERE slug = $1");
    expect(sql).toContain("deleted_at IS NULL");
    expect(query.mock.calls[0][1]).toEqual(["primer-operativo-2024"]);
    expect(result).toBe(true);
  });

  it("returns false when note not found or already deleted", async () => {
    query.mockClear();
    query.mockResolvedValueOnce({ rowCount: 0 });

    const result = await softDeleteNote("ghost");

    expect(result).toBe(false);
  });
});
