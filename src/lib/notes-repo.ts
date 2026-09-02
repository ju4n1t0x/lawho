import { randomBytes } from "node:crypto";
import { getPool } from "./db";
import { mapNoteRow, type NoteRow } from "./notes-mapper";

/** A note as returned to the live collection (id = slug, plus rendered body). */
export interface NoteRecord {
  slug: string;
  data: ReturnType<typeof mapNoteRow>;
  body: string;
}

/** Input for creating a note via the writer flow. */
export interface NewNoteInput {
  title: string;
  subtitle: string;
  body: string;
  /** Public image URL (empty string when no image was uploaded). */
  imageUrl: string;
  /** Preferred slug; derived from `title` when omitted. */
  slug?: string;
  tag?: string;
  author?: string;
  draft?: boolean;
  featured?: boolean;
  /** Date-only `YYYY-MM-DD`; defaults to today. */
  date?: string;
}

const NOTE_COLUMNS =
  "slug, title, subtitle, body, image_url, date, draft, featured, author, tag";

function toRecord(row: NoteRow): NoteRecord {
  return { slug: row.slug, data: mapNoteRow(row), body: row.body };
}

/**
 * Turn free text into a URL-safe slug: lowercase, strip accents, and collapse
 * runs of non `[a-z0-9]` characters into a single hyphen.
 */
export function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "nota";
}

/**
 * List all published (non-draft) notes, newest first.
 */
export async function listPublishedNotes(): Promise<NoteRecord[]> {
  const pool = getPool();
  const { rows } = await pool.query<NoteRow>(
    `SELECT ${NOTE_COLUMNS} FROM notes WHERE draft = false ORDER BY date DESC, id DESC`,
  );
  return rows.map(toRecord);
}

/**
 * Fetch a single note by slug, or null when it does not exist.
 */
export async function getNoteBySlug(slug: string): Promise<NoteRecord | null> {
  const pool = getPool();
  const { rows } = await pool.query<NoteRow>(
    `SELECT ${NOTE_COLUMNS} FROM notes WHERE slug = $1`,
    [slug],
  );
  const row = rows[0];
  return row ? toRecord(row) : null;
}

/**
 * Insert a new note and return the created record.
 *
 * The slug is derived from the title (or the preferred `input.slug`) and made
 * unique: when it already exists, a short random suffix is appended so the
 * `slug UNIQUE` constraint is never violated.
 */
export async function createNote(input: NewNoteInput): Promise<NoteRecord> {
  const pool = getPool();
  const base = input.slug ?? slugify(input.title);

  const existing = await pool.query<{ slug: string }>(
    `SELECT slug FROM notes WHERE slug = $1`,
    [base],
  );
  const slug =
    existing.rows.length === 0 ? base : `${base}-${randomBytes(3).toString("hex")}`;
  const date = input.date ?? new Date().toISOString().slice(0, 10);

  const { rows } = await pool.query<NoteRow>(
    `INSERT INTO notes
       (slug, title, subtitle, body, image_url, date, draft, featured, author, tag)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING ${NOTE_COLUMNS}`,
    [
      slug,
      input.title,
      input.subtitle,
      input.body,
      input.imageUrl,
      date,
      input.draft ?? false,
      input.featured ?? true,
      input.author ?? null,
      input.tag ?? null,
    ],
  );

  return toRecord(rows[0]);
}
