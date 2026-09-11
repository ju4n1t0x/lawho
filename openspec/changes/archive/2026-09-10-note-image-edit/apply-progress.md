# Apply Progress: Note Image Edit

## Completed Tasks

### Phase 1: Optimize module
- [x] 1.1 Create `src/lib/image-optimize.ts` — `optimizeImage(bytes, mime)` with constants, dynamic sharp import
- [x] 1.2 Create `src/lib/image-optimize.test.ts` — real sharp fixtures, EXIF strip, format-preserve, axis bail
- [x] 1.3 Test: 4000×3000 downscaled to ≤2400, axis >8000 throws

### Phase 2: MIME narrowing
- [x] 2.1 Drop WebP from `AcceptedImageMime` and RIFF/WEBP probe
- [x] 2.2 Update tests: remove WebP-accept + RIFF-not-WebP; add WebP-rejected

### Phase 3: Uploads wiring
- [x] 3.1 Call `optimizeImage` after sniff before writeFile
- [x] 3.2 Add `absolutePathFromPublicUrl(publicUrl, config)`
- [x] 3.3 Wrap optimize failures → `UploadValidationError("La imagen no se pudo procesar")`
- [x] 3.4 `uploads.test.ts`: mock optimizeImage, 5MB cap pre-opt, non-image rejected pre-opt, sharp-failure → Spanish
- [x] 3.5 `absolutePathFromPublicUrl` tests: valid → abs path; `..`/unmatched → null

### Phase 4: Repo persistence
- [x] 4.1 `NoteUpdate` gains `imageUrl?: string`; conditional `image_url = $N` SET clause
- [x] 4.2 Tests: reverse guard, image_url in SET when provided, $6 order, omitted → 5 params

### Phase 5: Form + handlers
- [x] 5.1 WriterForm: `enctype="multipart/form-data"` both modes; always render file input; JPG/PNG; required in create; preview in update; NO remove control
- [x] 5.2 nueva.astro: image REQUIRED → "La imagen es obligatoria"
- [x] 5.3 editar/[slug].astro: save+persist, unlink old after DB success (non-fatal), legacy guard

### Phase 6: Verification
- [x] 6.1 `pnpm test` — 109 tests pass (Node 22)
- [x] 6.2 `pnpm build` — succeeds
- [x] 6.3 Source checks pass: no remove control, image_url in SET, WebP absent from uploads-mime

### Phase 8: Corrective — extract testable edit-flow logic
- [x] 8.1 Extract `resolveNoteImageReplacement` pure helper in `src/lib/uploads.ts` — `NoteImageReplacementInput`/`NoteImageReplacementResult` interfaces, pure decision function (no fs/io)
- [x] 8.2 Rewire `src/pages/escritor/editar/[slug].astro` to use helper — handler no longer holds untested branch logic; same behavior preserved
- [x] 8.3 Add 5 unit tests in `src/lib/uploads.test.ts`: retain-when-no-new-upload; replace → newUrl + old path; prefix-unmatched → null; same-url → null; legacy-imageless → rejected
- [x] 8.4 `pnpm test` — 114/114 pass; `pnpm build` — exit 0

## Work Unit Evidence

| Evidence | Value |
|----------|-------|
| Focused test command | `pnpm test` — 114/114 pass, 0 fail |
| Runtime harness | `pnpm build` — exit 0, server built in 1.21s |
| Rollback boundary | Revert Phase 8 only: `resolveNoteImageReplacement` in `uploads.ts` + 5 new tests in `uploads.test.ts` + handler rewiring in `editar/[slug].astro`. No new files; pure additive helper; handler behavior unchanged |

## Delivery
- Mode: single PR (size:exception approved by maintainer)
- Current work unit: corrective re-run (Phase 8)
- Boundary: Phases 1–6 from prior batch + Phase 8 corrective; Phase 7 (commits) still pending
- Estimated review budget impact: ~60 added lines (helper + interfaces + 5 tests + handler rewiring)

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `src/lib/image-optimize.ts` | Created | `optimizeImage` function + constants |
| `src/lib/image-optimize.test.ts` | Created | Real sharp tests: format-preserve, EXIF, resize, axis bail |
| `src/lib/uploads-mime.ts` | Modified | Drop WebP from type union + remove RIFF/WEBP probe |
| `src/lib/uploads-mime.test.ts` | Modified | Remove WebP-accept + RIFF-not-WebP; add WebP-rejected |
| `src/lib/uploads.ts` | Modified | Import optimizeImage; call after sniff; add `absolutePathFromPublicUrl`; wrap errors; add `resolveNoteImageReplacement` + interfaces |
| `src/lib/uploads.test.ts` | Modified | Mock optimizeImage; add `absolutePathFromPublicUrl` + sniff-gate + error-wrap tests; add 5 `resolveNoteImageReplacement` tests |
| `src/lib/notes-repo.ts` | Modified | `NoteUpdate.imageUrl?`; conditional SET clause |
| `src/lib/notes-repo.test.ts` | Modified | Reverse guard; add imageUrl-provided + omitted tests |
| `src/components/server-islands/WriterForm.astro` | Modified | Multipart both modes; always file input; JPG/PNG; required create; preview update; no remove |
| `src/pages/escritor/nueva.astro` | Modified | Image required → "La imagen es obligatoria" |
| `src/pages/escritor/editar/[slug].astro` | Modified | Rewired to use `resolveNoteImageReplacement`; handler no longer owns untested branch logic |

## Status
22/25 tasks complete (Phases 1–6 + Phase 8). Phase 7 (commits) remains. Ready for verify.
