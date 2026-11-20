# Constitution Amendment Specification

## Purpose

Amend `docs/constitution.md` rule 1 to permit TailwindCSS v4 as a dependency, gating all subsequent Tailwind-related work. This amendment is a prerequisite for the site-implementation change.

## Requirements

### Requirement: Rule 1 Amendment

The project constitution rule 1 ("Stack mínimo — Astro 7.2 + stdlib only") MUST be updated to explicitly allow TailwindCSS v4 (and its Vite plugin `@tailwindcss/vite`) as a permitted dependency.

#### Scenario: Amendment applied before Tailwind install

- GIVEN `docs/constitution.md` contains rule 1 mentioning Astro 7.2 + stdlib only
- WHEN the amendment task completes
- THEN rule 1 text MUST include an explicit exception for TailwindCSS v4
- AND `package.json` MUST NOT contain `tailwindcss` or `@tailwindcss/vite` until after the amendment is committed

#### Scenario: Gate prevents premature dependency

- GIVEN the amendment has NOT been committed
- WHEN a developer attempts to add TailwindCSS to `package.json`
- THEN the apply phase MUST refuse to proceed until the amendment commit exists in history

### Requirement: Amendment Commit Ordering

The amendment MUST be committed as its own atomic commit, preceding any other commit in the site-implementation change.

#### Scenario: Git log shows amendment first

- GIVEN the site-implementation change is complete
- WHEN inspecting `git log --oneline`
- THEN the amendment commit MUST appear before any commit that touches `package.json`, `astro.config.mjs`, or `src/styles/global.css`
