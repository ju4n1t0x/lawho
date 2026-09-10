# Delta for Donar

## MODIFIED Requirements

### Requirement: Background Photo and Overlay

The system MUST render `hero-manos.jpg` via Astro `<Image>` from `astro:assets` with explicit `width` (1600) and `height` (1000), keeping `class="absolute inset-0 size-full object-cover"` and `loading="lazy"`. The rendered element SHALL be the `<img>` emitted by `<Image>`, not a raw `<img src={heroManos.src}>`. A dark gradient overlay (`from-foreground/92 via-foreground/80 to-foreground/40`) MUST sit above the image.

(Previously: rendered via raw `<img src={heroManos.src}>`; asset name already correct)

#### Scenario: Photo and overlay render via `<Image>`

- GIVEN the donar section renders
- WHEN inspecting the section
- THEN the background MUST be `hero-manos.jpg` via `<Image src={heroManos}>` (not `<img src={heroManos.src}>`)
- AND `width` MUST be 1600, `height` MUST be 1000
- AND `class` MUST include `absolute`, `inset-0`, `size-full`, and `object-cover`
- AND a dark gradient overlay MUST be present above the image

#### Scenario: No raw `<img src={asset.src}>` in Donar

- GIVEN the build completes (`pnpm build`)
- WHEN inspecting component source
- THEN Donar.astro MUST NOT contain `<img src={heroManos.src}>` or equivalent raw pattern

## ADDED Requirements

### Requirement: Static Image Rendering via Astro Image

The system MUST render all static `src/assets/**` images in Donar.astro through `<Image>` from `astro:assets`. Each `<Image>` MUST receive explicit `width` and `height` props matching the source asset dimensions. The `class` prop MUST be forwarded to the emitted `<img>` element.

#### Scenario: Build emits optimized assets

- GIVEN the project builds successfully (`pnpm build`)
- WHEN inspecting `dist/_astro/` output
- THEN `hero-manos.jpg` MUST appear as an optimized asset (not the raw source file)

#### Scenario: Gradient overlay z-order preserved

- GIVEN the donar section renders
- WHEN inspecting the DOM
- THEN the gradient overlay `div` MUST appear AFTER (and thus visually above) the `<Image>` element in the DOM tree

#### Scenario: Sharp declared as direct dependency

- GIVEN the project builds successfully (`pnpm build`)
- WHEN inspecting `package.json`
- THEN `sharp` (^0.35.4) MUST be declared as a direct dependency
- AND the build MUST pass with sharp resolvable at project level (pnpm strict node_modules does not expose astro's optional dependency to the emitted prerender bundle)
