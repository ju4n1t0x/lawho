# Voluntariado Specification

## Purpose

Two-card volunteer block: one for health professionals, one for other forms of help. Both link to mailto.

## Requirements

### Requirement: Professional Card

The system MUST render a card with H2 "¿Sos profesional de la salud?", paragraph: "Convocamos médicos especialistas, odontólogos y enfermeros con título habilitante, seguro personal y de mala praxis vigentes, avalados ante el Ministerio de Salud de Salta.", and CTA "Sumate al equipo" linking to `mailto:elimacedo1806@gmail.com`.

#### Scenario: Professional card renders verbatim

- GIVEN the voluntariado section renders
- WHEN inspecting the first card
- THEN all text MUST match verbatim and the CTA MUST link to the mailto

### Requirement: Other Help Card

The system MUST render a card with `bg-sun`, H2 "¿Querés ayudar de otra forma?", paragraph: "Logística, transporte, cocina, clasificación de insumos, medicación donada por laboratorios o alianzas institucionales: todo suma para volver más seguido.", and CTA "Escribinos" linking to `mailto:elimacedo1806@gmail.com`.

#### Scenario: Other help card renders verbatim

- GIVEN the voluntariado section renders
- WHEN inspecting the second card
- THEN all text MUST match verbatim with sun background and the CTA MUST link to the mailto
