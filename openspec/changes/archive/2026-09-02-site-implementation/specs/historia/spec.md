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

The system MUST render `territorio.jpg` with `photo-zoom` and `loading="lazy"`.

#### Scenario: Photo uses correct asset

- GIVEN the historia section renders
- WHEN inspecting the image
- THEN `src` MUST reference `territorio.jpg`

### Requirement: Dark Quote Block

The system MUST render a dark-background block with the quote: "Así como una flor surge en medio de condiciones desafiantes, creemos en el potencial de florecer y construir un futuro próspero para todos." and attribution "LAWHO Asociación Civil".

#### Scenario: Quote renders verbatim

- GIVEN the historia section renders
- WHEN inspecting the quote block
- THEN the quote text and attribution MUST match verbatim
