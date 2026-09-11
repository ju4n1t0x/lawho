import type { AcceptedImageMime } from "./uploads-mime";

/** Longest edge cap applied during resize. */
export const MAX_IMAGE_EDGE_PX = 2400;

/** Bail before decode when any axis exceeds this value. */
export const MAX_IMAGE_AXIS_PX = 8000;

/** JPEG quality target for mozjpeg encoding. */
export const JPEG_QUALITY = 82;

/**
 * Server-side image optimisation. Re-encodes the input in the same format
 * (JPEG → JPEG, PNG → PNG) using sharp, stripping EXIF orientation via
 * `rotate()` and capping the longest edge at ~2400 px.
 *
 * Throws when sharp reports any axis exceeding 8000 px (OOM guard).
 */
export async function optimizeImage(
  bytes: Uint8Array,
  mime: AcceptedImageMime,
): Promise<{ bytes: Uint8Array; mime: AcceptedImageMime }> {
  const sharp = (await import("sharp")).default;

  // OOM guard — bail before sharp allocates a full decode buffer.
  const meta = await sharp(bytes).metadata();
  if (
    (meta.width && meta.width > MAX_IMAGE_AXIS_PX) ||
    (meta.height && meta.height > MAX_IMAGE_AXIS_PX)
  ) {
    throw new Error(
      `Image dimensions ${meta.width}×${meta.height} exceed ${MAX_IMAGE_AXIS_PX}px axis limit`,
    );
  }

  let pipeline = sharp(bytes).rotate().resize({
    width: MAX_IMAGE_EDGE_PX,
    height: MAX_IMAGE_EDGE_PX,
    fit: "inside",
    withoutEnlargement: true,
  });

  if (mime === "image/jpeg") {
    pipeline = pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true });
  } else {
    pipeline = pipeline.png({ compressionLevel: 9, palette: true });
  }

  const optimized = await pipeline.toBuffer();
  return { bytes: new Uint8Array(optimized), mime };
}
