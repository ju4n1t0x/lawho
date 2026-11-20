# Infancias Specification

## Purpose

Section with abuela photo, section header about infancias, descriptive paragraph, and 3 datos cards (Desnutrición, Parasitosis, Salud bucal).

## Requirements

### Requirement: Section Header and Paragraph

The system MUST render eyebrow "Infancias", H2: "Atendemos a las infancias wichí, chorote, chulupí, toba y criollas del Chaco Salteño.", and the paragraph: "Trabajamos para frenar la desnutrición infantil, el deterioro de la salud bucal y las parasitosis provocadas por la falta de agua potable, con promoción y prevención de la salud médica, odontológica y nutricional."

#### Scenario: Text matches verbatim

- GIVEN the infancias section renders
- WHEN inspecting header and paragraph
- THEN all text MUST match the reference verbatim

### Requirement: Abuela Photo

The system MUST render `que-hacemos.avif` via Astro `<Image>` from `astro:assets` with explicit `width` (1200) and `height` (1504), keeping `class="aspect-4/5 w-full object-cover"` and `loading="lazy"`. The rendered element SHALL be the `<img>` emitted by `<Image>`, not a raw `<img src={abuela.src}>`.

#### Scenario: Photo renders via `<Image>`

- GIVEN the infancias section renders
- WHEN inspecting the image
- THEN the image MUST use `que-hacemos.avif` via `<Image src={abuela}>` (not `<img src={abuela.src}>`)
- AND `width` MUST be 1200, `height` MUST be 1504
- AND `class` MUST include `aspect-4/5` and `object-cover`

#### Scenario: No raw `<img src={asset.src}>` in Infancias portrait

- GIVEN the build completes (`pnpm build`)
- WHEN inspecting component source
- THEN Infancias.astro MUST NOT contain `<img src={abuela.src}>` or equivalent raw pattern

### Requirement: Three Datos Cards

The system MUST render 3 cards with verbatim content. Each card image MUST render via `<Image>` from `astro:assets` with explicit `width` (600) and `height` (600), keeping `class="aspect-square w-full object-cover"` and `loading="lazy"`:
- Card 1: image `que-hacemos-1.avif`, alt "Pediatra voluntaria auscultando a un niño en un consultorio comunitario", dato "Desnutrición", text "infantil y del adulto mayor: uno de los focos centrales de cada operativo."
- Card 2: image `que-hacemos-2.avif`, alt "Manos de una niña sosteniendo un frasco de vitaminas", dato "Parasitosis", text "agravada por la falta de agua potable y las condiciones habitacionales."
- Card 3: image `que-hacemos-3.avif`, alt "Niño sonriendo durante una jornada sanitaria de LAWHO", dato "Salud bucal", text "prevención y educación en niños desde el consultorio odontológico de La Merced."

#### Scenario: All 3 cards render correctly via `<Image>`

- GIVEN the infancias section renders
- WHEN inspecting the cards
- THEN each card MUST display its image via `<Image>` (not `<img src={item.img.src}>`), dato title, and text verbatim as listed above
- AND each `<Image>` MUST have `width={600}` and `height={600}`

### Requirement: Static Image Rendering via Astro Image

The system MUST render all static `src/assets/**` images in Infancias.astro through `<Image>` from `astro:assets`. Each `<Image>` MUST receive explicit `width` and `height` props matching the source asset dimensions. The `class` prop MUST be forwarded to the emitted `<img>` element.

#### Scenario: Build emits optimized assets

- GIVEN the project builds successfully (`pnpm build`)
- WHEN inspecting `dist/_astro/` output
- THEN `que-hacemos.avif`, `que-hacemos-1.avif`, `que-hacemos-2.avif`, and `que-hacemos-3.avif` MUST appear as optimized assets

#### Scenario: Sharp declared as direct dependency

- GIVEN the project builds successfully (`pnpm build`)
- WHEN inspecting `package.json`
- THEN `sharp` (^0.35.4) MUST be declared as a direct dependency
- AND the build MUST pass with sharp resolvable at project level (pnpm strict node_modules does not expose astro's optional dependency to the emitted prerender bundle)
