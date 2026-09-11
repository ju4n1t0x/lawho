# Proposal: Note Image Edit

## Intent

A writer editing a note can replace its image — impossible today: update mode has no file input, `editar/[slug].astro` never parses `image`, and `updateNote` refuses `image_url`. A note must ALWAYS have an image: a note cannot be submitted without one (on create, an image file is required), and editing can only REPLACE the existing image, never remove it (there is no "quitar imagen" affordance; if no new file is provided on edit, the existing image is retained). New uploads accept only JPG/PNG ≤5 MB, and every accepted image is optimized server-side with sharp before hitting disk (format-preserving re-encode, EXIF orientation strip, ~2400px max-edge cap, OOM guard). This reuses the existing `sharp@0.35.4` dependency, extending its constitutional exception from build-time (`astro:assets`) to the runtime upload path — no new dependency, no constitution amendment.

## Scope

### In Scope
- Replace note image on edit (form + handler + repo persist); edit retains the existing image when no new file is provided.
- Image is MANDATORY: a note can never be imageless. Create requires an image file; a submit that would leave a note without an image is rejected. No "quitar imagen" affordance (explicitly not wanted by the user).
- Restrict MIME to JPG/PNG (drop WebP); keep the 5 MB input cap.
- sharp optimization: format-preserving re-encode (jpeg mozjpeg q82 / png compression 9 palette), `rotate()` EXIF strip, max-edge ~2400px, metadata OOM guard (bail if axis > ~8000). No transcode.
- Unlink previous file after successful DB write on actual replacement (never when no new file is uploaded).

### Out of Scope
- No WebP/AVIF transcode; no soft-delete file sweep; no dashboard/editor "quitar imagen" affordance (user rejected); no image-less notes (mandatory image is a core requirement, not optional); no new env knobs (params stay constants in `uploads.ts`); `content.config.ts` untouched.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `image-upload`: drop WebP from accepted MIME; add Server-Side Optimization and Image Replacement (edit + old-file unlink) requirements.
- `writer-form`: image file optional in both modes; update mode replaces/adds instead of read-only; validation scenarios updated.

## Approach

Approach A: optimize inside `saveImageUpload`. Extract pure `optimizeImage(bytes, mime) → { bytes, mime }` for testability; `saveImageUpload` calls it after magic-byte sniff, before `writeFile`. Create and update share one pipeline. `editar/[slug].astro` parses optional `image`, saves+optimizes, persists `image_url` via `updateNote`, unlinks the old absolute path after DB success.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/components/server-islands/WriterForm.astro` | Modified | update: `enctype` + always render file input + `accept` JPG/PNG |
| `src/pages/escritor/editar/[slug].astro` | Modified | parse image, save+optimize, persist `image_url`, unlink old |
| `src/pages/escritor/nueva.astro` | Modified | label → "JPG/PNG, máx. 5MB" |
| `src/lib/uploads.ts` | Modified | add `optimizeImage` helper + call in `saveImageUpload` |
| `src/lib/uploads-mime.ts` (+ test) | Modified | drop WebP from `AcceptedImageMime` + probe |
| `src/lib/uploads.test.ts` | Modified | size-before-opt, EXIF strip, format-preserve, sniff-first |
| `src/lib/notes-repo.ts` (+ test) | Modified | persist `image_url`; update SET-clause guard L184-186 |
| `openspec/specs/image-upload/spec.md` | Modified | MIME, optimization, replacement |
| `openspec/specs/writer-form/spec.md` | Modified | optional image both modes, replace/add scenarios |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `notes-repo.test.ts:184-186` asserts `image_url` NOT in SET | High | update assertion intentionally |
| WebP narrowing breaks existing `.webp` uploads | Med | stored URLs keep serving; only new uploads affected |
| sharp OOM on large-dimension ≤5MB file | Low | `metadata()` bail if axis > ~8000 |
| old-file unlink race | Low | unlink after DB success; random suffix busts cache |
| sharp platform rebuild on deploy | Low | reuse libvips from prior archive |
| EXIF strip loses metadata | Low | no spec requires EXIF |

## Rollback Plan

Revert the commit. `image_url` persistence is additive; removing it restores read-only update. No DB migration. sharp is already a dependency.

## Dependencies

None new.

## Success Criteria

- [ ] `vitest run` passes and `astro build` succeeds.
- [ ] Editing a note replaces its image; `image_url` persists; no new file keeps the existing image.
- [ ] A note can never be imageless: create requires an image file, and no remove-image action exists (edit only replaces).
- [ ] Only JPG/PNG accepted; >5 MB rejected.
- [ ] Optimized bytes (≤ input, same extension) written to disk.
