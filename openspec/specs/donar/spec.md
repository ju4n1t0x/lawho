# Donar Specification

## Purpose

Full-bleed photo CTA section with dark gradient overlay, donation copy, 3 aportes list, and "Quiero colaborar" mailto CTA.

## Requirements

### Requirement: Background Photo and Overlay

The system MUST render `hero-manos.jpg` via Astro `<Image>` from `astro:assets` with explicit `width` (1600) and `height` (1000), keeping `class="absolute inset-0 size-full object-cover"` and `loading="lazy"`. The rendered element SHALL be the `<img>` emitted by `<Image>`, not a raw `<img src={heroManos.src}>`. A dark gradient overlay (`from-foreground/92 via-foreground/80 to-foreground/40`) MUST sit above the image.

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

### Requirement: Donation Copy

The system MUST render eyebrow "Tu aporte viaja con nosotros", H2 "El operativo se financia a pulmón. Sostenerlo depende de todos.", and the paragraph: "Los viajes se costean con aportes del propio equipo médico y voluntario, de sus familias y de colaboradores. Cada aporte se transforma en medicación, combustible y horas de atención donde el sistema de salud casi no llega."

#### Scenario: Copy matches verbatim

- GIVEN the donar section renders
- WHEN inspecting the text
- THEN all copy MUST match the reference verbatim

### Requirement: Three Aportes Items

The system MUST render 3 items:
- "Medicación" — "Donada por laboratorios y entregada a los puestos sanitarios"
- "Logística" — "Combustible y traslado del equipo y el equipamiento a Salta"
- "Equipamiento" — "Ecógrafos, reactivos e insumos para el trabajo en terreno"

#### Scenario: All 3 items render

- GIVEN the donar section renders
- WHEN inspecting the aportes list
- THEN all 3 items MUST display with correct title and description

### Requirement: Mailto CTA

The "Quiero colaborar" button MUST link to `mailto:elimacedo1806@gmail.com`.

#### Scenario: CTA opens email client

- GIVEN the donar section renders
- WHEN "Quiero colaborar" is clicked
- THEN the browser MUST attempt to open `mailto:elimacedo1806@gmail.com`
