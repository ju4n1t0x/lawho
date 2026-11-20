import type { NoteData } from "./notes-mapper";

export interface GetPublishedNotesOptions {
  featuredOnly?: boolean;
}

/**
 * A live `notes` entry as returned by `getLiveCollection("notes")` /
 * `getLiveEntry("notes", ...)`. `data.image` is a string URL (see `NoteData`),
 * not the build-time `image()` helper.
 */
export interface LiveNoteEntry {
  id: string;
  data: NoteData;
  rendered?: { html: string };
}

/**
 * Filter a notes collection to published entries and sort newest first.
 *
 * Excludes drafts (`draft === true`), optionally restricts the result to
 * featured notes, and sorts by `date` in descending order. Entry `id` is the
 * slug, which callers use to build detail URLs.
 */
export function getPublishedNotes(
  entries: LiveNoteEntry[],
  options: GetPublishedNotesOptions = {},
): LiveNoteEntry[] {
  const { featuredOnly = false } = options;

  return entries
    .filter((entry) => entry.data.draft !== true)
    .filter((entry) => !featuredOnly || entry.data.featured === true)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

/**
 * Format a note date for display, defaulting to Argentine Spanish ("es-AR").
 * Example: March 15, 2024 -> "15 de marzo de 2024".
 *
 * Note dates are date-only values (e.g. `2024-06-15` in frontmatter). The
 * `z.coerce.date()` schema parses them as UTC midnight, so we format in UTC to
 * preserve the authored calendar day instead of shifting a day backwards in
 * negative-offset timezones.
 */
export function formatNoteDate(date: Date, locale = "es-AR"): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}
