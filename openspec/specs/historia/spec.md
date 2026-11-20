# Historia Specification

## Purpose

Section with "Cómo trabajamos" header, 4-step timeline cards (Preparamos, Viajamos, Atendemos, Seguimos), territory photo, and dark quote block.

## Requirements

### Requirement: Section Header

The system MUST render "Cómo trabajamos" as eyebrow text and the H2: "Dos operativos al año, seis días en terreno y un radio de 100 km desde Santa Victoria Este."

#### Scenario: Header text matches verbatim

- GIVEN the historia section renders
- WHEN inspecting the header
- THEN the H2 MUST contain the exact text above

### Requirement: Four Timeline Cards

The system MUST render 4 cards with steps "01"–"04" and verbatim titles and descriptions:
- 01: "Preparamos" — "En Córdoba recolectamos y clasificamos la medicación donada por laboratorios: control de vencimientos, armado por especialidad y almacenamiento."
- 02: "Viajamos" — "1500 km hasta Santa Victoria Este, Salta. Dos días de ruta en vehículos particulares con el equipo médico, la logística y el equipamiento asegurado."
- 03: "Atendemos" — "Seis días en terreno, unas 2000 consultas de múltiples especialidades en parajes del Departamento Rivadavia Banda Norte, respetando cultura y creencias."
- 04: "Seguimos" — "Cada consulta queda registrada en la historia clínica digital SAFESA del Ministerio de Salud de Salta, para dar seguimiento operativo tras operativo."

#### Scenario: All 4 cards render with correct content

- GIVEN the historia section renders
- WHEN inspecting the cards
- THEN each card MUST display its paso number, title, and text verbatim as listed above

### Requirement: Territory Photo

The system MUST render `como-trabajamos.avif` via Astro `<Image>` from `astro:assets` with explicit `width` (1600) and `height` (912), keeping `class="h-full min-h-[18rem] w-full object-cover"` and `loading="lazy"`. The rendered element SHALL be the `<img>` emitted by `<Image>`, not a raw `<img src={territorio.src}>`.

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

### Requirement: Dark Quote Block

The system MUST render a dark-background block with the quote: "Así como una flor surge en medio de condiciones desafiantes, creemos en el potencial de florecer y construir un futuro próspero para todos." and attribution "LAWHO Asociación Civil".

#### Scenario: Quote renders verbatim

- GIVEN the historia section renders
- WHEN inspecting the quote block
- THEN the quote text and attribution MUST match verbatim
