# Tasks: Note Image Edit

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~400 (360–440; 11 files, 2 new + tests) |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | single PR |
| Delivery strategy | single-pr |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Image edit/replace end-to-end | PR 1 | `pnpm test` | Node 22 `pnpm build` + manual edit-with-new-file | Revert commit; `image_url` additive, sharp already a dep |

## Phase 1: Optimize module (Foundation)

- [x] 1.1 Create `src/lib/image-optimize.ts`: `optimizeImage(bytes, mime)`, constants `MAX_IMAGE_EDGE_PX=2400`/`MAX_IMAGE_AXIS_PX=8000`/`JPEG_QUALITY=82`, dynamic `await import("sharp")`.
- [x] 1.2 Create `src/lib/image-optimize.test.ts` (real sharp): EXIF stripped via `rotate()`; JPEG mozjpeg q82 format-preserved; PNG compression 9 palette.
- [x] 1.3 Test: 4000×3000 → longest edge ≤2400, aspect preserved; axis >8000 bails from `metadata()` before decode.

## Phase 2: MIME narrowing

- [x] 2.1 `src/lib/uploads-mime.ts`: drop `image/webp` from `AcceptedImageMime` and RIFF/WEBP probe.
- [x] 2.2 `src/lib/uploads-mime.test.ts`: remove WebP-accept + RIFF-not-WebP; add WebP-rejected.

## Phase 3: Uploads wiring

- [x] 3.1 `src/lib/uploads.ts`: call `optimizeImage` after sniff before `writeFile`; write optimized bytes, keep sniffed mime.
- [x] 3.2 Add `absolutePathFromPublicUrl(publicUrl, config)` in `src/lib/uploads.ts` (strip prefix, reject `..`, join `uploadsDir`).
- [x] 3.3 Wrap optimize failures as `UploadValidationError("La imagen no se pudo procesar")`.
- [x] 3.4 `src/lib/uploads.test.ts`: `vi.mock("./image-optimize")`; 5MB cap on input pre-opt; non-image rejected before optimize; optimize throw → Spanish.
- [x] 3.5 Test: `absolutePathFromPublicUrl` valid → abs path; `..`/unmatched → null.

## Phase 4: Repo persistence

- [x] 4.1 `src/lib/notes-repo.ts`: add `imageUrl?: string` to `NoteUpdate`; append `image_url = $6` only when provided.
- [x] 4.2 `src/lib/notes-repo.test.ts` L184–186: reverse guard; assert `image_url` in SET when provided, `$6` order; omitted → 5 params.

## Phase 5: Form + handlers

- [x] 5.1 `src/components/server-islands/WriterForm.astro`: `enctype="multipart/form-data"` both modes; always render file input; `accept="image/jpeg,image/png"`; label "JPG/PNG, máx. 5MB"; required in create; preview in update; NO remove control.
- [x] 5.2 `src/pages/escritor/nueva.astro`: image REQUIRED → "La imagen es obligatoria"; no `createNote` when absent.
- [x] 5.3 `src/pages/escritor/editar/[slug].astro`: provided → save+optimize → `updateNote({ imageUrl })` → unlink old abs path after DB success (non-fatal); no file → retain; legacy imageless requires a file.

## Phase 6: Verification

- [x] 6.1 `pnpm test` under Node 22 (`$HOME/.nvm/versions/node/v22.22.3/bin` PATH) — all pass.
- [x] 6.2 `pnpm build` — succeeds.
- [x] 6.3 Source checks: no remove control; `image_url` in SET; WebP absent from `src/lib/uploads-mime.ts`.

## Phase 7: Commit

- [x] 7.1 Delivered as single commit `d75eeeb` under maintainer-approved `size:exception` (single-pr strategy); the work-unit commit split was superseded by that approved strategy.
- [x] 7.2 Spec-deltas planning-only; canonical specs synced at archive — completed by `sdd-archive` on 2026-09-10.

## Phase 8: Corrective — extract testable edit-flow logic

- [x] 8.1 Extract `resolveNoteImageReplacement` pure helper in `src/lib/uploads.ts` (no new file; decision function with `NoteImageReplacementInput` / `NoteImageReplacementResult` interfaces).
- [x] 8.2 Rewire `src/pages/escritor/editar/[slug].astro` to use the helper (same behavior; handler no longer holds untested branch logic).
- [x] 8.3 Add 5 unit tests in `src/lib/uploads.test.ts`: retain-when-no-new-upload; replace → newUrl + old path; prefix-unmatched → null; same-url → null; legacy-imageless → rejected.
- [x] 8.4 `pnpm test` — 114/114 pass; `pnpm build` — exit 0.
