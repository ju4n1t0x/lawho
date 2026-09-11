import sharp from "sharp";
import { describe, expect, it } from "vitest";

import {
  JPEG_QUALITY,
  MAX_IMAGE_AXIS_PX,
  MAX_IMAGE_EDGE_PX,
  optimizeImage,
} from "./image-optimize";

/** Generate a valid JPEG buffer of given dimensions. */
async function makeJpeg(w: number, h: number): Promise<Uint8Array> {
  const buf = await sharp({ create: { width: w, height: h, channels: 3, background: { r: 128, g: 64, b: 32 } } })
    .jpeg()
    .toBuffer();
  return new Uint8Array(buf);
}

/** Generate a valid PNG buffer of given dimensions. */
async function makePng(w: number, h: number): Promise<Uint8Array> {
  const buf = await sharp({ create: { width: w, height: h, channels: 3, background: { r: 10, g: 200, b: 50 } } })
    .png()
    .toBuffer();
  return new Uint8Array(buf);
}

describe("optimizeImage", () => {
  it("preserves JPEG format", async () => {
    const input = await makeJpeg(800, 600);
    const result = await optimizeImage(input, "image/jpeg");

    expect(result.mime).toBe("image/jpeg");
    const meta = await sharp(result.bytes).metadata();
    expect(meta.format).toBe("jpeg");
  });

  it("preserves PNG format", async () => {
    const input = await makePng(800, 600);
    const result = await optimizeImage(input, "image/png");

    expect(result.mime).toBe("image/png");
    const meta = await sharp(result.bytes).metadata();
    expect(meta.format).toBe("png");
  });

  it("strips EXIF orientation via rotate()", async () => {
    // Create a JPEG with EXIF orientation tag 6 (rotate 90 CW).
    // sharp's withExifMerge expects the orientation as a string.
    const input = await sharp({ create: { width: 400, height: 300, channels: 3, background: { r: 200, g: 100, b: 50 } } })
      .jpeg()
      .withExifMerge({ IFD0: { Orientation: "6" } })
      .toBuffer();

    const result = await optimizeImage(new Uint8Array(input), "image/jpeg");
    const meta = await sharp(result.bytes).metadata();

    // After rotate() + re-encode, orientation should be 1 (normal) or absent
    expect(meta.orientation).toBeUndefined();
  });

  it("downscales a 4000×3000 image so longest edge ≤ 2400", async () => {
    const input = await makeJpeg(4000, 3000);
    const result = await optimizeImage(input, "image/jpeg");

    const meta = await sharp(result.bytes).metadata();
    // fit:"inside" with 2400×2400 → longest edge = 2400, other = 1800
    expect(meta.width).toBeLessThanOrEqual(MAX_IMAGE_EDGE_PX);
    expect(meta.height).toBeLessThanOrEqual(MAX_IMAGE_EDGE_PX);
    // Aspect ratio preserved: 4000/3000 = 4/3 = 2400/1800
    expect(meta.width).toBe(2400);
    expect(meta.height).toBe(1800);
  });

  it("does not enlarge a small image", async () => {
    const input = await makeJpeg(600, 400);
    const result = await optimizeImage(input, "image/jpeg");

    const meta = await sharp(result.bytes).metadata();
    expect(meta.width).toBe(600);
    expect(meta.height).toBe(400);
  });

  it("throws when any axis exceeds MAX_IMAGE_AXIS_PX", async () => {
    // 8001 wide → should bail before decode
    const input = await makeJpeg(8001, 100);
    await expect(optimizeImage(input, "image/jpeg")).rejects.toThrow(
      /exceed.*axis limit/i,
    );
  });

  it("throws when height exceeds MAX_IMAGE_AXIS_PX", async () => {
    const input = await makeJpeg(100, 8001);
    await expect(optimizeImage(input, "image/jpeg")).rejects.toThrow(
      /exceed.*axis limit/i,
    );
  });
});
