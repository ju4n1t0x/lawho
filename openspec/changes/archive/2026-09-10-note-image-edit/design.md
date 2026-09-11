# Design: Note Image Edit

## Technical Approach

Extract a pure `optimizeImage(bytes, mime) → { bytes, mime }` helper into a new `src/lib/image-optimize.ts`, wire it into `saveImageUpload` after magic-byte sniff and before `writeFile` (format-preserving sharp re-encode). `updateNote` gains an optional `imageUrl` so the edit handler can persist a replacement; `WriterForm` update mode becomes multipart with a replaceable file input. MIME narrows to JPG/PNG. Old file is unlinked only after the DB write succeeds.

## Architecture Decisions

| Decision | Option | Tradeoff | Choice |
|----------|--------|----------|--------|
| Where optimize lives | separate `image-optimize.ts` vs inline in `uploads.ts` | inline forces rewriting all `uploads.test.ts` fixtures (synthetic 12-byte headers aren't sharp-decodable) | **Separate module** — `vi.mock("./image-optimize")` keeps existing fixtures valid |
| Repo persistence | extend `NoteUpdate.imageUrl?` vs `setNoteImage()` | second query breaks atomicity + complicates unlink gating; spec names `updateNote` | **Extend `NoteUpdate`** — conditional `image_url = $N` only when provided |
| Optimization errors | let sharp throw vs wrap | raw sharp stack leaks; handler needs Spanish UX | **Wrap in `saveImageUpload`** → `UploadValidationError("La imagen no se pudo procesar")` |
| Old-file unlink | after vs before DB write | before = note points at missing file on failure | **After `updateNote` returns non-null**, `try/catch` + `console.error` (non-fatal) |
| sharp import | `await import("sharp")` vs top-level | top-level loads libvips at module import | **Dynamic import** — keeps sharp off any non-server graph |

## Data Flow

```
Create:  File ─ size cap(5MB input) ─ arrayBuffer ─ sniff(JPG/PNG) ─ optimizeImage ─ writeFile ─ createNote(imageUrl required)
Edit:    no new File ──► retain note.data.image ──► updateNote({...})                    (no imageUrl)
         new File ──► [same pipeline as create] ──► updateNote({... imageUrl:new}) ──► unlink(old abs path)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/lib/image-optimize.ts` | Create | `optimizeImage` + constants (`MAX_IMAGE_EDGE_PX=2400`, `MAX_IMAGE_AXIS_PX=8000`, `JPEG_QUALITY=82`) |
| `src/lib/uploads.ts` | Modify | call `optimizeImage` after sniff; add `absolutePathFromPublicUrl()`; wrap errors |
| `src/lib/uploads-mime.ts` | Modify | drop WebP from `AcceptedImageMime` + RIFF/WEBP probe |
| `src/lib/uploads-mime.test.ts` | Modify | drop WebP-accept + RIFF-not-WebP tests; add WebP-rejected |
| `src/lib/uploads.test.ts` | Modify | mock `optimizeImage`; add size-before-opt, sniff-first, failure-map tests |
| `src/lib/image-optimize.test.ts` | Create | real sharp: format-preserve, EXIF strip, max-edge, OOM bail |
| `src/lib/notes-repo.ts` | Modify | `NoteUpdate.imageUrl?: string`; conditional SET clause |
| `src/lib/notes-repo.test.ts` | Modify | reverse L184-186 guard; add persist-when-provided + retain-when-omitted |
| `src/components/server-islands/WriterForm.astro` | Modify | `enctype` in both modes; always render file input; `accept` JPG/PNG; label "JPG/PNG, máx. 5MB"; preview in update; `required` in create |
| `src/pages/escritor/nueva.astro` | Modify | require image (`"La imagen es obligatoria"`), no note if absent |
| `src/pages/escritor/editar/[slug].astro` | Modify | parse optional image; save+persist; unlink old; imageless-legacy guard |

Note: the JPG/PNG label lives in `WriterForm.astro`, not `nueva.astro` (proposal listed it under nueva; corrected here).

## Interfaces / Contracts

```ts
// image-optimize.ts
export async function optimizeImage(bytes: Uint8Array, mime: AcceptedImageMime):
  Promise<{ bytes: Uint8Array; mime: AcceptedImageMime }>
// pipeline: const sharp = (await import("sharp")).default;
//   const m = await sharp(bytes).metadata();
//   if ((m.width && m.width > 8000) || (m.height && m.height > 8000)) throw Error("oversize");
//   bytes = await sharp(bytes).rotate()
//     .resize({ width:2400, height:2400, fit:"inside", withoutEnlargement:true })
//     [mime==="image/jpeg" ? .jpeg({ quality:82, mozjpeg:true }) : .png({ compressionLevel:9, palette:true })]
//     .toBuffer()
```

```ts
// notes-repo.ts
export interface NoteUpdate { title: string; subtitle: string; body: string;
  tag?: string; imageUrl?: string }
// SET builds title=$2 subtitle=$3 body=$4 tag=$5; appends `image_url = $6` when imageUrl !== undefined
```

```ts
// uploads.ts
export function absolutePathFromPublicUrl(publicUrl: string,
  config: Pick<UploadConfig, "uploadsDir" | "publicUploadsUrl">): string | null
// strips publicUploadsUrl prefix → relativePath (reject `..`) → path.join(uploadsDir, ...)
```

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit (optimize) | format-preserve, EXIF strip, 4000×3000→≤2400, axis>8000 bail | `image-optimize.test.ts` with real sharp on generated fixtures |
| Unit (uploads) | 5MB cap on input pre-opt; sniff before opt; non-image rejected pre-opt; sharp failure→Spanish | `uploads.test.ts` with `vi.mock("./image-optimize")`; `absolutePathFromPublicUrl` cases |
| Unit (repo) | `image_url` in SET when `imageUrl` given; absent when omitted; `$6` param order | `notes-repo.test.ts` |
| Build | `astro build` succeeds | verify.build_command |

Run with Node 22 override: `export PATH="$HOME/.nvm/versions/node/v22.22.3/bin:$PATH"` then `pnpm test` / `pnpm build` (system default is v18.20.8; engines require ≥22.12).

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration. Rollback = `git revert`. Deploy: sharp@0.35.4 libvips already resolved via `pnpm install` (archive 2026-09-10-astro-image-refactor); no new dep or env var — optimization params are plain constants.

## Open Questions

- None blocking.
