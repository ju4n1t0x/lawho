# Hero Specification

## Purpose

Hero section with heartbeat badge, H1 with SVG underline, introductory paragraph, two CTAs, hero photo with slow-zoom, and two floating badges (CountUp + ad honorem).

## Requirements

### Requirement: Badge with Heartbeat

The system MUST render a pill badge with an animated heartbeat dot and text "Chaco Salteño · Salta, Argentina".

#### Scenario: Badge renders verbatim

- GIVEN the hero section renders
- WHEN inspecting the badge
- THEN it MUST contain "Chaco Salteño" and "Salta, Argentina" with a heartbeat-animated dot

### Requirement: H1 with SVG Underline

The H1 MUST contain the text "En wichí, lawho significa flor : florecer pese a todo." with "flor" highlighted in accent color and an SVG hand-drawn underline beneath it.

#### Scenario: H1 text matches verbatim

- GIVEN the hero renders
- WHEN inspecting the H1
- THEN it MUST contain the exact text "En wichí, lawho significa flor : florecer pese a todo."
- AND "flor" MUST be styled with accent color
- AND an SVG `<path>` underline MUST be present below "flor"

### Requirement: Introductory Paragraph

The paragraph MUST contain the verbatim text: "Somos una asociación civil de médicos, voluntarios y colaboradores que realizamos operativos de salud ad honorem en comunidades de pueblos originarios del norte argentino, sin fines políticos ni religiosos y con profundo respeto por su cultura, creencias y costumbres."

#### Scenario: Paragraph text matches

- GIVEN the hero renders
- WHEN inspecting the paragraph
- THEN the text MUST match the verbatim content above

### Requirement: Two CTAs

The system MUST render two buttons: "Doná y hacé posible el próximo viaje" (accent, links to `#donar`) and "Nuestra historia" (outlined, links to `#historia`).

#### Scenario: CTAs link correctly

- GIVEN the hero renders
- WHEN "Doná y hacé posible el próximo viaje" is clicked
- THEN navigation MUST target `#donar`
- WHEN "Nuestra historia" is clicked
- THEN navigation MUST target `#historia`

### Requirement: Hero Photo with Floating Badges

The system MUST render the hero image (`ninos-esperanza.avif`) via Astro `<Image>` from `astro:assets` with explicit `width` (1408) and `height` (1008), keeping `class="aspect-5/4 w-full animate-slow-zoom object-cover"`. The rendered element SHALL be the `<img>` emitted by `<Image>`, not a raw `<img src={asset.src}>`. A green floating badge showing CountUp "+2000" / "consultas por operativo" and a yellow badge "Atención 100% ad honorem" MUST accompany the photo.

#### Scenario: Photo and badges render via `<Image>`

- GIVEN the hero renders
- WHEN inspecting the photo area
- THEN the image MUST use `ninos-esperanza.avif` via `<Image src={heroNinos}>` (not `<img src={heroNinos.src}>`)
- AND `width` MUST be 1408, `height` MUST be 1008
- AND `class` MUST include `aspect-5/4`, `animate-slow-zoom`, and `object-cover`
- AND a green badge MUST show CountUp to 2000 with prefix "+"
- AND a yellow badge MUST show "Atención 100% ad honorem"

#### Scenario: Reduced motion on hero photo

- GIVEN `prefers-reduced-motion: reduce` is active
- WHEN the hero renders
- THEN `animate-slow-zoom` MUST be disabled

#### Scenario: No raw `<img src={asset.src}>` in Hero

- GIVEN the build completes (`pnpm build`)
- WHEN inspecting `dist/` output or component source
- THEN Hero.astro MUST NOT contain `<img src={heroNinos.src}>` or equivalent raw pattern
- AND the emitted `<img>` MUST come from `<Image src={heroNinos}>`

### Requirement: Static Image Rendering via Astro Image

The system MUST render all static `src/assets/**` images in Hero.astro through `<Image>` from `astro:assets`. Each `<Image>` MUST receive explicit `width` and `height` props matching the source asset dimensions. The `class` prop MUST be forwarded to the emitted `<img>` element. The `loading` and `decoding` attributes MAY be set explicitly; Astro defaults (`loading="lazy"`, `decoding="async"`) are acceptable for below-the-fold images.

#### Scenario: Build emits optimized assets

- GIVEN the project builds successfully (`pnpm build`)
- WHEN inspecting `dist/_astro/` output
- THEN each static image from Hero.astro MUST appear as an optimized asset (not the raw source file)

#### Scenario: Favicons and runtime images are unaffected

- GIVEN the build completes
- WHEN inspecting NavBar.astro and Footer.astro favicon `<img>` tags and NoteCard/NoteTemplate/WriterNoteCard `<img>` tags
- THEN those elements MUST remain raw `<img>` or `<link>` (NOT `<Image>` from `astro:assets`)

#### Scenario: Sharp declared as direct dependency

- GIVEN the project builds successfully (`pnpm build`)
- WHEN inspecting `package.json`
- THEN `sharp` (^0.35.4) MUST be declared as a direct dependency
- AND the build MUST pass with sharp resolvable at project level (pnpm strict node_modules does not expose astro's optional dependency to the emitted prerender bundle)
