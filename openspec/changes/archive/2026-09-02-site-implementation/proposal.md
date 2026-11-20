# Proposal: Site Implementation (LaWho Landing)

## Intent

Replicate the LaWho landing (reference `Sanando Con Amor/`) as a static Astro 7.2 site: verbatim texts, identical animations, Tailwind v4, self-hosted fonts, wired i18n.

## Scope

### In Scope
- Verbatim LaWho texts (logo "LAWHO", tagline, Instagram, mailto, "Dra. Elizabeth Macedo", "Chaco Salteño", pueblo names).
- Landing `/` only: navbar, hero, marquee, historia, infancias, impacto, misiones, donar, voluntariado, footer.
- **Constitution amendment** (rule 1) permitting TailwindCSS v4 — prerequisite before adding the dep.
- Tailwind v4 via `@tailwindcss/vite` + `@theme inline` oklch tokens.
- All 7 keyframes + Reveal + CountUp (es-AR) + reduced-motion fallback.
- Self-hosted WOFF2 (Raleway + Montserrat, SIL OFL) with `@font-face`.
- Copy 9 JPGs verbatim into `src/assets/`.
- Mobile hamburger/drawer (deliberate fix over reference's missing menu).
- Wire i18n (`defaultLocale: 'es'`, `locales: ['es','en']`); en falls back to es.

### Out of Scope
- Blog `/operativos-de-salud`; auth subdomain + server islands; Postgres/Nginx/Docker; en content (config only).

## Capabilities

### New Capabilities
- `constitution-amendment` — permit Tailwind v4 (rule 1).
- `i18n-setup` — wire es/en in `astro.config.mjs`.
- `design-tokens` — `@theme inline` + oklch tokens + 7 keyframes + utilities.
- `layout-template` — BaseLayout, head, `@font-face`, global CSS.
- `navbar` — sticky pill + mobile drawer.
- `hero` — badge, H1 + SVG underline, CTAs, photo, floating badges.
- `marquee` — pueblos CSS marquee.
- `historia` — 4-step timeline + quote.
- `infancias` — abuela + 3 datos cards.
- `impacto` — 4 stat counters (CountUp).
- `misiones` — 3 mission cards.
- `donar` — full-bleed photo CTA.
- `voluntariado` — two-card block.
- `footer` — logo, social, copyright.
- `reveal-animation` — IntersectionObserver Reveal.
- `countup-animation` — rAF CountUp (es-AR).

### Modified Capabilities
None (`env-config` read-only).

## Approach

Static Astro 7.2 + Tailwind v4 CSS-first config. Amendment task first. Port 9 sections into 12 `.astro` components (Reveal/CountUp = tiny client `<script>` islands). Copy assets; vendor fonts. Rewrite `index.astro` to compose sections in `BaseLayout`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `docs/constitution.md` | Modified | Amend rule 1 |
| `package.json` | Modified | Add tailwind deps |
| `astro.config.mjs` | Modified | Tailwind plugin + i18n |
| `src/layouts/BaseLayout.astro` | New | Shell, fonts, head |
| `src/layouts/Layout.astro` | Removed | Replaced |
| `src/styles/global.css` | New | Tailwind + tokens |
| `src/components/*.astro` | New | 12 components |
| `src/pages/index.astro` | Modified | Compose sections |
| `src/assets/` | New | 9 JPGs + WOFF2 |
| `Welcome.astro`, `astro.svg`, `background.svg` | Removed | Astro starter |

## Risks

- Tailwind violates rule 1 — High — amendment first, gate apply on it.
- Tailwind v4 + Astro path — Med — `@tailwindcss/vite`, not `@astrojs/tailwind`.
- Font OFL files to fetch — Med — vendor WOFF2 + license.
- Verbatim public texts — Low — LaWho-owned; note in spec.
- Mobile menu deviation — Low — documented improvement.
- No test runner (rule 4) — Med — add vitest in apply.
- 400-line budget — High — forecast; chained PRs.

## Rollback Plan

Revert `docs/constitution.md`, `package.json`, `astro.config.mjs`; delete created `src/**` and copied JPGs/fonts; `git revert` amendment commit.

## Dependencies

- Fetch Raleway + Montserrat WOFF2 (SIL OFL) with license files.
- `pnpm add tailwindcss @tailwindcss/vite` (post-amendment).

## Success Criteria

- [ ] `astro build` passes with Tailwind v4; grep-env gate clean.
- [ ] Page matches reference section-by-section (7 animations + Reveal/CountUp).
- [ ] Fonts served locally (no Google Fonts request).
- [ ] i18n config present (es default, es+en locales).
- [ ] Rule 1 amended before any dependency added.
