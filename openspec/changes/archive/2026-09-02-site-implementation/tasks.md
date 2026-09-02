# Tasks: Site Implementation (LaWho Landing)

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~2 000–2 500 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Work Units

| Unit | Goal | Likely PR | Test command | Harness | Rollback |
|---|---|---|---|---|---|
| 1 | Amendment, deps, config, tokens, BaseLayout, anim.ts+islands, assets+fonts, Hero, NavBar | PR 1 | `pnpm vitest run` | `astro build` (nvm v22.22.3) + preview | Revert amendment; remove deps; delete new files |
| 2 | Marquee, Historia, Infancias, Impacto, Misiones | PR 2 | `pnpm astro build` | Preview section parity | Delete 5 component files |
| 3 | Donar, Voluntariado, Footer, index.astro, starter deletion | PR 3 | `pnpm astro build` + grep dist | Preview page + `/en/` | Restore starter index.astro; delete components |

Bases: P1→tracker; P2→P1; P3→P2.
Threat matrix: all N/A — no RED tests.

## Phase 1: Foundation & Amendment

- [x] 1.1 Amend rule 1 in `docs/constitution.md` (Tailwind v4 exception); commit ALONE (constitution-amendment)
- [x] 1.2 `pnpm add tailwindcss @tailwindcss/vite` (post-1.1 gate)
- [x] 1.3 `astro.config.mjs`: `tailwindcss()` plugin + i18n es/en, `prefixDefaultLocale: false` (i18n-setup)
- [x] 1.4 `src/styles/global.css`: `@import "tailwindcss"`, oklch tokens, 7 keyframes+utilities, `photo-zoom`/`lift`/`.reveal`, reduced-motion (design-tokens)

## Phase 2: Core Components

- [x] 2.1 `src/layouts/BaseLayout.astro`: localized `<html lang>`, meta, global.css, slot (layout-template)
- [x] 2.2 `src/components/NavBar.astro`: pill, logo, 4 links, Doná, mobile drawer (navbar)
- [x] 2.3 `src/components/Hero.astro`: badge, H1+SVG, copy, CTAs, photo, badges (hero)
- [x] 2.4 `src/components/Marquee.astro`: 8 pueblos ×2, `animate-marquee` (marquee)
- [x] 2.5 `src/components/Historia.astro`: header, 4 cards, `territorio.jpg`, quote (historia)
- [x] 2.6 `src/components/Infancias.astro`: abuela, header, 3 cards (infancias)
- [x] 2.7 `src/components/Impacto.astro`: `bg-leaf` panel, 4 CountUps (impacto)
- [x] 2.8 `src/components/Misiones.astro`: 3 cards, center offset (misiones)
- [x] 2.9 `src/components/Donar.astro`: photo+overlay, copy, 3 aportes, mailto (donar)
- [x] 2.10 `src/components/Voluntariado.astro`: 2 cards (`bg-sun` 2nd), mailto (voluntariado)
- [x] 2.11 `src/components/Footer.astro`: logo, desc, social links, ©year (footer)
- [x] 2.12 `src/lib/anim.ts`: `easeOutCubic`, `formatEsAr` (countup-animation)
- [x] 2.13 `Reveal.astro` + `CountUp.astro`: IO, delays, reduced-motion (reveal/countup)

## Phase 3: Assets & Fonts

- [x] 3.1 Copy 10 JPGs from `Sanando Con Amor/src/assets/` (read-only) → `src/assets/` (ninos-3 unused)
- [x] 3.2 Vendor Raleway/Montserrat WOFF2 + OFL → `src/assets/fonts/` (layout-template)

## Phase 4: Testing Tooling

- [x] 4.1 `pnpm add -D vitest` + `test: "vitest run"` (rule 4)
- [x] 4.2 `src/lib/anim.test.ts`: `formatEsAr` "2.000"/"1.500"; `easeOutCubic` bounds (countup-animation)

## Phase 5: Composition & Cleanup

- [x] 5.1 Rewrite `src/pages/index.astro`: 10 sections in BaseLayout, serves `/`+`/en/` (i18n-setup)
- [x] 5.2 Delete `Welcome.astro`, `Layout.astro`, `astro.svg`, `background.svg` (layout-template)

## Phase 6: Verification

- [x] 6.1 Grep-env gate on `src/`; amendment first in `git log` (constitution-amendment)
- [x] 6.2 `pnpm astro build` (nvm v22.22.3): `/`+`/en/` emitted; no Google Fonts in dist
- [x] 6.3 Visual parity, 7 animations, reduced-motion, drawer