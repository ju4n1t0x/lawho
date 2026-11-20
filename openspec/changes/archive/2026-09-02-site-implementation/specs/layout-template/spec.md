# Layout Template Specification

## Purpose

Define the `BaseLayout.astro` HTML shell: `<html lang>`, head meta, self-hosted font `@font-face` declarations, global CSS import, and slot. Replaces the default Astro `Layout.astro`.

## Requirements

### Requirement: BaseLayout Shell

The system MUST provide `src/layouts/BaseLayout.astro` that wraps all pages with `<html>`, `<head>`, meta tags, font preloads, global CSS, and a `<slot />`.

#### Scenario: Page renders inside BaseLayout

- GIVEN `index.astro` uses `BaseLayout`
- WHEN the page renders
- THEN the HTML MUST contain `<html lang="es">` and a `<head>` with title and description meta

### Requirement: Self-Hosted Fonts

The system MUST serve Raleway and Montserrat as self-hosted WOFF2 files via `@font-face`. The system MUST NOT load fonts from Google Fonts CDN or any external origin.

#### Scenario: No external font requests

- GIVEN the page loads
- WHEN network requests are inspected
- THEN there MUST be zero requests to `fonts.googleapis.com` or `fonts.gstatic.com`

#### Scenario: Missing WOFF2 file fails build

- GIVEN a `@font-face` references `raleway.woff2`
- WHEN the file is absent from `src/assets/fonts/`
- THEN `astro build` MUST fail or the font MUST NOT render (no silent fallback to system font without warning)

### Requirement: Font License Files

The system MUST include SIL OFL license files for Raleway and Montserrat alongside the WOFF2 files.

#### Scenario: License files present

- GIVEN fonts are vendored
- WHEN inspecting `src/assets/fonts/`
- THEN `OFL.txt` (or equivalent SIL OFL license) MUST exist for each font family

### Requirement: Global CSS Import

`BaseLayout` MUST import `src/styles/global.css` which contains the Tailwind v4 entry point and design tokens.

#### Scenario: Global CSS loaded on every page

- GIVEN any page using `BaseLayout`
- WHEN the HTML is inspected
- THEN the global CSS MUST be present in the `<head>` or inlined

### Requirement: Remove Starter Scaffolding

The system MUST remove `Welcome.astro`, `astro.svg`, and `background.svg` from the project.

#### Scenario: Starter files absent

- GIVEN the site-implementation change is complete
- WHEN inspecting `src/components/` and `src/assets/`
- THEN `Welcome.astro`, `astro.svg`, `background.svg` MUST NOT exist
