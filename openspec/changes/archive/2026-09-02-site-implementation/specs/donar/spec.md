# Donar Specification

## Purpose

Full-bleed photo CTA section with dark gradient overlay, donation copy, 3 aportes list, and "Quiero colaborar" mailto CTA.

## Requirements

### Requirement: Background Photo and Overlay

The system MUST render `hero-manos.jpg` as a full-bleed background with a dark gradient overlay (`from-foreground/92 via-foreground/80 to-foreground/40`).

#### Scenario: Photo and overlay render

- GIVEN the donar section renders
- WHEN inspecting the section
- THEN the background MUST be `hero-manos.jpg` with a dark gradient overlay

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
