import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  assertWithinSizeLimit,
  buildUniqueFilename,
  DEFAULT_MAX_UPLOAD_SIZE_BYTES,
  sanitizeFilename,
  saveImageUpload,
  UploadValidationError,
} from "./uploads";

/** Minimal valid PNG bytes used to build test `File` objects. */
const PNG_HEADER = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);

/** A JPEG body, so MIME sniffing exercises the non-PNG path. */
const JPEG_BODY = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);

function makeFile(bytes: Uint8Array, name: string): File {
  return new File([bytes], name);
}

function pngFile(name = "foto.png"): File {
  return makeFile(PNG_HEADER, name);
}

describe("sanitizeFilename", () => {
  it("blocks path traversal by dropping directory parts", () => {
    const name = sanitizeFilename("../../etc/passwd");
    expect(name).not.toContain("..");
    expect(name).not.toContain("/");
    expect(name).toBe("passwd");
  });

  it("strips special characters and lowercases", () => {
    const name = sanitizeFilename("Mi Foto (1).JPG");
    expect(name).toMatch(/^[a-z0-9._-]+$/);
    expect(name).toBe("mifoto1.jpg");
  });

  it("removes leading dots to avoid hidden files", () => {
    expect(sanitizeFilename(".bashrc")).toBe("bashrc");
  });

  it("falls back to a safe name when nothing survives", () => {
    expect(sanitizeFilename("...")).toBe("imagen");
  });
});

describe("buildUniqueFilename", () => {
  it("inserts the suffix before the extension", () => {
    expect(buildUniqueFilename("foto.jpg", "abcd1234")).toBe("foto-abcd1234.jpg");
  });

  it("appends the suffix when there is no extension", () => {
    expect(buildUniqueFilename("nota", "abcd1234")).toBe("nota-abcd1234");
  });

  it("produces distinct names for the same original without a suffix", () => {
    const a = buildUniqueFilename("foto.jpg");
    const b = buildUniqueFilename("foto.jpg");
    expect(a).not.toBe(b);
  });
});

describe("assertWithinSizeLimit", () => {
  it("accepts a file under the cap", () => {
    expect(() => assertWithinSizeLimit(3 * 1024 * 1024, DEFAULT_MAX_UPLOAD_SIZE_BYTES)).not.toThrow();
  });

  it("accepts a file exactly at the cap (boundary inclusive)", () => {
    expect(() => assertWithinSizeLimit(DEFAULT_MAX_UPLOAD_SIZE_BYTES, DEFAULT_MAX_UPLOAD_SIZE_BYTES)).not.toThrow();
  });

  it("rejects a file over the cap with a Spanish error", () => {
    expect(() => assertWithinSizeLimit(6 * 1024 * 1024, DEFAULT_MAX_UPLOAD_SIZE_BYTES)).toThrow(
      UploadValidationError,
    );
    expect(() => assertWithinSizeLimit(6 * 1024 * 1024, DEFAULT_MAX_UPLOAD_SIZE_BYTES)).toThrow(
      "La imagen no debe superar 5MB",
    );
  });
});

describe("saveImageUpload", () => {
  let dir: string;

  async function makeTempDir() {
    return mkdtemp(path.join(tmpdir(), "lawho-uploads-"));
  }

  it("writes the file under notes/<slug>/ and returns the public URL", async () => {
    dir = await makeTempDir();
    try {
      const result = await saveImageUpload(pngFile("Mi Foto.JPG"), "mi-nota", {
        uploadsDir: dir,
        publicUploadsUrl: "/uploads",
      });

      expect(result.relativePath).toMatch(/^notes\/mi-nota\/mifoto-[a-f0-9]+\.jpg$/);
      expect(result.publicUrl).toBe(`/uploads/${result.relativePath}`);
      expect(result.publicUrl).not.toContain(dir);

      const written = await readFile(result.absolutePath);
      expect(new Uint8Array(written)).toEqual(PNG_HEADER);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("creates the target directory if it does not exist", async () => {
    dir = await makeTempDir();
    const nested = path.join(dir, "does", "not", "exist");
    try {
      const result = await saveImageUpload(pngFile(), "slug", {
        uploadsDir: nested,
        publicUploadsUrl: "/uploads",
      });
      const info = await stat(result.absolutePath);
      expect(info.isFile()).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects a non-image payload regardless of extension", async () => {
    dir = await makeTempDir();
    try {
      const script = makeFile(
        new Uint8Array([0x23, 0x21, 0x2f, 0x62, 0x69, 0x6e, 0x2f, 0x73, 0x68]),
        "foto.png",
      );
      await expect(
        saveImageUpload(script, "slug", { uploadsDir: dir, publicUploadsUrl: "/uploads" }),
      ).rejects.toThrow(UploadValidationError);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects a JPEG-mismatch MIME (GIF body as .jpg)", async () => {
    dir = await makeTempDir();
    try {
      const gif = makeFile(
        new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]),
        "foto.jpg",
      );
      await expect(
        saveImageUpload(gif, "slug", { uploadsDir: dir, publicUploadsUrl: "/uploads" }),
      ).rejects.toThrow("Formato de imagen no permitido");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects an oversized file with a Spanish error", async () => {
    dir = await makeTempDir();
    try {
      const oversized = makeFile(JPEG_BODY, "grande.jpg");
      await expect(
        saveImageUpload(oversized, "slug", {
          uploadsDir: dir,
          publicUploadsUrl: "/uploads",
          maxBytes: 5, // tiny cap to force the size error
        }),
      ).rejects.toThrow("La imagen no debe superar");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("stores a CDN origin verbatim in the public URL", async () => {
    dir = await makeTempDir();
    try {
      const result = await saveImageUpload(pngFile(), "slug", {
        uploadsDir: dir,
        publicUploadsUrl: "https://cdn.lawho.org.ar/uploads",
      });
      expect(result.publicUrl).toMatch(/^https:\/\/cdn\.lawho\.org\.ar\/uploads\/notes\/slug\//);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
