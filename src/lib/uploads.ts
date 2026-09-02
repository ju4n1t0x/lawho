import { mkdir, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";

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
 * Validates size (cap) and magic-byte MIME (jpeg/png/webp only), sanitizes the
 * filename to `[a-z0-9._-]` with a random suffix, creates the target directory
 * on demand, and returns the public URL + relative path (the DB stores the
 * public URL, never the local filesystem path).
 *
 * Throws `UploadValidationError` with a Spanish message on size or MIME failure.
 */
export async function saveImageUpload(
  file: File,
  slug: string,
  config: UploadConfig,
): Promise<SaveUploadResult> {
  const maxBytes = config.maxBytes ?? DEFAULT_MAX_UPLOAD_SIZE_BYTES;
  assertWithinSizeLimit(file.size, maxBytes);

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!sniffImageMime(bytes)) {
    throw new UploadValidationError("Formato de imagen no permitido");
  }

  const filename = buildUniqueFilename(file.name);
  const relativePath = path.posix.join("notes", slug, filename);
  const absolutePath = path.join(config.uploadsDir, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, bytes);

  const publicUrl = `${config.publicUploadsUrl.replace(/\/$/, "")}/${relativePath}`;
  return { relativePath, publicUrl, absolutePath };
}
