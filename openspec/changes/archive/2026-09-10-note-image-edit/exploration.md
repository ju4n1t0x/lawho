# Exploration: note-image-edit

Change: when a writer edits a note, they must be able to REPLACE the image or ADD one if the note has none. Only JPG and PNG allowed, max 5 MB. Investigate whether uploaded images can be optimized server-side before being written to the filesystem.

## Current State

### Edit / create flow for the note image today

1. **`src/components/server-islands/WriterForm.astro`** is the shared form with `mode: "create" | "update"`:
   - `mode="create"` (default): renders an empty `<form enctype="multipart/form-data" action="/escritor/nueva">` with a `name="image"` file input (accepts `image/jpeg,image/png,image/webp`).
   - `mode="update"`: renders `<form action={actionUrl}>` with **NO `enctype`** (line 73) and **NO file input** — only a read-only `<img src={imageUrl}>` preview (lines 132-140). Label/button copy is "Editar nota / Guardar".
2. **`src/pages/escritor/nueva.astro`** owns the POST handler for create mode:
   - Reads `formData` and parses `title / subtitle / body / tag` plus `image` (via `isNonEmptyFile` type guard).
   - On a valid `File`, calls `saveImageUpload(image, slug, { uploadsDir, publicUploadsUrl, maxBytes })`.
   - On success, persists the public URL via `createNote({ ..., imageUrl })`.
3. **`src/pages/escritor/editar/[slug].astro`** owns the POST handler for update mode:
   - Parses **only** `title / subtitle / body / tag` from `formData`. **Never reads `image`.**
   - Calls `updateNote(slug, { title, subtitle, body, tag })`.
4. **`src/lib/notes-repo.ts → updateNote(slug, fields)`** SQL: `UPDATE notes SET title=$2, subtitle=$3, body=$4, tag=$5, updated_at=now() WHERE slug=$1 AND deleted_at IS NULL`. The `image_url` column is **never in the SET clause** (this is asserted in `notes-repo.test.ts:184-186`: `expect(setClause).not.toContain("image_url")`).
5. **Result**: today it is **structurally impossible** for a writer to replace or add an image after the note is created. The update form has no file input, the page does not parse one, and the repo function refuses to write `image_url`.

### Upload pipeline & validation

- **`src/lib/uploads.ts → saveImageUpload(file, slug, config)`**:
  - Reads `MAX_UPLOAD_SIZE_BYTES` (env, default `5242880` = 5 MB — see `astro.config.mjs:32`; constant `DEFAULT_MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024`).
  - Calls `assertWithinSizeLimit(file.size, maxBytes)` (boundary inclusive; Spanish error `"La imagen no debe superar XMB"`).
  - Reads bytes via `file.arrayBuffer()` and passes through **`sniffImageMime(bytes)`** (`src/lib/uploads-mime.ts`) — magic-byte detection for JPEG (`FF D8 FF`), PNG (`89 50 4E 47`), WebP (`RIFF…WEBP`). Anything else → `"Formato de imagen no permitido"`.
  - Sanitizes filename via `sanitizeFilename` + `buildUniqueFilename` (lowercase, `[a-z0-9._-]`, hidden-dot prefix stripped, random 4-byte hex suffix → no collisions).
  - Writes raw bytes to `${UPLOADS_DIR}/notes/<slug>/<sanitized>-<hex>.<ext>` via `mkdir({ recursive: true })` + `writeFile`.
  - Returns `{ relativePath, publicUrl: ${PUBLIC_UPLOADS_URL}/${relativePath}, absolutePath }`. The DB stores `publicUrl` only — never a local path.
- **No extension/MIME downgrade today**: a `.png` upload whose content is sniffed as `image/png` is saved verbatim. No re-encoding, no resize, no orientation fix, no compression. Uploaded bytes go to disk untouched.

### Storage and serving

