/** MIME types accepted for uploaded images (magic-byte sniffed). */
export type AcceptedImageMime = "image/jpeg" | "image/png" | "image/webp";

const MIME_JPEG = "image/jpeg" as const;
const MIME_PNG = "image/png" as const;
const MIME_WEBP = "image/webp" as const;

/** True when `bytes` begins with the given `prefix` bytes. */
function hasPrefix(bytes: Uint8Array, prefix: readonly number[]): boolean {
  if (bytes.length < prefix.length) return false;
  return prefix.every((byte, i) => bytes[i] === byte);
}

/**
 * Detect an image MIME type from magic bytes, never from the file extension.
 * Only `image/jpeg`, `image/png` and `image/webp` are accepted; anything else
 * returns `null` so callers can reject the upload regardless of its name.
 *
 * Signatures:
 *   - JPEG: `FF D8 FF`
 *   - PNG:  `89 50 4E 47`
 *   - WebP: RIFF (`52 49 46 46`) followed by `57 45 42 50` at offset 8
 */
export function sniffImageMime(bytes: Uint8Array): AcceptedImageMime | null {
  if (hasPrefix(bytes, [0xff, 0xd8, 0xff])) return MIME_JPEG;
  if (hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47])) return MIME_PNG;
  if (
    hasPrefix(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes.length >= 12 &&
    hasPrefix(bytes.subarray(8, 12), [0x57, 0x45, 0x42, 0x50])
  ) {
    return MIME_WEBP;
  }
  return null;
}
