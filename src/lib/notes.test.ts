import { describe, expect, it } from "vitest";
import type { CollectionEntry } from "astro:content";

import { formatNoteDate, getPublishedNotes } from "./notes";

interface NoteData {
  title: string;
  subtitle: string;
  image: { src: string; width: number; height: number; format: string };
  date: Date;
  draft: boolean;
  featured: boolean;
  author?: string;
  tag?: string;
}

function makeNote(
  slug: string,
  data: Omit<NoteData, "title" | "subtitle" | "image"> &
    Partial<Pick<NoteData, "title" | "subtitle" | "image" | "draft" | "featured">>,
): CollectionEntry<"notes"> {
  return {
    id: slug,
    slug,
    collection: "notes",
    body: "",
    data: {
      title: "Título de ejemplo",
      subtitle: "Subtítulo de ejemplo",
      image: { src: "/img.jpg", width: 600, height: 750, format: "jpg" },
      draft: false,
      featured: true,
      ...data,
    },
  } as CollectionEntry<"notes">;
}

describe("getPublishedNotes", () => {
  it("filters out draft notes", () => {
    const notes = [
      makeNote("publicada-1", { date: new Date(2024, 0, 1) }),
      makeNote("borrador", { date: new Date(2024, 5, 15), draft: true }),
      makeNote("publicada-2", { date: new Date(2024, 2, 15) }),
    ];

    const result = getPublishedNotes(notes);

    expect(result.map((n) => n.slug)).toEqual(["publicada-2", "publicada-1"]);
  });

  it("sorts published notes by date descending", () => {
    const notes = [
      makeNote("vieja", { date: new Date(2024, 0, 1) }),
      makeNote("nueva", { date: new Date(2024, 5, 15) }),
    ];

    const result = getPublishedNotes(notes);

    expect(result[0].slug).toBe("nueva");
    expect(result[1].slug).toBe("vieja");
  });

  it("returns only featured notes when featuredOnly is true", () => {
    const notes = [
      makeNote("destacada", { date: new Date(2024, 1, 1), featured: true }),
      makeNote("comun", { date: new Date(2024, 2, 1), featured: false }),
    ];

    const result = getPublishedNotes(notes, { featuredOnly: true });

    expect(result.map((n) => n.slug)).toEqual(["destacada"]);
  });

  it("returns an empty array for an empty collection", () => {
    expect(getPublishedNotes([])).toEqual([]);
  });

  it("does not filter by featured when featuredOnly is false", () => {
    const notes = [
      makeNote("destacada", { date: new Date(2024, 1, 1), featured: true }),
      makeNote("comun", { date: new Date(2024, 2, 1), featured: false }),
    ];

    const result = getPublishedNotes(notes);

    expect(result.map((n) => n.slug)).toEqual(["comun", "destacada"]);
  });
});

describe("formatNoteDate", () => {
  it("formats a date in Argentine Spanish by default", () => {
    expect(formatNoteDate(new Date(2024, 2, 15))).toBe("15 de marzo de 2024");
  });

  it("formats a date for en-US when requested", () => {
    expect(formatNoteDate(new Date(2024, 2, 15), "en-US")).toBe("March 15, 2024");
  });

  it("preserves the calendar day for date-only UTC values", () => {
    expect(formatNoteDate(new Date("2024-06-15"))).toBe("15 de junio de 2024");
  });
});
