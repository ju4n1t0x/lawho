# i18n Setup Specification

## Purpose

Wire Astro's built-in i18n configuration so the site supports Spanish (default) and English locales. English content is not provided in this change; `/en/` routes MUST fall back to Spanish content.

## Requirements

### Requirement: Astro i18n Configuration

`astro.config.mjs` MUST declare `i18n` with `defaultLocale: 'es'` and `locales: ['es', 'en']`.

#### Scenario: Config contains i18n block

- GIVEN `astro.config.mjs` is read
- WHEN the i18n block is inspected
- THEN `defaultLocale` MUST equal `'es'`
- AND `locales` MUST be the array `['es', 'en']`

#### Scenario: Build succeeds with i18n wired

- GIVEN i18n is configured
- WHEN `astro build` runs
- THEN the build MUST complete without errors

### Requirement: English Fallback to Spanish

Routes under `/en/` MUST render the same Spanish content as `/` when no English translation exists.

#### Scenario: `/en/` route serves Spanish content

- GIVEN no English translation file exists for the landing
- WHEN a user navigates to `/en/`
- THEN the page MUST render the Spanish landing content
- AND the `<html lang>` attribute MUST reflect the active locale

#### Scenario: Missing English content does not error

- GIVEN i18n is wired with `es` default
- WHEN Astro resolves an `/en/*` route with no translation
- THEN the system MUST fall back to the Spanish default without a 404