- **Env** (`astro.config.mjs:21-36` + `.env.example`): `UPLOADS_DIR` (secret, default `./uploads`), `PUBLIC_UPLOADS_URL` (public, default `/uploads`), `MAX_UPLOAD_SIZE_BYTES` (secret, default `5242880`).
- **Disk**: `${UPLOADS_DIR}/notes/<slug>/` — confirmed by `uploads/notes/margaritas/cnweb_…sq-af5a5cdb.webp` (20 KB) and `uploads/notes/nota-de-prueb/avatar-3-09b41b13.png` (≈2 MB).
- **Serving**: Nginx serves `/uploads/**` directly from `RUTA_UPLOADS` via `alias` (`deploy/nginx.conf.example:35-40`, repeated in the auth subdomain at line 67-72). Headers: `expires 30d`, `Cache-Control: public, immutable`, `X-Content-Type-Options: nosniff`. The Astro Node process **never touches uploads on read**; filename randomness already provides cache-busting for new uploads.

### Content schema and rendering

- `src/content.config.ts` is empty (`export const collections = {};` — build-time glob loader was retired).
- `src/live.config.ts` declares `notes` as a live Postgres-backed collection with `image: z.string()` (runtime URL, **not** the build-time `image()` helper). `NoteData` (`src/lib/notes-mapper.ts:16-25`) carries `image: string` → `image_url` column.
- Rendered by `NoteCard.astro` (terreno grid) and `NoteTemplate.astro` (detail) as plain `<img src={image}>` — no `<Image>` from `astro:assets`, no width/height hint, lazy only. So whatever bytes land on disk are served verbatim by Nginx.

### Optimization feasibility — sharp at upload time

