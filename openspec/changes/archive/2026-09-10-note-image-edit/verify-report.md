```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:038026447b8194154c993a9e168674df27ef626b01c40d0932b5d3b33cbb87c8
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 7/7
scenarios: 25/25
test_command: pnpm test
test_exit_code: 0
test_output_hash: sha256:1fcb23c0bc12d34da75e870876861a271f0add3af0ab5e79285bbc57300ea2a6
build_command: pnpm build
build_exit_code: 0
build_output_hash: sha256:f7c058f6feb9959adf8f3799b1482d054b97f41c496b41574bdc85f71cc8efb1
```

## Verification Report

**Change**: note-image-edit
**Version**: N/A (delta specs)
**Mode**: Standard (`strict_tdd: false` in `openspec/config.yaml`)

### Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 24 |
| Tasks complete | 22 |
| Tasks incomplete | 2 (Phase 7 commit tasks — delivery, deferred to delivery/archive) |

### Build & Tests Execution

**Build**: ✅ Passed (exit 0)
```text
pnpm build  →  astro build
[build] output: "static" / mode: "server" / adapter: @astrojs/node
prerendering: /index.html, /en/index.html (static routes)
generating optimized images: 7 (reused cache)
[build] Server built in 1.18s — Complete!
```

**Tests**: ✅ 114 passed / 0 failed / 0 skipped
```text
pnpm test  →  vitest run
Test Files  13 passed (13)
     Tests  114 passed (114)
```

**Coverage**: ➖ Not available (config `coverage.available: false`)

### Spec Compliance Matrix

19 scenarios are runtime-tested (COMPLIANT); 6 scenarios are accepted manual/source verification (maintainer-approved for this change, since `integration: false` / `e2e: false` — no UI/component runtime harness exists).

#### image-upload (12 scenarios)

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Magic-Byte MIME Sniff | Valid JPEG accepted | `src/lib/uploads-mime.test.ts` > "accepts a real JPEG header" | ✅ COMPLIANT |
| Magic-Byte MIME Sniff | Valid PNG accepted | `src/lib/uploads-mime.test.ts` > "accepts a real PNG header" | ✅ COMPLIANT |
| Magic-Byte MIME Sniff | WebP rejected | `src/lib/uploads-mime.test.ts` > "rejects WebP (no longer accepted)" | ✅ COMPLIANT |
| Magic-Byte MIME Sniff | Non-matching MIME rejected | `src/lib/uploads-mime.test.ts` > "rejects a GIF disguised as .jpg regardless of extension" | ✅ COMPLIANT |
| Server-Side Optimization | JPEG re-encoded | `src/lib/image-optimize.test.ts` > "preserves JPEG format" | ✅ COMPLIANT |
| Server-Side Optimization | PNG re-encoded | `src/lib/image-optimize.test.ts` > "preserves PNG format" | ✅ COMPLIANT |
| Server-Side Optimization | EXIF orientation stripped | `src/lib/image-optimize.test.ts` > "strips EXIF orientation via rotate()" | ✅ COMPLIANT |
| Server-Side Optimization | OOM guard on large dimensions | `src/lib/image-optimize.test.ts` > "throws when any axis exceeds MAX_IMAGE_AXIS_PX" | ✅ COMPLIANT |
| Server-Side Optimization | Long edge capped | `src/lib/image-optimize.test.ts` > "downscales a 4000×3000 image so longest edge ≤ 2400" | ✅ COMPLIANT |
| Image Replacement on Edit | New image replaces existing | `uploads.test.ts` > "persists new URL and computes old absolute path on replacement" + `notes-repo.test.ts` > "includes image_url in SET clause when imageUrl is provided"; unlink-after-DB ordering source-verified | ✅ COMPLIANT |
| Image Replacement on Edit | No new image retains existing | `uploads.test.ts` > "retains existing image when no new upload is provided" + `notes-repo.test.ts` > "omits image_url from SET clause when imageUrl is omitted" | ✅ COMPLIANT |
| Image Replacement on Edit | Unlink gated on DB success | (source-verified) `editar/[slug].astro` L94-112: `updateNote` → `if (!updated) return 404` precedes unlink; old-path decision runtime-tested | ✅ SOURCE-VERIFIED (accepted) |

#### writer-form (13 scenarios)

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| WriterForm Server Island | Create mode renders form with required image input | (source-verified) `WriterForm.astro` L70-75 `enctype="multipart/form-data"`, L147-154 file input `required={!isUpdate}` (true in create) | ✅ SOURCE-VERIFIED (accepted) |
| WriterForm Server Island | Update mode renders form with replaceable image input | (source-verified) `WriterForm.astro` L132-141 preview `<img>`, L143-155 file input (not required), L73 `enctype` | ✅ SOURCE-VERIFIED (accepted) |
| WriterForm Server Island | Spanish UI | (source-verified) `WriterForm.astro` L78/92/106/121/134/145 labels "Título/Subtítulo/Cuerpo/Etiqueta/Imagen actual/Imagen (JPG/PNG, máx. 5MB)"; L53/161 headings+buttons | ✅ SOURCE-VERIFIED (accepted) |
| Server-Side Validation | Create without image rejected | (source-verified) `nueva.astro` L63-65 `if (!isNonEmptyFile(image)) error = "La imagen es obligatoria"` | ✅ SOURCE-VERIFIED (accepted) |
| Server-Side Validation | Update with new valid image accepted | `uploads.test.ts` > "persists new URL and computes old absolute path on replacement" + `notes-repo.test.ts` > "includes image_url in SET clause" | ✅ COMPLIANT |
| Server-Side Validation | Update without new image accepted | `uploads.test.ts` > "retains existing image when no new upload is provided" + `notes-repo.test.ts` > "omits image_url" | ✅ COMPLIANT |
| Server-Side Validation | Oversized image rejected | `uploads.test.ts` > "rejects an oversized file with a Spanish error (before optimize)" | ✅ COMPLIANT |
| Server-Side Validation | Invalid MIME rejected | `uploads.test.ts` > "rejects non-image bytes before optimization (sniff gate)" | ✅ COMPLIANT |
| Publish to Database | Note created with image | `notes-repo.test.ts` > createNote asserts `image_url` param (`insertCall[1][4]`) | ✅ COMPLIANT |
| Publish to Database | Note updated with new image | `notes-repo.test.ts` > "includes image_url in SET clause when imageUrl is provided" | ✅ COMPLIANT |
| Publish to Database | Note updated without image change | `notes-repo.test.ts` > "omits image_url from SET clause when imageUrl is omitted" | ✅ COMPLIANT |
| Image Attachment | No remove-image action exists | (source-verified) `WriterForm.astro` — no "quitar imagen"/remove control; only file input (L143-155) + read-only preview (L132-141) | ✅ SOURCE-VERIFIED (accepted) |
| Image Attachment | Image replaced on edit | `uploads.test.ts` > "persists new URL and computes old absolute path on replacement" + `notes-repo.test.ts` > "includes image_url in SET clause"; unlink glue source-verified | ✅ COMPLIANT |

