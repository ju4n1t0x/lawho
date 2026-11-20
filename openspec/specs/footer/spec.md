# Footer Specification

## Purpose

Site footer with logo, description, social links (Instagram + email), and copyright.

## Requirements

### Requirement: Logo and Tagline

The system MUST render "LAWHO" in `font-display` bold with "Fundación sanitaria" subtitle, matching the navbar logo block.

#### Scenario: Footer logo matches

- GIVEN the footer renders
- WHEN inspecting the logo
- THEN it MUST show "LAWHO" and "Fundación sanitaria"

### Requirement: Description

The system MUST render: "LAWHO Asociación Civil — operativos de salud en el Chaco Salteño, Departamento Rivadavia Banda Norte, Salta. Contacto: Dra. Elizabeth Macedo, 351-744-2040."

#### Scenario: Description matches verbatim

- GIVEN the footer renders
- WHEN inspecting the description
- THEN it MUST contain the exact text above including "Dra. Elizabeth Macedo" and the phone number

### Requirement: Social Links

The system MUST render an Instagram link to `https://www.instagram.com/lawho_medicos_voluntarios/` (with `target="_blank"` and `rel="noreferrer"`) and an email link to `mailto:elimacedo1806@gmail.com` displaying "elimacedo1806@gmail.com".

#### Scenario: Links are correct

- GIVEN the footer renders
- WHEN inspecting the links
- THEN Instagram MUST link to the URL above with `target="_blank"`
- AND the email link MUST be `mailto:elimacedo1806@gmail.com`

### Requirement: Copyright

The system MUST render "© {current year} LAWHO Asociación Civil" with the year dynamically set.

#### Scenario: Copyright shows current year

- GIVEN the current year is 2026
- WHEN the footer renders
- THEN it MUST show "© 2026 LAWHO Asociación Civil"