- **`sharp@^0.35.4` is already an explicit direct dependency** (`package.json:22`). Added during the `2026-09-10-astro-image-refactor` archive so that Astro's `<Image>` build pipeline could resolve libvips through pnpm's strict node_modules.
- `pnpm-workspace.yaml` already whitelists `sharp: true` under `allowBuilds` (and `esbuild`); no new allow-build entry needed.
- `docs/constitution.md` rule 1 already lists `sharp` as an exception ("motor nativo de imágenes requerido por el pipeline `astro:assets`"). The constitution rationale was the build-time `<Image>` path; reusing sharp at upload time falls under the same exception but **we should still be explicit in the change proposal that sharp usage is being extended to runtime**, not introduce the dependency.
- **Local feasibility verified**: a one-liner `node -e "require('sharp').(...).jpeg().toBuffer()"` produces a 267-byte JPEG. Sharp resolves libvips correctly on this machine.
- **Runtime context**: the writer pages already run on the Node adapter (`astro.config.mjs:10`, `adapter: node({ mode: 'standalone' })`) and all three routes (`/escritor/nueva`, `/escritor/editar/[slug]`) set `export const prerender = false`. The POST handler is already executing inside Node — there is no SSR boundary to cross. Sharp can run in the same handler that calls `saveImageUpload` today.
- **API surface we need**:
  - Read buffer: `const sharp = (await import("sharp")).default; const pipeline = sharp(bytes);` — `await import("sharp")` keeps the module out of the static client bundle even though `astro:env/server` already protects the secret side; it's also friendlier to ESM resolution.
  - EXIF orientation: `pipeline.rotate()` — auto-applies the EXIF orientation tag and **strips it from the output** (recommended for both JPEG and PNG; PNG doesn't carry EXIF but `.rotate()` is a no-op there).
  - Re-encode preserving format: `await pipeline.jpeg({ quality: 82, mozjpeg: true }).toBuffer()` for `image/jpeg`, `await pipeline.png({ compressionLevel: 9, palette: true }).toBuffer()` for `image/png`. Preserve the extension so URL contracts (`.jpg` / `.png`) stay stable and Nginx `expires 30d` semantics continue to hold.
  - Optional cap on the longest edge (`pipeline.resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })`) to avoid writers uploading 6000×4000 phone dumps.
- **Transcode to WebP/AVIF?** Explicitly **NOT recommended** as the default:
  - The user requirement says uploads must be JPG/PNG. Honoring that as INPUT is enough; OUTPUT can differ, but switching to WebP would break every existing `image_url` in the DB (still served as the original `.webp` / `.png`) and would require regenerating thumbnails that don't exist. The cache headers (`public, immutable`) compound the cost.
  - If we ever want to add WebP, it should be a separate change with a transparent variant.
- **Memory**: 5 MB max input → sharp peak RAM ≲ 30-50 MB per request (decode + working bitmap). Comfortable for the single-process Node server behind Nginx.
- **Testability**: the existing pattern (`src/lib/uploads.test.ts`) builds `File` objects from hand-rolled byte arrays. The new optimization step should be a pure function `optimizeImage(bytes, mime) → { bytes, mime }` so unit tests can pass tiny synthetic PNG/JPEG payloads and assert size/orientation behavior without touching sharp's libvips in CI. `sharp` itself is already exercised in `2026-09-10-astro-image-refactor`'s `pnpm build` — same setup will apply here.

### Old-file cleanup gap

There is **no filesystem cleanup anywhere today**:
- `updateNote` doesn't touch images.
- `softDeleteNote` (`src/lib/notes-repo.ts:164-172`) sets `deleted_at` but **does not** delete `${UPLOADS_DIR}/notes/<slug>/**`.
- Replacing or removing an image in the new flow will orphan files. Worth deciding in the proposal whether the new flow should `unlink` the previous file (replace/clear paths) and whether soft-delete should optionally sweep the slug directory (or be left as-is — that's a separate change).

## Affected Areas

- `src/components/server-islands/WriterForm.astro` — change `enctype` for update mode; always render a file input (with current image preview when one exists); update label/copy and `accept` attribute to JPG/PNG only.
- `src/pages/escritor/editar/[slug].astro` — accept `enctype=multipart/form-data`, parse the optional `image` `File`, save + (optionally) optimize, update `image_url` in DB, unlink the previous file when replaced.
- `src/pages/escritor/nueva.astro` — drop WebP from the user-facing label (`accept` and "JPG/PNG/WebP, máx. 5MB" → "JPG/PNG, máx. 5MB"). Validation already lives in `uploads.ts`; only the label needs to match.
- `src/lib/uploads.ts` — add an `optimizeImage(bytes, mime) → { bytes, mime }` helper invoked from `saveImageUpload` (or from a new wrapper) **before** writing to disk; or extract a new `saveOptimizedImageUpload` so the create path can opt in explicitly.
- `src/lib/uploads-mime.ts` — drop WebP from `AcceptedImageMime` (was `"image/jpeg" | "image/png" | "image/webp"` → `"image/jpeg" | "image/png"`); remove the WebP signature probe.
- `src/lib/uploads-mime.test.ts` — drop the WebP accept test and the RIFF-not-WebP negative test; add a "JPEG without JFIF still sniffed as image/jpeg" guard if relevant.
- `src/lib/uploads.test.ts` — add cases: oversized optimized output still within input cap (size check happens BEFORE optimization); orientation strip; format preserved (jpg → jpg, png → png); magic-byte sniff runs before optimization.
- `src/lib/notes-repo.ts` — extend `updateNote` (or add `setNoteImage(slug, imageUrl)`) so the edit handler can persist `image_url`. The current test `notes-repo.test.ts:184-186` ("image_url must NOT appear in the SET clause") **must be updated/removed** — it's the explicit guard that blocks today's intended behavior.
- `src/lib/notes-repo.test.ts` — update the assertion above; add coverage for image_url being persisted on update.
- `openspec/specs/image-upload/spec.md` — drop WebP from the accepted MIME requirement; add a new requirement "Server-Side Optimization" (quality, format-preserve, EXIF strip, max-edge cap, no transcode); add an "Image Replacement" requirement covering edit flow and old-file unlink.
- `openspec/specs/writer-form/spec.md` — change "image (file, optional in create mode, read-only in update mode)" to "file, optional in both modes; in update mode replaces existing image (or adds one if absent)"; update validation scenarios; add the "replace" and "add on edit" scenarios.
- `openspec/specs/writer-dashboard/spec.md` — no change unless we add a "quitar imagen" affordance from the dashboard (out of scope by default).
- `docs/constitution.md` — no amendment needed; rule 1 already lists `sharp`. We just need to document the runtime extension in the proposal's `## Risks / ## Approach` so the next reader understands the scope creep.
- `README.md` / `.env.example` — only if we add new env knobs (e.g. `IMAGE_MAX_EDGE_PX`, `JPEG_QUALITY`). Default: keep them as constants in `uploads.ts` (consistent with `DEFAULT_MAX_UPLOAD_SIZE_BYTES`).

## Approaches

### A. Optimize in `saveImageUpload` (always, single pipeline)

Extend `saveImageUpload` so it runs `sharp(bytes).rotate().resize(...).jpeg()/.png().toBuffer()` whenever the input is a recognized JPEG/PNG, then writes the optimized bytes. Single helper, create + update benefit equally, no caller-side branching.

- **Pros**: one change site; no possibility of accidentally skipping optimization in some new caller; tight coupling with the existing 5 MB cap (cap stays on input, output is always smaller).
- **Cons**: slightly more behavior baked into a function whose current contract is "validate → write". Tests must cover optimization too. The `accept` attribute on the form must continue to allow only JPG/PNG so the user-facing contract matches the optimization pipeline.
- **Effort**: Medium (≈1 helper + ~6 unit tests + 2 spec files).

### B. Add a new `saveOptimizedImageUpload`, keep `saveImageUpload` raw

Two entry points: existing `saveImageUpload` stays unchanged for any future raw-write need; the writer flow switches to `saveOptimizedImageUpload`.

- **Pros**: pure addition, lower regression risk on existing tests; clearer naming.
- **Cons**: two code paths to keep in sync (MIME/size logic); the existing tests still cover the raw path which we will not use in production → small maintenance tax.
- **Effort**: Medium (similar to A but with more code).

### C. No optimization — only enable replace/add and tighten MIME

Skip sharp entirely; just let the writer upload a replacement JPG/PNG, save verbatim, delete the old file.

- **Pros**: minimum surface; no sharp-at-runtime questions; trivially testable.
- **Cons**: ignores the "investiga si es posible optimizarlas" mandate; misses the obvious win (the 2 MB sample avatar in `uploads/notes/nota-de-prueb/` would land on Nginx verbatim and be served as-is to every visitor); inconsistent with the constitution's `sharp` allowance.
- **Effort**: Low, but **does not satisfy the user's request**.

### Recommendation

**Approach A**, with one twist: extract the sharp step into a small pure helper `optimizeImage(bytes: Uint8Array, mime) → Promise<{ bytes, mime }>` so the unit tests can pin the format-preserve and EXIF behavior independently of the filesystem write, and so future callers can opt out if ever needed. Then `saveImageUpload` calls it after the magic-byte sniff and before `writeFile`. Create and update flows both reuse the same `saveImageUpload`; the only new caller-side work in `editar/[slug].astro` is "if a new file was submitted, call `saveImageUpload` and then `updateNote({ imageUrl })`; if it replaced an existing image, unlink the old absolute path on success". Old-file unlink must be **after** the DB transaction succeeds so a failed write doesn't leave the note pointing at a missing file.

Concretely the writer flow becomes:

1. `isUpdate` form always renders an optional `<input type="file" name="image">` plus the existing preview.
2. Edit handler: parse `image`; if `isNonEmptyFile`, `saveImageUpload(image, slug, { … })` → `newPublicUrl`. Pass `newPublicUrl` (or the previous one if no new upload) to `updateNote({ ..., imageUrl })`. After the update returns, if the image changed, `unlink(previousAbsolutePath)`.
3. Create handler is unchanged in shape (already calls `saveImageUpload` + `createNote`).
4. Optimization is invisible to the caller: bytes always go to disk smaller-or-equal than what the writer uploaded, with the same extension.

## Risks

- **CRITICAL — spec drift on existing tests**: `src/lib/notes-repo.test.ts:184-186` literally asserts that `image_url` must NOT appear in the UPDATE SET clause. The change must update this assertion. If missed, tests will fail and signal the issue; still worth flagging so the apply phase knows to touch it intentionally, not as an accident.
- **CRITICAL — WebP spec change**: `openspec/specs/image-upload/spec.md` Scenario "Valid WebP accepted" (lines 38-45) and `WriterForm` `accept` attribute both currently permit WebP. The user requirement narrows to JPG/PNG. Dropping WebP is a backwards-incompatible input change but **only affects new uploads**; existing notes still render their stored image_url (which might be `.webp` from earlier uploads — those continue to serve fine via Nginx).
- **WARNING — partial-upload DoS / OOM**: even at 5 MB, sharp will briefly decode into an uncompressed bitmap (RGBA). For a hostile 5000×5000 PNG (≤5 MB compressed), decoded bitmap is ~100 MB. Either (a) trust the 5 MB cap and the trusted-writer auth gate (writer accounts only), or (b) add `pipeline.metadata()` check + bail before allocating bitmap if dimensions exceed a sane cap (e.g. 8000×8000). Recommend (b) for defense in depth — one extra early-return.
- **WARNING — old-file unlink race**: deleting the previous file **after** the DB write means there is a small window where Nginx could serve the old file for visitors who loaded the page before the writer's redirect. Acceptable (browser cache + `expires 30d` means most clients won't re-fetch mid-second), but document it.
- **WARNING — sharp on the deploy container**: previous archive `2026-09-10-astro-image-refactor/apply-progress.md` already established that `pnpm install` resolves `@img/sharp-libvips-linux-x64` on the platform. Same applies here. If the deploy image changes to alpine or musl, sharp may need a platform rebuild — same gotcha as before.
- **WARNING — Nginx `immutable` cache**: with `expires 30d` + `Cache-Control: public, immutable`, an editor who replaces a note's image and a visitor who already loaded the old URL keep the old bytes for up to 30 days. The random hex suffix in `buildUniqueFilename` already prevents this for newly-replaced images (the URL changes), but if a writer uploads the SAME file (same sanitized name) and we want to reuse the URL, we'd need to either bump a cache version or accept the staleness. Default behavior: keep the random suffix → no problem.
- **WARNING — image rotation loses EXIF entirely**: sharp's `.rotate()` strips EXIF. If we ever wanted to keep GPS/camera metadata, we'd skip `.rotate()` and instead apply orientation per-render in CSS. The detail page just shows the image; no current spec needs EXIF.
- **INFO — soft-delete still leaves image files**: out of scope for this change. Mention as follow-up.
- **INFO — content.config.ts already empty**: nothing to update there.

## Ready for Proposal

**Yes.** The investigation is complete:

- The user-visible feature ("edit a note and replace or add its image") is structurally missing today; the gap is clearly identified and limited to a small set of files.
- The validation tightening (JPG/PNG only, 5 MB) is a one-file spec change plus the MIME probe and label copy.
- The optimization step is feasible (sharp is installed, constitution permits it, Node runtime available, API surface known) and the recommended approach is conservative (preserve format, strip orientation, optional max-edge cap, no transcode).
- The 400-line PR budget is comfortable: roughly 4 production files, 2 test files, 2 spec files — well under the budget; no chained PR needed (forecast: **Low risk**).

Orchestrator should proceed to **sdd-propose** for this change. The proposal must:

1. Frame the user request as a single feature ("note-image-edit") with two sub-buckets: (a) enable replace/add on edit, (b) tighten allowed MIME to JPG/PNG + 5 MB, (c) optimize at upload.
2. Explicitly extend the existing `sharp` constitutional exception to **runtime** use, not re-amend the constitution.
3. Decide on the old-file unlink semantics (recommend: unlink on replace, leave on soft-delete).
4. Decide whether to expose `IMAGE_MAX_EDGE_PX` as an env var or keep as a constant (recommend constant, matching `DEFAULT_MAX_UPLOAD_SIZE_BYTES` precedent).
5. Acknowledge that `notes-repo.test.ts` assertion at line 184-186 must be updated intentionally.

Skill resolution: **paths-injected** (orchestrator provided the four exact SKILL.md paths in the launch prompt; no fallback or registry needed).
