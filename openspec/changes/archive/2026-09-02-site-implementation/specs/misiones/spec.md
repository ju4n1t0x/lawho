# Misiones Specification

## Purpose

Section with header "Lo que pasa en el terreno" and 3 mission cards (Pediatría y nutrición, Diagnóstico, Comunidad).

## Requirements

### Requirement: Section Header

The system MUST render H2 "Lo que pasa en el terreno" with eyebrow "Operativos de salud".

#### Scenario: Header text matches

- GIVEN the misiones section renders
- WHEN inspecting the header
- THEN the H2 MUST be "Lo que pasa en el terreno"

### Requirement: Three Mission Cards

The system MUST render 3 cards with verbatim content:
- Card 1: image `mision-1.jpg`, alt "Niño sonriendo durante una jornada sanitaria", tag "Pediatría y nutrición", title "Atención pediátrica", text "Controles, nutrición, odontología y talleres de higiene para prevenir la desnutrición infantil."
- Card 2: image `mision-2.jpg`, alt "Equipo de médicos voluntarios montando una carpa sanitaria", tag "Diagnóstico", title "Estudios complementarios", text "Dos ecógrafos de alta resolución, ecocardiografía, electrocardiógrafo, EEG, doppler fetal y oftalmología."
- Card 3: image `mision-3.jpg`, alt "Vecinos esperando ser atendidos frente a un puesto sanitario", tag "Comunidad", title "Laboratorio y capacitación", text "Muestras analizadas en el Laboratorio Central del Sanatorio Allende y cursos de RCP y primeros auxilios."

#### Scenario: All 3 cards render correctly

- GIVEN the misiones section renders
- WHEN inspecting the cards
- THEN each card MUST display its image, tag, title, and text verbatim

#### Scenario: Second card offset on desktop

- GIVEN viewport is at or above `md`
- WHEN the misiones grid renders
- THEN the second card MUST be offset downward (visually staggered)
