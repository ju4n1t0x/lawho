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

The system MUST render `comunidad-abuela.jpg` with `photo-zoom`, aspect 4/5, rounded with `rounded-bl-[6rem]` corner treatment.

#### Scenario: Photo uses correct asset

- GIVEN the infancias section renders
- WHEN inspecting the image
- THEN `src` MUST reference `comunidad-abuela.jpg`

### Requirement: Three Datos Cards

The system MUST render 3 cards with verbatim content:
- Card 1: image `ninos-1.jpg`, alt "Pediatra voluntaria auscultando a un niño en un consultorio comunitario", dato "Desnutrición", text "infantil y del adulto mayor: uno de los focos centrales de cada operativo."
- Card 2: image `ninos-2.jpg`, alt "Manos de una niña sosteniendo un frasco de vitaminas", dato "Parasitosis", text "agravada por la falta de agua potable y las condiciones habitacionales."
- Card 3: image `mision-1.jpg`, alt "Niño sonriendo durante una jornada sanitaria de LAWHO", dato "Salud bucal", text "prevención y educación en niños desde el consultorio odontológico de La Merced."

#### Scenario: All 3 cards render correctly

- GIVEN the infancias section renders
- WHEN inspecting the cards
- THEN each card MUST display its image, dato title, and text verbatim as listed above
