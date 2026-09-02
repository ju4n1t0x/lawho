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

The system MUST render the hero image (`ninos-esperanza.jpg`) with `photo-zoom` and `animate-slow-zoom`, plus a green floating badge showing CountUp "+2000" / "consultas por operativo" and a yellow badge "Atención 100% ad honorem".

#### Scenario: Photo and badges render

- GIVEN the hero renders
- WHEN inspecting the photo area
- THEN the image MUST use `ninos-esperanza.jpg`
- AND a green badge MUST show CountUp to 2000 with prefix "+"
- AND a yellow badge MUST show "Atención 100% ad honorem"

#### Scenario: Reduced motion on hero photo

- GIVEN `prefers-reduced-motion: reduce` is active
- WHEN the hero renders
- THEN `animate-slow-zoom` MUST be disabled
