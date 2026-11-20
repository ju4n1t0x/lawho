# Exploration: Migrate static images to Astro `<Image>` (`astro:assets`)

## Topic

Should every statically loaded image in `src/` render through Astro's `<Image>` (or `<Picture>`) component from `astro:assets`, and is a new npm dependency required to do so?

## Current State

### Static image inventory

| Asset | Path | Format | Size | Loaded by | Rendered as |
|---|---|---|---|---|---|
| `ninos-esperanza` | `src/assets/ninos-esperanza.avif` | avif | 996 KB | `Hero.astro` | `<img>` (full hero, `aspect-5/4`, slow-zoom) |
| `como-trabajamos` | `src/assets/como-trabajamos.avif` | avif | 382 KB | `Historia.astro` | `<img>` (16:9 photo + quote row, `object-cover`) |
| `que-hacemos` | `src/assets/que-hacemos.avif` | avif | 154 KB | `Infancias.astro` | `<img>` (portrait `aspect-4/5`) |
| `que-hacemos-1` | `src/assets/que-hacemos-1.avif` | avif | 316 KB | `Infancias.astro` | `<img>` (square thumbnail) |
| `que-hacemos-2` | `src/assets/que-hacemos-2.avif` | avif | 180 KB | `Infancias.astro` | `<img>` (square thumbnail) |
| `que-hacemos-3` | `src/assets/que-hacemos-3.avif` | avif | 129 KB | `Infancias.astro` | `<img>` (square thumbnail) |
| `hero-manos` | `src/assets/hero-manos.jpg` | jpeg | 61 KB | `Donar.astro` | `<img>` (full-bleed background photo, absolute inset-0) |
| `favicon.svg` | `public/favicon.svg` | svg | 8 KB | `BaseLayout.astro` (link rel), `NavBar.astro`, `Footer.astro` | `<img>` + `<link rel="icon">` |
| `favicon.ico` | `public/favicon.ico` | ico | 31 KB | `BaseLayout.astro` (link rel) | `<link rel="icon">` |

No CSS `background-image: url()` or `<picture>` / `<source>` tags anywhere. Only two `@font-face url()` references in `src/styles/global.css` (`../assets/fonts/raleway-latin.woff2`, `montserrat-latin.woff2`) — those are fonts, not images, and out of scope.

### Static `<img>` components (every site rendering of an `src/assets` image)

All seven `src/assets/**` images are imported with `import … from "../assets/…"` and then rendered through a plain `<img>` tag that uses `asset.src`:

1. `src/components/Hero.astro:78` — `src={heroNinos.src}` (no `loading`, width/height set)
2. `src/components/Historia.astro:72` — `src={territorio.src}` (loading="lazy")
3. `src/components/Infancias.astro:40` — `src={abuela.src}` (portrait hero, loading="lazy")
4. `src/components/Infancias.astro:75` — `src={item.img.src}` (square thumbnails, loading="lazy")
5. `src/components/Donar.astro:16` — `src={heroManos.src}` (full-bleed background, loading="lazy")

Favicon SVG is rendered as `<img src="/favicon.svg">` in:
- `src/components/NavBar.astro:9`
- `src/components/Footer.astro:11`

Plus `<link rel="icon">` references in `src/layouts/BaseLayout.astro:11-12`.

### Dynamic `<img>` usages (NOT candidates for `<Image>`)

These render a runtime URL string (`/uploads/notes/.../...jpg`), so they cannot be migrated to `<Image>` from `astro:assets` without losing the optimization layer (Image requires a build-time `ImageMetadata` import or a `remotePatterns`-allowed URL):

- `src/components/NoteCard.astro:23,49` — `<img src={image}>` (URL from `LiveNoteEntry.data.image`, served by Nginx out of `/uploads/...`)
- `src/components/NoteTemplate.astro:17` — same pattern, used as the article hero
- `src/components/WriterNoteCard.astro:16` — `<img src={image}>` from `NoteRecord.data.image`
- `src/components/server-islands/WriterForm.astro:135` — preview of the existing image in update mode

These come from `PUBLIC_UPLOADS_URL` (env var), written to `uploads/notes/<slug>/<file>` and served directly by Nginx. Constitution rule 5 plus `openspec/specs/image-upload/spec.md` treat them as filesystem assets; no build-time import is available, so `<Image>` cannot optimize them. They MUST stay as `<img>` unless we also adopt a remote service (e.g. Cloudinary/imgix) — out of scope.

### Astro 7.2.10 image pipeline — what's already installed

Evidence gathered from `node_modules/astro/` and `node_modules/.pnpm/`:

- `node_modules/astro/package.json` exports the `astro:assets` virtual module (`.` → `dist/index.js`, `./components` → `components/index.ts`, `./assets` → `dist/assets/index.js`, etc.).
- `node_modules/astro/components/Image.astro:2` imports `getImage` directly from `astro:assets` — the `<Image>` component is **shipped inside the `astro` package**, not from a separate npm package.
- `node_modules/astro/client.d.ts:56-57` re-exports `Image` and `Picture` from `astro:assets` for consumer types.
- `node_modules/astro/package.json` declares `"optionalDependencies": { "sharp": "^0.35.4" }`. Sharp is therefore bundled by Astro as part of the framework — NOT a user-side choice.
- `node_modules/astro/dist/core/config/schemas/defaults.js:22` sets `service: { entrypoint: "astro/assets/services/sharp", config: {} }` — sharp is the default image service and the service module is shipped by Astro itself (`astro/assets/services/sharp`).
- `node_modules/.pnpm/` already contains `sharp@0.35.4`, `@img+sharp-linux-x64@0.35.4`, and `@img+sharp-libvips-linux-x64@1.3.3` — sharp is installed and working on this machine.
- `astro.config.mjs` does NOT override the image service, so Astro's default sharp pipeline applies.

**Conclusion: NO new dependency is required.** `<Image>` / `<Picture>` from `astro:assets` work out of the box on this project as installed.

### Constitution / spec impact of "adding a dependency"

`docs/constitution.md` rule 1 is strict:

> "Astro 7.2 y solo biblioteca estándar; ninguna librería ni framework adicional, salvo para tests y las siguientes excepciones: TailwindCSS v4, `@astrojs/node`, `pg`, `argon2`, `@astrojs/markdown-satteri`."

`AGENTS.md` reinforces: "No añadas dependencias ni cambies el formato del JSON sin actualizar antes la spec."

If we ever needed to override the image service with a third-party package (e.g. Cloudinary), we'd need:
1. A new constitution-amendment spec (mirroring `openspec/specs/constitution-amendment/spec.md`) listing it as a permitted dep with rationale.
2. An atomic commit that updates `docs/constitution.md` BEFORE the `package.json` change (per the existing `constitution-amendment` scenarios).
3. A `MODIFIED` delta on the existing constitution spec.

For the current proposal this is **not needed**, because:
- We do not need to add `sharp` — it is already an Astro optional dependency.
- We do not need to swap the image service — the default sharp service works.

## Affected Areas

- `src/components/Hero.astro` — replace `<img>` at L78 with `<Image>`; requires `import { Image } from "astro:assets"`.
- `src/components/Historia.astro` — replace `<img>` at L72; add the import.
- `src/components/Infancias.astro` — replace `<img>` at L40 and L75; add the import.
- `src/components/Donar.astro` — replace `<img>` at L16; add the import.
- `src/components/NavBar.astro` — favicon `<img>` at L9 (string URL `/favicon.svg`). **Caveat**: `astro:assets` cannot process public-folder URLs; favicons in `public/` stay as plain `<img>` or `<link rel="icon">`.
- `src/components/Footer.astro` — same as NavBar (L11).
- `src/layouts/BaseLayout.astro` — `<link rel="icon">` references at L11-12 stay as-is (these are HTML `<link>` tags, not `<img>`).
- Specs that need a delta (REQUIREMENT changes):
  - `openspec/specs/hero/spec.md` — Requirement "Hero Photo with Floating Badges" mentions `ninos-esperanza.jpg` (file is now `.avif` on disk; the spec should align with the real asset and may add the `<Image>` constraint).
  - `openspec/specs/infancias/spec.md`, `openspec/specs/donar/spec.md`, `openspec/specs/historia/spec.md` — likely need a `MODIFIED` requirement stating the image is served via `<Image>` with width/height/`formats` and not a raw `<img>` tag.

## Approaches

### Approach 1 — `Image` per component, default formats, drop `width`/`height` overrides (RECOMMENDED)

- Use `import { Image } from "astro:assets";` in each touched component and replace the seven `<img>` tags (Hero, Historia, Infancias x2, Donar) with `<Image src={asset} alt={...} …>`.
- Pass the existing explicit `width` / `height` props (Hero 1408×1008, Historia 1600×912, Infancias 1200×1504 + 600×600, Donar 1600×1000) so Astro can generate a single high-DPI variant and srcset.
- Keep `class="object-cover aspect-…"` semantics — `<Image>` accepts `class` and forwards the rest of `LocalImageProps`.
- Pros:
  - Zero new dependencies.
  - Zero `astro.config.mjs` changes required.
  - Each component becomes self-optimizing: width/height baked in, lazy loading added by default for below-the-fold images, `loading="lazy"` stays, `decoding="async"` added by default, srcset generated when `widths`/`densities` passed.
  - Image formats become configurable from one place if we later add `image: { … }` to `astro.config.mjs` (no code changes needed in components).
- Cons:
  - The jpeg `hero-manos.jpg` (Donar) will be re-encoded by sharp — possibly a different visual look if sharp's defaults differ from the original. Easily tuned with `format`/`quality` props or an image-config block.
  - `src` URLs change from a static `ninos-esperanza.<hash>.avif` to an Astro-emitted `/_astro/<hash>.<ext>` — Nginx no longer needs to know about these because Astro bundles them through Vite's asset pipeline.
- Effort: **Low** — five component edits, ~5-10 lines each, plus spec deltas.

### Approach 2 — `<Image>` + project-wide `image` config in `astro.config.mjs`