**Compliance summary**: 19/25 runtime-COMPLIANT, 6/25 accepted manual/source (0 untested blockers, 0 failing)

### Correctness (Static Evidence)

| Requirement | Status | Notes |
|------------|--------|-------|
| Magic-Byte MIME Sniff | ✅ Implemented | `sniffImageMime` accepts only `FF D8 FF` (JPEG) / `89 50 4E 47` (PNG); WebP + RIFF probe removed from `uploads-mime.ts` (type union now `image/jpeg \| image/png`) |
| Server-Side Optimization | ✅ Implemented | `optimizeImage` in `image-optimize.ts`: `rotate()` EXIF strip, resize `fit:inside` 2400px, jpeg mozjpeg q82 / png compression 9 palette, axis>8000 bail; wired after sniff before `writeFile` in `saveImageUpload` |
| Image Replacement on Edit | ✅ Implemented | `resolveNoteImageReplacement` pure helper (uploads.ts L134-168); `editar/[slug].astro` uses it, persists `imageUrl`, unlinks old AFTER `updateNote` returns non-null |
| WriterForm Server Island | ✅ Implemented | `enctype="multipart/form-data"` both modes, `accept="image/jpeg,image/png"`, `required={!isUpdate}`, label "JPG/PNG, máx. 5MB", preview in update, no remove control |
| Server-Side Validation | ✅ Implemented | create requires image ("La imagen es obligatoria"); update optional; size + MIME via `saveImageUpload`; legacy imageless rejected by helper |
| Publish to Database | ✅ Implemented | `NoteUpdate.imageUrl?`; conditional `image_url = $6` only when provided (omit → retain) |
| Image Attachment | ✅ Implemented | No "quitar imagen" control (grep: none); note never imageless; legacy imageless edit rejected |

### Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| Optimize lives in separate `image-optimize.ts` | ✅ Yes | Keeps existing `uploads.test.ts` fixtures valid via `vi.mock("./image-optimize")` |
| Extend `NoteUpdate.imageUrl?` (vs `setNoteImage()`) | ✅ Yes | Conditional SET clause, atomic single query |
| Wrap optimize errors as `UploadValidationError` | ✅ Yes | "La imagen no se pudo procesar" |
| Unlink old file AFTER DB write | ✅ Yes | `if (!updated) return 404` precedes unlink block |
| Dynamic `await import("sharp")` | ✅ Yes | Keeps sharp off non-server graph |
| JPG/PNG label in `WriterForm.astro` (not `nueva.astro`) | ✅ Yes | Matches corrected design note |
| Extract testable edit-flow decision | ✅ Yes | `resolveNoteImageReplacement` pure helper, handler rewired, 5 unit tests added (Phase 8) |

### Issues Found

**CRITICAL**: None.

**WARNING**:
- 6 scenarios are accepted manual/source verification (maintainer-approved for this change) rather than runtime-tested: "Unlink gated on DB success", "Create mode renders form", "Update mode renders form", "Spanish UI", "Create without image rejected", "No remove-image action exists". The project declares `integration: false` / `e2e: false`, so no component/UI runtime harness exists for the server-island HTML or the page POST handlers. These are verified by source inspection + successful build, and accepted by the maintainer as sufficient for THIS change — not blockers.
- Phase 7 commit tasks (7.1, 7.2) are NOT run — deferred to delivery. No delta-spec scenario requires commit ordering, so this is a delivery gap, not a code defect. Orchestrator must gate archive on delivery commits.
- Unlink-after-DB-success ordering (the "unlink gated on DB success" clause of the replace scenarios) is source-verified only; the old-path *decision* is runtime-tested via `resolveNoteImageReplacement`.
- Stray unrelated modification: `src/components/NavBar.astro` (nav max-width + favicon anchor) is uncommitted in the working tree and is NOT part of this change. It will be swept into any broad commit unless staged separately.

**SUGGESTION**:
- If UI/integration coverage becomes available later (e.g. an Astro component/endpoint test harness), promote the 6 source-verified scenarios to runtime tests.

### Verdict

PASS WITH WARNINGS — all 114 tests and the build pass (exit 0), every spec requirement is implemented and source-correct, and all 25 scenarios are verified: 19 by passing runtime tests and 6 by maintainer-accepted manual/source verification (project declares no integration/e2e harness). Remaining warnings are the accepted manual/source items and the deferred Phase 7 delivery commits (delivery gap, not a code defect).
