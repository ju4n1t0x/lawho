import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import {
  absolutePathFromPublicUrl,
  assertWithinSizeLimit,
  buildUniqueFilename,
  DEFAULT_MAX_UPLOAD_SIZE_BYTES,
  resolveNoteImageReplacement,
  sanitizeFilename,
  saveImageUpload,
  UploadValidationError,
} from "./uploads";

// ── Mock image-optimize ─────────────────────────────────────────────────────
// The optimizeImage mock passes through bytes unchanged (preserving the
// synthetic headers used by existing tests) and returns the same mime.
vi.mock("./image-optimize", () => ({
  optimizeImage: vi.fn(async (bytes: Uint8Array, mime: string) => ({
    bytes,
    mime,
  })),
}));

import { optimizeImage } from "./image-optimize";

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

describe("absolutePathFromPublicUrl", () => {
  const config = { uploadsDir: "/data/uploads", publicUploadsUrl: "/uploads" };

  it("returns absolute path for a matching URL", () => {
    expect(absolutePathFromPublicUrl("/uploads/notes/slug/foto.jpg", config)).toBe(
      path.join("/data/uploads", "notes/slug/foto.jpg"),
    );
  });

  it("returns null when prefix does not match", () => {
    expect(absolutePathFromPublicUrl("https://cdn.example.com/uploads/x.jpg", config)).toBeNull();
  });

  it("returns null when path contains ..", () => {
    expect(absolutePathFromPublicUrl("/uploads/../../etc/passwd", config)).toBeNull();
  });

  it("handles trailing slash on publicUploadsUrl", () => {
    const cfg = { uploadsDir: "/data/uploads", publicUploadsUrl: "/uploads/" };
    expect(absolutePathFromPublicUrl("/uploads/notes/slug/foto.jpg", cfg)).toBe(
      path.join("/data/uploads", "notes/slug/foto.jpg"),
    );
  });
});

describe("resolveNoteImageReplacement", () => {
  const config = { uploadsDir: "/data/uploads", publicUploadsUrl: "/uploads" };

  it("retains existing image when no new upload is provided", () => {
    const result = resolveNoteImageReplacement({
      currentPublicUrl: "/uploads/notes/slug/foto.jpg",
      hasNewUpload: false,
      newPublicUrl: "",
      config,
    });
    expect(result.persistNewUrl).toBe(false);
    expect(result.imageUrl).toBeUndefined();
    expect(result.oldAbsolutePath).toBeNull();
    expect(result.rejectMessage).toBeNull();
  });

  it("persists new URL and computes old absolute path on replacement", () => {
    const result = resolveNoteImageReplacement({
      currentPublicUrl: "/uploads/notes/slug/old.jpg",
      hasNewUpload: true,
      newPublicUrl: "/uploads/notes/slug/new.png",
      config,
    });
    expect(result.persistNewUrl).toBe(true);
    expect(result.imageUrl).toBe("/uploads/notes/slug/new.png");
    expect(result.oldAbsolutePath).toBe(
      path.join("/data/uploads", "notes/slug/old.jpg"),
    );
    expect(result.rejectMessage).toBeNull();
  });

  it("sets oldAbsolutePath to null when old URL prefix does not match", () => {
    const result = resolveNoteImageReplacement({
      currentPublicUrl: "https://cdn.example.com/other/foto.jpg",
      hasNewUpload: true,
      newPublicUrl: "/uploads/notes/slug/new.png",
      config,
    });
    expect(result.persistNewUrl).toBe(true);
    expect(result.imageUrl).toBe("/uploads/notes/slug/new.png");
    expect(result.oldAbsolutePath).toBeNull();
    expect(result.rejectMessage).toBeNull();
  });

  it("does not unlink when new URL equals current URL", () => {
    const result = resolveNoteImageReplacement({
      currentPublicUrl: "/uploads/notes/slug/foto.jpg",
      hasNewUpload: true,
      newPublicUrl: "/uploads/notes/slug/foto.jpg",
      config,
    });
    expect(result.persistNewUrl).toBe(true);
    expect(result.imageUrl).toBe("/uploads/notes/slug/foto.jpg");
    expect(result.oldAbsolutePath).toBeNull();
    expect(result.rejectMessage).toBeNull();
  });

  it("rejects legacy imageless note without new upload", () => {
    const result = resolveNoteImageReplacement({
      currentPublicUrl: "",
      hasNewUpload: false,
      newPublicUrl: "",
      config,
    });
    expect(result.persistNewUrl).toBe(false);
    expect(result.imageUrl).toBeUndefined();
    expect(result.oldAbsolutePath).toBeNull();
    expect(result.rejectMessage).toBe("La imagen es obligatoria");
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

      expect(result.relativePath).toMatch(/^notes\/mi-nota\/mifoto-[a-f0-9]+\.png$/);
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

  it("rejects an oversized file with a Spanish error (before optimize)", async () => {
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

  it("rejects non-image bytes before optimization (sniff gate)", async () => {
    dir = await makeTempDir();
    try {
      // Non-image bytes → sniff returns null → rejected with Spanish message
      const nonImage = makeFile(
        new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]),
        "data.bin",
      );
      await expect(
        saveImageUpload(nonImage, "slug", { uploadsDir: dir, publicUploadsUrl: "/uploads" }),
      ).rejects.toThrow("Formato de imagen no permitido");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("wraps sharp errors as UploadValidationError with Spanish message", async () => {
    dir = await makeTempDir();
    vi.mocked(optimizeImage).mockRejectedValueOnce(new Error("sharp: something broke"));
    try {
      const result = await saveImageUpload(pngFile(), "slug", {
        uploadsDir: dir,
        publicUploadsUrl: "/uploads",
      });
      // If optimizeImage throws, saveImageUpload wraps it
      // But since mock is reset after this test, let's verify the behavior:
      // Actually the mock is set to reject, so we should get an error
      // But the file was written first — wait, no, optimize is called before writeFile.
      // Let me re-check: optimize is called, throws, wrap catches, re-throws as UploadValidationError.
      // The test should work as-is if optimize throws first.
      expect.fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(UploadValidationError);
      expect((e as Error).message).toBe("La imagen no se pudo procesar");
    } finally {
      vi.mocked(optimizeImage).mockReset();
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
