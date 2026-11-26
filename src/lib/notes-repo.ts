import { randomBytes } from "node:crypto";
import { getPool } from "./db";
import { mapNoteRow, type NoteRow } from "./notes-mapper";

/** A note as returned to the live collection (id = slug, plus rendered body). */
export interface NoteRecord {
  slug: string;
  imageKey: string | null;
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
  imageKey?: string;
  /** Preferred slug; derived from `title` when omitted. */
  slug?: string;
  tag?: string;
  author?: string;
  draft?: boolean;
  featured?: boolean;
  /** Date-only `YYYY-MM-DD`; defaults to today. */
  date?: string;
}

/** Input for updating a note. Slug is never changed. Image is updated only when `imageUrl` is provided. */
export interface NoteUpdate {
  title: string;
  subtitle: string;
  body: string;
  tag?: string;
  /** When provided, updates `image_url` in the DB. When omitted, retains existing value. */
  imageUrl?: string;
  imageKey?: string;
}

const NOTE_COLUMNS =
  "slug, title, subtitle, body, image_url, date, draft, featured, author, tag, image_key";

function toRecord(row: NoteRow): NoteRecord {
  return { slug: row.slug, imageKey: row.image_key ?? null, data: mapNoteRow(row), body: row.body };
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
 * Excludes soft-deleted notes.
 */
export async function listPublishedNotes(): Promise<NoteRecord[]> {
  const pool = getPool();
  const { rows } = await pool.query<NoteRow>(
    `SELECT ${NOTE_COLUMNS} FROM notes WHERE draft = false AND deleted_at IS NULL ORDER BY date DESC, id DESC`,
  );
  return rows.map(toRecord);
}

/** Read only the slugs of published, non-deleted notes for the sitemap. */
export async function listPublishedNoteSlugs(): Promise<string[]> {
  const { rows } = await getPool().query<{ slug: string }>(
    'SELECT slug FROM notes WHERE draft = false AND deleted_at IS NULL ORDER BY date DESC, id DESC',
  );
  return rows.map(({ slug }) => slug);
}

/**
 * Fetch a single note by slug, or null when it does not exist.
 * Excludes soft-deleted notes.
 */
export async function getNoteBySlug(slug: string): Promise<NoteRecord | null> {
  const pool = getPool();
  const { rows } = await pool.query<NoteRow>(
    `SELECT ${NOTE_COLUMNS} FROM notes WHERE slug = $1 AND deleted_at IS NULL`,
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
       (slug, title, subtitle, body, image_url, date, draft, featured, author, tag, image_key)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
       input.imageKey ?? null,
    ],
  );

  return toRecord(rows[0]);
}

/**
 * List all notes (including drafts), newest first.
 * Excludes soft-deleted notes. Used by the writer dashboard.
 */
export async function listAllNotesIncludingDrafts(): Promise<NoteRecord[]> {
  const pool = getPool();
  const { rows } = await pool.query<NoteRow>(
    `SELECT ${NOTE_COLUMNS} FROM notes WHERE deleted_at IS NULL ORDER BY date DESC, id DESC`,
  );
  return rows.map(toRecord);
}

/**
 * Update an existing note by slug. The slug itself is never changed.
 * When `imageUrl` is provided, `image_url` is updated; otherwise the existing
 * value is retained. Returns the updated record, or null when the note is not
 * found or soft-deleted.
 */
export async function updateNote(
  slug: string,
  fields: NoteUpdate,
): Promise<NoteRecord | null> {
  const pool = getPool();
  const params: unknown[] = [
    slug,
    fields.title,
    fields.subtitle,
    fields.body,
    fields.tag ?? null,
  ];

  let setClause = "title = $2, subtitle = $3, body = $4, tag = $5, updated_at = now()";
  if (fields.imageUrl !== undefined) {
    params.push(fields.imageUrl);
    setClause += `, image_url = $${params.length}`;
    if (fields.imageKey !== undefined) {
      params.push(fields.imageKey);
      setClause += `, image_key = $${params.length}`;
    } else {
      setClause += ', image_key = NULL';
    }
  }

  const { rows } = await pool.query<NoteRow>(
    `UPDATE notes
       SET ${setClause}
     WHERE slug = $1 AND deleted_at IS NULL
     RETURNING ${NOTE_COLUMNS}`,
    params,
  );
  const row = rows[0];
  return row ? toRecord(row) : null;
}

/** Lock the row so concurrent replacements clean up the image they actually displaced. */
export async function replaceNoteImage(
  slug: string,
  fields: NoteUpdate & { imageKey: string; imageUrl: string },
): Promise<{ note: NoteRecord; previousImageKey: string | null } | null> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const previous = await client.query<{ image_key: string | null }>(
      'SELECT image_key FROM notes WHERE slug = $1 AND deleted_at IS NULL FOR UPDATE', [slug],
    );
    if (!previous.rows[0]) { await client.query('COMMIT'); return null; }
    const { rows } = await client.query<NoteRow>(
      `UPDATE notes SET title = $2, subtitle = $3, body = $4, tag = $5,
        image_url = $6, image_key = $7, updated_at = now()
        WHERE slug = $1 AND deleted_at IS NULL RETURNING ${NOTE_COLUMNS}`,
      [slug, fields.title, fields.subtitle, fields.body, fields.tag ?? null, fields.imageUrl, fields.imageKey],
    );
    await client.query('COMMIT');
    return { note: toRecord(rows[0]), previousImageKey: previous.rows[0].image_key };
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { /* Preserve the original failure. */ }
    throw error;
  } finally { client.release(); }
}

/**
 * Soft-delete a note by slug (sets `deleted_at` to now).
 * Returns `true` when a note was deleted, `false` when not found or already
 * deleted.
 */
export async function softDeleteNote(slug: string): Promise<boolean> {
  const pool = getPool();
  const { rowCount } = await pool.query(
    `UPDATE notes SET deleted_at = now() WHERE slug = $1 AND deleted_at IS NULL`,
    [slug],
  );
  return (rowCount ?? 0) > 0;
}

export async function findManagedImage(key: string): Promise<{ draft: boolean } | null> {
  const { rows } = await getPool().query<{ draft: boolean }>(
    'SELECT draft FROM notes WHERE image_key = $1 AND deleted_at IS NULL', [key],
  );
  return rows[0] ?? null;
}

/** Includes soft-deleted notes: their assets are retained for recovery. */
export async function isImageReferenced(key: string): Promise<boolean> {
  const { rows } = await getPool().query('SELECT 1 FROM notes WHERE image_key = $1 LIMIT 1', [key]);
  return rows.length > 0;
}
