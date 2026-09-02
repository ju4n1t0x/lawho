/** Raw `notes` table row shape returned by PostgreSQL. */
export interface NoteRow {
  slug: string;
  title: string;
  subtitle: string;
  body: string;
  image_url: string;
  date: string | Date;
  draft: boolean;
  featured: boolean;
  author: string | null;
  tag: string | null;
}

/** Live-collection `data` shape (image is a string URL, not the image() helper). */
export interface NoteData {
  title: string;
  subtitle: string;
  image: string;
  date: Date;
  draft: boolean;
  featured: boolean;
  author?: string;
  tag?: string;
}

/**
 * Map a raw DB row to the live-collection data shape.
 * `image` is the string `image_url` (public origin), never a local filesystem path.
 */
export function mapNoteRow(row: NoteRow): NoteData {
  const data: NoteData = {
    title: row.title,
    subtitle: row.subtitle,
    image: row.image_url,
    date: new Date(row.date),
    draft: row.draft,
    featured: row.featured,
  };

  if (row.author) data.author = row.author;
  if (row.tag) data.tag = row.tag;

  return data;
}
