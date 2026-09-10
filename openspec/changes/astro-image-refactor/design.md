# Design: Migrate static images to Astro `<Image>` (`astro:assets`)

## Technical Approach

Replace the 7 static `<img src={asset.src}>` tags across `Hero`, `Historia`, `Infancias`, `Donar` with `<Image>` from `astro:assets`, passing the imported asset object directly (`src={asset}`), keeping explicit `width`/`height`, forwarding `class`, and preserving `loading`. `src/assets/**` imports are already correct — no code-side filename change is needed. Default sharp pipeline (entrypoint `astro/assets/services/sharp`) emits optimized assets to `dist/_astro/`; no `astro.config.mjs` change and no new dependency.

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `<Image src={asset}>` | Requires width/height (already present) | **Chosen** — gains srcset/decoding/optimization; proposal goal |
| `<img src={asset.src}>` (keep) | No CLS guard, no optimization | Rejected |
| Add `astro.config.mjs` `image` block | New config surface | Rejected — default sharp service is sufficient |
| Hero `loading` default | Astro `<Image>` defaults to `lazy`, which would regress above-the-fold LCP | **Explicit `loading="eager"`** on Hero only |

Rationale for the last row: Hero is the LCP image. Current `<img>` has no `loading` (browser default = eager). Astro `<Image>` defaults `loading="lazy"`; omitting it would silently switch Hero to lazy and regress LCP. Below-the-fold images keep `loading="lazy"` as-is.

## Data Flow

```
src/assets/*.avif|.jpg (imported asset) ──> <Image src={asset}> ──> sharp service
                                                              (astro/assets/services/sharp)
                                                                      │
                                                                      ▼
                                              dist/_astro/<hash>.avif|.webp  ──> emitted <img>
                                              (width/height/class/loading forwarded)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/components/Hero.astro` | Modify | Add `import { Image } from "astro:assets"`; L78 `<img src={heroNinos.src}>` → `<Image>` |
| `src/components/Historia.astro` | Modify | Add `Image` import; L72 `<img src={territorio.src}>` → `<Image>` |
| `src/components/Infancias.astro` | Modify | Add `Image` import; L40 `abuela` + L75 `item.img` → `<Image>` |
| `src/components/Donar.astro` | Modify | Add `Image` import; L16 `<img src={heroManos.src}>` → `<Image>` |
| `openspec/changes/astro-image-refactor/design.md` | Create | This document |

No deletions. No `package.json`, `astro.config.mjs`, or `docs/constitution.md` changes.

## Per-Component `<Image>` Mapping (7 usages)

```astro
// Hero.astro L78 — heroNinos = ninos-esperanza.avif (1408x1008)
<Image src={heroNinos} alt="Niñas y niños de una comunidad originaria…"
  loading="eager" width={1408} height={1008}
  class="aspect-5/4 w-full animate-slow-zoom object-cover" />

// Historia.astro L72 — territorio = como-trabajamos.avif (1600x912)
<Image src={territorio} alt="Camioneta de un equipo sanitario…"
  loading="lazy" width={1600} height={912}
  class="h-full min-h-[18rem] w-full object-cover" />

// Infancias.astro L40 — abuela = que-hacemos.avif (1200x1504)
<Image src={abuela} alt="Abuela de una comunidad originaria…"
  loading="lazy" width={1200} height={1504}
  class="aspect-4/5 w-full object-cover" />

// Infancias.astro L75 — item.img = que-hacemos-1/2/3.avif (600x600)
<Image src={item.img} alt={item.alt} loading="lazy" width={600} height={600}
  class="aspect-square w-full object-cover" />

// Donar.astro L16 — heroManos = hero-manos.jpg (1600x1000)
<Image src={heroManos} alt="Médica voluntaria tomando la mano…"
  loading="lazy" width={1600} height={1000}
  class="absolute inset-0 size-full object-cover" />
```

## Interfaces / Contracts

`<Image>` (from `astro:assets`) accepts: `src` (ImageMetadata), `alt`, `width`, `height`, `loading`, `decoding`, `class` (forwarded to emitted `<img>`). `src` MUST be the imported asset object, never `asset.src`. Emitted element is a plain `<img>`; Tailwind `object-cover`/`aspect-*`/`absolute inset-0` classes apply unchanged.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Build | `pnpm build` passes; optimized assets in `dist/_astro/` | `astro build` (verify.build_command) |
| Static | No `<img src={X.src}>` remains in the 4 components | `grep -rn "src={.*\.src}" src/components/{Hero,Historia,Infancias,Donar}.astro` |
| Unit | Baseline suite stays green (no component tests exist) | `pnpm test` → `vitest run` |
| Visual | Donar gradient overlay `<div>` renders AFTER `<Image>` in DOM | Inspect DOM order (spec already requires this) |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No data migration. Rollback = `git revert` the single atomic commit (components + spec deltas revert together). Deploy note: no Dockerfile yet; sharp's libvips resolves via `pnpm install` on the platform. If sharp is unavailable, Astro falls back to the `noop` image service (passthrough with a warning) — build still succeeds.

## Open Questions

- None blocking. Confirm at apply: whether Hero keeps `loading="eager"` (recommended) vs accepting Astro's lazy default.
