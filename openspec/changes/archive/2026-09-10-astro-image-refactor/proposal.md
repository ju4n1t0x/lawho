# Proposal: Migrate static images to Astro `<Image>` (`astro:assets`)

## Intent

Replace every statically loaded `src/assets/**` image (currently plain `<img>` + `import … from "../assets/…"`) with Astro's `<Image>` from `astro:assets`, gaining width/height (no CLS), srcset, lazy loading, and async decoding via the default sharp pipeline.

## Scope

### In Scope
- 7 static `<img>` tags in `src/components/{Hero,Historia,Infancias,Donar}.astro`.
- `import { Image } from "astro:assets"`; `<img src={asset.src}>` → `<Image src={asset}>`, keeping width/height, `loading="lazy"`, `class`.
- MODIFIED spec deltas for `hero`, `historia`, `infancias`, `donar`.
- Spec-drift correction (asset names — see Affected Areas).

### Out of Scope
- **No new dependency**: `sharp@0.35.4` is Astro's own `optionalDependency` (installed); `<Image>` ships inside `astro`. No `package.json`, `pnpm add`, or constitution amendment.
- Runtime/remote note images (NoteCard, NoteTemplate, WriterNoteCard, WriterForm preview) — stay `<img>` (Nginx URLs).
- Favicons in `public/` — stay `<img>`/`<link>` (astro:assets can't process public URLs).
- `image` config in `astro.config.mjs`; remote image service — deferred.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `hero`: photo → `<Image>` + `.avif`.
- `historia`: territory photo → `<Image>` + `como-trabajamos.avif`.
- `infancias`: abuela + thumbnails → `<Image>` + `.avif`.
- `donar`: background → `<Image>`.

## Approach

Approach 1 (exploration-recommended): per-component `<Image>`, default sharp formats, keep width/height, forward `class`. No `astro.config.mjs` change.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/components/Hero.astro` | Modified | L78 → `<Image>`; `ninos-esperanza.avif` |
| `src/components/Historia.astro` | Modified | L72 → `<Image>`; `como-trabajamos.avif` |
| `src/components/Infancias.astro` | Modified | L40+L75 → `<Image>`; `que-hacemos*.avif` |
| `src/components/Donar.astro` | Modified | L16 → `<Image>`; `hero-manos.jpg` |
| `openspec/specs/hero/spec.md` | Modified | `ninos-esperanza.jpg`→`.avif`; add `<Image>` req |
| `openspec/specs/historia/spec.md` | Modified | `territorio.jpg`→`como-trabajamos.avif`; `<Image>` |
| `openspec/specs/infancias/spec.md` | Modified | `comunidad-abuela/ninos-1/ninos-2/mision-1.jpg`→`que-hacemos*.avif` |
| `openspec/specs/donar/spec.md` | Modified | add `<Image>` req (name already correct) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Spec drift (asset names) | High | Spec phase corrects before apply |
| sharp unavailable on deploy | Med | `noop` fallback; verify libvips in Docker at apply |
| Donar overlay z-order | Low | `<Image>` forwards class; verify gradient above |
| jpeg re-encode shift (`hero-manos.jpg`) | Low | Tune `format`/`quality` if needed |

## Rollback Plan

`git revert` the single atomic commit; components and spec deltas revert together. No config/dependency changes to unwind.

## Dependencies

None. Apply-time check: deploy platform resolves sharp libvips via `pnpm install`.

## Success Criteria

- [ ] 7 static images render via `<Image>`; `pnpm build` passes.
- [ ] No `package.json` diff; no `astro.config.mjs` override.
- [ ] `pnpm test` passes; favicons + note images stay `<img>`.
- [ ] Spec drift corrected in four spec files.
