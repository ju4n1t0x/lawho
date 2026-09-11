import { mkdir, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";

import { optimizeImage } from "./image-optimize";
import { sniffImageMime } from "./uploads-mime";

/** Default upload size cap (5 MB), used when no override is provided. */
export const DEFAULT_MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * A user-facing upload validation failure. The message is Spanish and safe to
 * render directly (no filesystem paths or credentials leak).
 */
export class UploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadValidationError";
  }
}

/**
 * Sanitize a raw filename to only `[a-z0-9._-]`, lowercased. Directory parts
 * (`../`, `..\\`) are dropped by taking the basename, and leading dots are
 * removed so a hidden filename cannot be produced.
 */
export function sanitizeFilename(raw: string): string {
  const base = raw.split(/[\\/]/).pop() ?? "";
  const cleaned = base
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/^\.+/, "");
  return cleaned || "imagen";
}

/**
 * Build a collision-resistant filename from the original name: sanitize it,
 * then insert a random suffix before the extension (or at the end when there
 * is none). The suffix is injectable so tests can assert deterministically.
 */
export function buildUniqueFilename(
  original: string,
  suffix = randomBytes(4).toString("hex"),
): string {
  const safe = sanitizeFilename(original);
  const dot = safe.lastIndexOf(".");
  if (dot > 0) {
    return `${safe.slice(0, dot)}-${suffix}${safe.slice(dot)}`;
  }
  return `${safe}-${suffix}`;
}

/**
 * Reject a file whose size exceeds the cap (boundary inclusive: `maxBytes`
 * itself is accepted). Throws a Spanish `UploadValidationError` when too large.
 */
export function assertWithinSizeLimit(
  sizeBytes: number,
  maxBytes: number,
): void {
  if (sizeBytes > maxBytes) {
    const limitMb = Math.floor(maxBytes / (1024 * 1024));
    throw new UploadValidationError(
      `La imagen no debe superar ${limitMb}MB`,
    );
  }
}

/** Configuration injected by the caller (the server island reads env). */
export interface UploadConfig {
  /** Local filesystem root for uploads (`UPLOADS_DIR`). */
  uploadsDir: string;
  /** Public URL origin prefix (`PUBLIC_UPLOADS_URL`), stored in the DB. */
  publicUploadsUrl: string;
  /** Size cap in bytes, defaults to `DEFAULT_MAX_UPLOAD_SIZE_BYTES`. */
  maxBytes?: number;
}

/**
 * Convert a public upload URL back to the absolute filesystem path, or `null`
 * when the URL does not match the configured prefix.
 *
 * Rejects paths containing `..` to prevent traversal.
 */
export function absolutePathFromPublicUrl(
  publicUrl: string,
  config: Pick<UploadConfig, "uploadsDir" | "publicUploadsUrl">,
): string | null {
  const prefix = config.publicUploadsUrl.replace(/\/+$/, "");
  if (!publicUrl.startsWith(prefix + "/") && publicUrl !== prefix) {
    return null;
  }
  const relativePath = publicUrl.slice(prefix.length + 1);
  if (relativePath.includes("..")) return null;
  return path.join(config.uploadsDir, relativePath);
}

// ── Edit-flow image decision (pure, unit-testable) ──────────────────────────

/** Input for `resolveNoteImageReplacement`. */
export interface NoteImageReplacementInput {
  /** The current public image URL stored in the DB (empty string if imageless). */
  currentPublicUrl: string;
  /** Whether the user submitted a new file upload. */
  hasNewUpload: boolean;
  /** The public URL of the new upload (meaningful only when `hasNewUpload` is true). */
  newPublicUrl: string;
  /** Uploads configuration for absolute-path resolution. */
  config: Pick<UploadConfig, "uploadsDir" | "publicUploadsUrl">;
}