- Same as Approach 1, plus add an `image` block to `astro.config.mjs` setting `service.config` (sharp options), default `formats`, `domains` for remote, etc.
- Pros:
  - One place to tune compression / quality / breakpoints for the whole site.
  - Lets us pick `['avif', 'webp']` as default output formats even for jpeg inputs.
- Cons:
  - Touches `astro.config.mjs` (allowed but an additional decision surface).
  - More to verify — changes in build output for every image.
- Effort: **Low–Medium**.

### Approach 3 — `<Picture>` instead of `<Image>` for art direction / multiple sources

- Use `<Picture>` from `astro:assets` to emit a `<picture>` with `<source>` for `<Picture formats={['avif','webp']} fallbackFormat="jpg">`.
- Pros:
  - Modern formats served first, jpeg fallback for legacy clients.
- Cons:
  - Heavier markup; project has no evidence that legacy browser support matters (target audience: Argentine mobile + desktop, modern).
  - More verbose for components that already render well with `<Image>` alone.
- Effort: **Medium**.

## Recommendation

**Approach 1.** It is the smallest correct change, requires zero new dependencies, and immediately gives every static image: explicit width/height (avoids CLS), lazy loading when below the fold, async decoding, and a srcset generated from the `width` prop. The dynamic notes images (NoteCard, NoteTemplate, WriterNoteCard, WriterForm preview) stay as plain `<img>` because they are runtime URLs served by Nginx and the project has no remote image service configured — that is consistent with `openspec/specs/image-upload/spec.md`.

The user's belief that a new dependency is required is incorrect on Astro 7.2.10: `sharp` is an `optionalDependency` of Astro itself, and the `<Image>` / `<Picture>` components ship inside the `astro` package. No `package.json` change, no `pnpm add`, no constitution amendment.

## Risks

- **Spec drift** — `openspec/specs/hero/spec.md` line 61 says `ninos-esperanza.jpg`; the actual file is `ninos-esperanza.avif`. Apply phase MUST update the spec first per AGENTS.md ("spec antes que código"). Same audit for historia/infancias/donar specs.
- **Sharp fallback** — if for some reason sharp cannot run on the deployment platform, Astro falls back to `noop` (raw passthrough, no optimization). Worth confirming in the Docker image used in `deploy/` that sharp's libvips binary is available. (`@img/sharp-libvips-linux-x64` is already installed in `node_modules`, so this is not a dev-time concern; the deploy stage needs the same platform string.)
- **CLS / object-fit interplay** — `<Image>` requires `width` and `height` (or `layout: 'constrained' | 'fixed' | 'full-width'`). Existing components already pass explicit width/height, so no CLS risk. The `class="aspect-…"` Tailwind utilities remain valid; `<Image>` forwards `class` to the emitted `<img>`.
- **Donar full-bleed background** — currently uses `<img class="absolute inset-0 size-full object-cover">` with a gradient overlay. After migration to `<Image>`, the same positioning/classes still work, but the absolute-positioned element is the `<img>` Astro emits; verify the gradient overlay still sits above it.
- **Favicon in NavBar/Footer** — these use `src="/favicon.svg"` (public URL, not an `src/assets` import). `<Image>` from `astro:assets` CANNOT process public-folder URLs, so the favicon `<img>` tags must stay plain. This is a known constraint, not a blocker.
- **Dynamic notes images** — `<Image>` from `astro:assets` requires a build-time `ImageMetadata` import or a remote URL allowed via `image.domains`/`image.remotePatterns`. None of the four note-image components can be migrated without either (a) adding Cloudinary/imgix, or (b) setting up `remotePatterns` for `PUBLIC_UPLOADS_URL`. Out of scope for "statically loaded images"; flag for the user.
- **No tests** — `openspec/config.yaml` declares `tdd: false` for `apply` and there are no e2e tests; verify will rely on `pnpm test` (vitest) + `pnpm build` succeeding, and manual visual check.

## Ready for Proposal

Yes. The orchestrator should tell the user:

> The premise that a new dependency is required is **incorrect** on Astro 7.2.10. The `<Image>` / `<Picture>` components ship with `astro` itself, and the default `sharp` image service is already installed (as an `optionalDependency` of Astro). The only thing this change touches is `src/components/{Hero,Historia,Infancias,Donar}.astro` (7 `<img>` tags), the related spec files, and the favicon decision (which stays plain `<img>`). No `package.json` change. No `astro.config.mjs` change required (optional tuning block can be added later). No constitution amendment.

If the user agrees, propose directly without a dependency-amendment step. If they insist on a remote image service, that requires a constitution amendment and is a separate change.

## Follow-up questions (orchestrator should batch with the user)

1. Keep `<Image>` only, or also add a project-wide `image` config block in `astro.config.mjs` (formats, quality, breakpoints)?
2. Confirm deploy platform (Docker base image) includes sharp's libvips binaries — current `deploy/` should be checked during apply.
3. Decide favicon strategy — leave as plain `<img src="/favicon.svg">` (current), or swap to `<Image import={favicon}>` after moving favicon into `src/assets/`.
4. Out-of-scope for now but worth flagging: dynamic notes images (NoteCard, NoteTemplate, WriterNoteCard, WriterForm preview) cannot use `<Image>` without a remote image service. Defer.
