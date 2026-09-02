import { getPool } from "./db";
import { mapNoteRow, type NoteRow } from "./notes-mapper";

/** A note as returned to the live collection (id = slug, plus rendered body). */
export interface NoteRecord {
  slug: string;
  data: ReturnType<typeof mapNoteRow>;
  body: string;
}

const NOTE_COLUMNS =
  "slug, title, subtitle, body, image_url, date, draft, featured, author, tag";

function toRecord(row: NoteRow): NoteRecord {
  return { slug: row.slug, data: mapNoteRow(row), body: row.body };
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