/** Output of `resolveNoteImageReplacement`. */
export interface NoteImageReplacementResult {
  /** Whether the DB should be updated with a new image URL. */
  persistNewUrl: boolean;
  /** The image URL to pass to `updateNote` (undefined = retain existing). */
  imageUrl: string | undefined;
  /** Absolute path of the old file to unlink, or null when no unlink is needed. */
  oldAbsolutePath: string | null;
  /** Spanish rejection message when the update should be blocked, or null to proceed. */
  rejectMessage: string | null;
}

/**
 * Pure decision function for the edit-flow image logic. No side effects —
 * callers handle `saveImageUpload`, `updateNote`, and `unlink`.
 *
 * Rules:
 * - No new upload + empty current URL → "image required" (legacy imageless note)
 * - New upload → persist new URL; compute old absolute path for unlink
 * - No new upload + current URL exists → retain (no DB update, no unlink)
 * - Old absolute path is null when the prefix does not match (no unlink)
 */
export function resolveNoteImageReplacement(
  input: NoteImageReplacementInput,
): NoteImageReplacementResult {
  const { currentPublicUrl, hasNewUpload, newPublicUrl, config } = input;

  if (!hasNewUpload) {
    if (!currentPublicUrl) {
      return {
        persistNewUrl: false,
        imageUrl: undefined,
        oldAbsolutePath: null,
        rejectMessage: "La imagen es obligatoria",
      };
    }
    return {
      persistNewUrl: false,
      imageUrl: undefined,
      oldAbsolutePath: null,
      rejectMessage: null,
    };
  }

  // New upload provided.
  let oldAbsolutePath: string | null = null;
  if (currentPublicUrl && currentPublicUrl !== newPublicUrl) {
    oldAbsolutePath = absolutePathFromPublicUrl(currentPublicUrl, config);
  }

  return {
    persistNewUrl: true,
    imageUrl: newPublicUrl,
    oldAbsolutePath,
    rejectMessage: null,
  };
}

/** Result of saving an upload. */
export interface SaveUploadResult {
  /** Path relative to the uploads dir, e.g. `notes/<slug>/<filename>`. */
  relativePath: string;
  /** Public URL (origin prefix + relative path), never a local path. */
  publicUrl: string;
  /** Absolute filesystem path the file was written to. */
  absolutePath: string;
}

/**
 * Save an uploaded image `File` to `${uploadsDir}/notes/<slug>/<filename>`.
 *
 * Validates size (cap) and magic-byte MIME (jpeg/png only), optimises with
 * sharp (format-preserving), sanitizes the filename to `[a-z0-9._-]` with a
 * random suffix, creates the target directory on demand, and returns the public
 * URL + relative path (the DB stores the public URL, never the local path).
 *
 * The 5 MB cap applies to the raw input BEFORE optimisation.
 * Throws `UploadValidationError` with a Spanish message on size, MIME, or
 * sharp-processing failure.
 */
export async function saveImageUpload(
  file: File,
  slug: string,
  config: UploadConfig,
): Promise<SaveUploadResult> {
  const maxBytes = config.maxBytes ?? DEFAULT_MAX_UPLOAD_SIZE_BYTES;
  assertWithinSizeLimit(file.size, maxBytes);

  const rawBytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffImageMime(rawBytes);
  if (!mime) {
    throw new UploadValidationError("Formato de imagen no permitido");
  }

  let optimized: { bytes: Uint8Array; mime: typeof mime };
  try {
    optimized = await optimizeImage(rawBytes, mime);
  } catch (e) {
    throw new UploadValidationError("La imagen no se pudo procesar");
  }

  const ext = mime === "image/jpeg" ? ".jpg" : ".png";
  const filename = buildUniqueFilename(file.name);
  // Replace the original extension with the sniffed one to stay consistent.
  const finalName = filename.replace(/\.[^.]+$/, ext);
  const relativePath = path.posix.join("notes", slug, finalName);
  const absolutePath = path.join(config.uploadsDir, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, optimized.bytes);

  const publicUrl = `${config.publicUploadsUrl.replace(/\/$/, "")}/${relativePath}`;
  return { relativePath, publicUrl, absolutePath };
}
