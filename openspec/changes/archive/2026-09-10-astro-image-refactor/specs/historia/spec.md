# Delta for Historia

## MODIFIED Requirements

### Requirement: Territory Photo

The system MUST render `como-trabajamos.avif` via Astro `<Image>` from `astro:assets` with explicit `width` (1600) and `height` (912), keeping `class="h-full min-h-[18rem] w-full object-cover"` and `loading="lazy"`. The rendered element SHALL be the `<img>` emitted by `<Image>`, not a raw `<img src={territorio.src}>`.

(Previously: spec referenced `territorio.jpg` and rendered via raw `<img src={territorio.src}>`)

#### Scenario: Photo renders via `<Image>`

- GIVEN the historia section renders
- WHEN inspecting the image
- THEN the image MUST use `como-trabajamos.avif` via `<Image src={territorio}>` (not `<img src={territorio.src}>`)
- AND `width` MUST be 1600, `height` MUST be 912
- AND `class` MUST include `object-cover` and `min-h-[18rem]`

#### Scenario: No raw `<img src={asset.src}>` in Historia

- GIVEN the build completes (`pnpm build`)
- WHEN inspecting component source
- THEN Historia.astro MUST NOT contain `<img src={territorio.src}>` or equivalent raw pattern

## ADDED Requirements

### Requirement: Static Image Rendering via Astro Image

The system MUST render all static `src/assets/**` images in Historia.astro through `<Image>` from `astro:assets`. Each `<Image>` MUST receive explicit `width` and `height` props matching the source asset dimensions. The `class` prop MUST be forwarded to the emitted `<img>` element.

#### Scenario: Build emits optimized assets

- GIVEN the project builds successfully (`pnpm build`)
- WHEN inspecting `dist/_astro/` output
- THEN `como-trabajamos.avif` MUST appear as an optimized asset (not the raw source file)

#### Scenario: Sharp declared as direct dependency

- GIVEN the project builds successfully (`pnpm build`)
- WHEN inspecting `package.json`
- THEN `sharp` (^0.35.4) MUST be declared as a direct dependency
- AND the build MUST pass with sharp resolvable at project level (pnpm strict node_modules does not expose astro's optional dependency to the emitted prerender bundle)
