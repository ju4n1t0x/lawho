# Constitution Amendment Specification

## Purpose

Amend `docs/constitution.md` rule 1 to permit TailwindCSS v4 and `sharp` as dependencies, gating all subsequent image- and Tailwind-related work. This amendment is a prerequisite for the site-implementation and astro-image-refactor changes.

## Requirements

### Requirement: Rule 1 Amendment

The project constitution rule 1 ("Stack mínimo — Astro 7.2 + stdlib only") MUST be updated to explicitly allow TailwindCSS v4 (and its Vite plugin `@tailwindcss/vite`), `@astrojs/node`, `pg`, `argon2`, and `@astrojs/markdown-satteri` as permitted dependencies. Each addition MUST be listed as an explicit exception with a one-line rationale.

#### Scenario: Amendment applied before Tailwind install

- GIVEN `docs/constitution.md` contains rule 1 mentioning Astro 7.2 + stdlib only
- WHEN the amendment task completes
- THEN rule 1 text MUST include an explicit exception for TailwindCSS v4
- AND `package.json` MUST NOT contain `tailwindcss` or `@tailwindcss/vite` until after the amendment is committed

#### Scenario: Gate prevents premature dependency

- GIVEN the amendment has NOT been committed
- WHEN a developer attempts to add TailwindCSS to `package.json`
- THEN the apply phase MUST refuse to proceed until the amendment commit exists in history

#### Scenario: New deps permitted after amendment

- GIVEN the amendment commit is in history listing `@astrojs/node`, `pg`, `argon2`, `@astrojs/markdown-satteri`
- WHEN a developer runs `pnpm add @astrojs/node pg argon2 @astrojs/markdown-satteri`
- THEN the apply phase MUST allow the install to proceed

#### Scenario: Unlisted dep still blocked

- GIVEN the amendment lists only `@astrojs/node`, `pg`, `argon2`, `@astrojs/markdown-satteri`
- WHEN a developer attempts to add `express` to `package.json`
- THEN the apply phase MUST refuse to proceed; `express` is not in the sanctioned list

### Requirement: Rule 1 Amendment (sharp)

The project constitution rule 1 ("Stack mínimo — Astro 7.2 + stdlib only") MUST be updated to explicitly allow `sharp` (^0.35.4) as a permitted dependency. The addition MUST be listed as an explicit exception with a one-line rationale: native image engine required by `astro:assets`/`<Image>` build pipeline.

#### Scenario: Amendment applied before sharp install

- GIVEN `docs/constitution.md` contains rule 1 mentioning Astro 7.2 + stdlib only
- WHEN the amendment task completes
- THEN rule 1 text MUST include an explicit exception for `sharp`
- AND `package.json` MUST NOT contain `sharp` until after the amendment is committed

#### Scenario: Gate prevents premature dependency

- GIVEN the amendment has NOT been committed
- WHEN a developer attempts to add `sharp` to `package.json`
- THEN the apply phase MUST refuse to proceed until the amendment commit exists in history

#### Scenario: Sharp permitted after amendment

- GIVEN the amendment commit is in history listing `sharp`
- WHEN a developer runs `pnpm add sharp`
- THEN the apply phase MUST allow the install to proceed

#### Scenario: Unlisted dep still blocked

- GIVEN the amendment lists only `sharp`
- WHEN a developer attempts to add an unlisted dependency to `package.json`
- THEN the apply phase MUST refuse to proceed; unlisted dep is not in the sanctioned list

### Requirement: Amendment Commit Ordering

The amendment MUST be committed as its own atomic commit, preceding any other commit in the change that touches `package.json`, `astro.config.mjs`, `src/styles/global.css`, `src/lib/db.ts`, or `src/lib/password.ts`.

#### Scenario: Git log shows amendment first

- GIVEN the change is complete
- WHEN inspecting `git log --oneline`
- THEN the amendment commit MUST appear before any commit that touches `package.json`, `astro.config.mjs`, `src/styles/global.css`, `src/lib/db.ts`, or `src/lib/password.ts`
