import { describe, expect, it } from "vitest";

import { sniffImageMime } from "./uploads-mime";

/** Magic bytes for a JPEG image (`FF D8 FF ...`). */
const JPEG = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
]);

/** Magic bytes for a PNG image (`89 50 4E 47 ...`). */
const PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);

/** Magic bytes for a WebP image (RIFF .... WEBP). */
const WEBP = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);

/** Magic bytes for a GIF image (`47 49 46 38`). */
const GIF = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x00]);

/** A shell script disguised as an image (`#!/bin/sh ...`). */
const SHELL_SCRIPT = new Uint8Array([
  0x23, 0x21, 0x2f, 0x62, 0x69, 0x6e, 0x2f, 0x73, 0x68, 0x0a, 0x65, 0x63,
  0x68, 0x6f, 0x20, 0x68, 0x69, 0x0a,
]);

describe("sniffImageMime", () => {
  it("accepts a real JPEG header", () => {
    expect(sniffImageMime(JPEG)).toBe("image/jpeg");
  });

  it("accepts a real PNG header", () => {
    expect(sniffImageMime(PNG)).toBe("image/png");
  });

  it("rejects WebP (no longer accepted)", () => {
    expect(sniffImageMime(WEBP)).toBeNull();
  });

  it("rejects a GIF disguised as .jpg regardless of extension", () => {
    expect(sniffImageMime(GIF)).toBeNull();
  });

  it("rejects a shell script disguised as .png", () => {
    expect(sniffImageMime(SHELL_SCRIPT)).toBeNull();
  });

  it("rejects bytes that are too short to carry a signature", () => {
    expect(sniffImageMime(new Uint8Array([0xff, 0xd8]))).toBeNull();
    expect(sniffImageMime(new Uint8Array([]))).toBeNull();
  });
});
