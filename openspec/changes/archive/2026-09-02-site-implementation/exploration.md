# Exploration: site-implementation

Faithful Astro 7.2 replica of the LaWho landing site currently living as a Lovable/TanStack-Start reference at `Sanando Con Amor/`. This exploration pre-empts the spec design phase: it inventories the reference, compares implementation options, and surfaces the questions the user must answer before specs can be written.

---

## Current State

### Reference project: `Sanando Con Amor/` (the site to replicate)

**Stack (Lovable-generated, NOT to be carried over).**
- TanStack Router + TanStack Start (file-based routes), React 19.2, TypeScript strict.
- TailwindCSS v4 (`@tailwindcss/vite`) + `@theme inline` design tokens in `src/styles.css`.
- shadcn/ui library in `src/components/ui/` (~47 components, mostly unused in `index.tsx` — see below).
- Lucide icons, embla-carousel, react-day-picker, recharts, cmdk, sonner — most are pulled in by shadcn defaults but never imported in the landing route.
- Nitro server runtime (Cloudflare target) with custom SSR error wrapper (`server.ts`, `start.ts`) — **out of scope** for the Astro replica.
- Bun as package manager (`bun.lock`).

**Routes.**
- `src/routes/__root.tsx` — HTML shell, head meta (title: "Lovable App"), preconnect + Google Fonts stylesheet (Raleway + Montserrat), 404 + error components.
- `src/routes/index.tsx` — the **only landing page**; 563 lines; everything (navbar, hero, sections, footer) lives inline inside one component. **All content is in Spanish.**

**Sections in `index.tsx`, in order, with their semantic purpose:**
1. `<nav>` — sticky pill navbar (logo "LAWHO" + tagline "Fundación sanitaria", links Historia / Infancias / Terreno / Sumate, "Doná" CTA). Hidden mobile menu (no `useIsMobile` hook is actually used in this route — desktop links are simply `md:flex`).
2. `<section>` HERO — badge with heartbeat dot, H1 with hand-drawn SVG underline, paragraph, two CTAs, hero image with two floating badges (`CountUp 2000+` / "Atención 100% ad honorem"), two blurred decorative blobs (`animate-drift`).
3. `<section>` CINTA — infinite marquee of pueblo names (`animate-marquee`).
4. `<section id="historia">` — 4-step timeline (Preparamos / Viajamos / Atendemos / Seguimos) + photo + dark quote block.
5. `<section id="infancias">` — abuela photo + 3 datos cards (Desnutrición / Parasitosis / Salud bucal).
6. `<section id="impacto">` — 4 stat counters in a `bg-leaf` panel (`CountUp`: 2000, 2, 1500 km, 100%).
7. `<section id="misiones">` — 3 mission cards (Pediatría y nutrición / Diagnóstico / Comunidad).
8. `<section id="donar">` — full-bleed photo with dark gradient overlay, copy + 3 aportes list + "Quiero colaborar" CTA (mailto).
9. `<section id="voluntariado">` — two cards (¿Sos profesional? / ¿Querés ayudar de otra forma?).
10. `<footer>` — logo, description, Instagram + email links, copyright.

**Animations / interactions inventory (`src/styles.css` + components).**
- `@utility animate-fade-up` — hero entrance (translateY 20→0 + opacity, `ease-out-expo`, 0.8s).
- `.reveal` + `.reveal.is-visible` — IntersectionObserver-driven fade-up on scroll (Reveal component).
- `@utility photo-zoom` — `overflow: hidden` + `img { transition: transform 1.2s ease-out-expo, filter 0.6s }` + `:hover img { scale(1.05) }`.
- `@utility animate-soft-pulse`, `animate-slow-zoom`, `animate-float-soft`, `animate-drift`, `animate-marquee`, `animate-heartbeat` — infinite ambient loops with staggered delays.
- `@utility lift` — card hover lift (`translateY(-6px)` + soft shadow).
- `prefers-reduced-motion: reduce` short-circuit for all loops and Reveal.
- `CountUp` — rAF-driven eased integer counter (`es-AR` locale) gated by IntersectionObserver (0.4 threshold).
- No GSAP, no Framer Motion, no library-driven animation. All is CSS keyframes + custom React hooks (`useInView`).

**Design tokens (`@theme inline` + `:root`).**
- Fonts: Raleway (display) + Montserrat (sans). Both loaded from Google Fonts in `__root.tsx` (`<link>` to `fonts.googleapis.com`).
- Custom semantic colors in oklch: `--primary` (orange-ish), `--accent` (red), `--secondary` (sand), `--sun` (warm yellow), `--leaf` (green), `--sky` (blue), `--violet`, plus standard chart/sidebar slots.
- `--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)` reused everywhere.
- `--radius: 1.5rem` (very large rounding — explains the pill navbar and `rounded-[2.5rem]` cards).
- `--shadow-soft: 0 24px 60px -30px oklch(0.3 0.05 60 / 0.4)`.

**Assets (`src/assets/`, ~1.1 MB of JPGs):**
- `ninos-esperanza.jpg` (hero), `hero-manos.jpg` (donar section), `comunidad-abuela.jpg` (infancias left), `territorio.jpg` (historia right), `mision-1.jpg`, `mison-2.jpg`, `mision-3.jpg`, `ninos-1.jpg`, `ninos-2.jpg`. All are referenced via Vite import, not via `public/`.
- `public/favicon.ico` only.

**Excluded from the replica (reference-only / out of scope).**
- `server.ts`, `start.ts`, `lib/error-*.ts`, `lib/lovable-error-reporting.ts`, `routeTree.gen.ts`, `router.tsx`, `hooks/use-mobile.tsx` (unused), `components/ui/*` (47 shadcn files — none imported by the landing).
- `routeTree.gen.ts` is auto-generated by TanStack; no Astro analogue.

### Target project: `lawho/` (where the replica will live)

**Stack.**
- Astro 7.2.10 (only declared dep, pnpm 10.28.2, Node ≥22.12.0).
- TypeScript strict (inherited from Astro default).
- No Tailwind installed; `tailwindcss` and `@tailwindcss/vite` NOT in `package.json` even though `AGENTS.md` lists "TailwindCss" under Tecnologías.
- No test runner installed (vitest/jest/playwright absent); `openspec/config.yaml` flags `strict_tdd: false` with reason "no workspace-level test command exists".
- `astro.config.mjs` declares 6 PostgreSQL env vars per the prior `env-config` change (`env.schema` + `validateSecrets: true`).
- Default Astro scaffold: `src/pages/index.astro` renders `<Welcome />` inside `<Layout>`. `Welcome.astro` is the boilerplate Astro hero with `astro.svg` + `background.svg` (must be deleted).
- `src/components/`, `src/layouts/`, `src/assets/` exist; `public/favicon.ico` + `favicon.svg` present.

**Constitution (`docs/constitution.md`, 6 rules).**
1. Stack mínimo — Astro 7.2 + stdlib only; no extra frameworks except tests.
2. Spec antes que código — read constitution + active spec before touching code.
3. Separación de capas — pages / layouts / components / content collections / server islands.
4. Tests obligatorios — tests must run green at end of every task.
5. Persistencia externa — Postgres via env vars, images on filesystem served by Nginx, Docker on VPS with DB outside compose.
6. Idioma — variables English, user messages Spanish, content es + en via i18n (Spanish default).

**i18n — declared in constitution and AGENTS, NOT yet wired.** No `astro.config.mjs` i18n config, no `src/i18n/` folder, no `astro:translations` usage anywhere. This is a gap to flag.

**Existing OpenSpec surface.**
- `openspec/config.yaml` — landing + blog + auth-subdomain context.
- `openspec/specs/env-config/spec.md` — env-var convention (6 requirements, Given/When/Then).
- `openspec/changes/archive/2026-09-02-env-config/` — completed env-config change (proposal, exploration, design, tasks, specs, verify-report, archive-report).

---

## Affected Areas

### Files the replica will CREATE in `lawho/`

**Layout & shell.**
- `src/layouts/BaseLayout.astro` — HTML shell, `<html lang="es">`, head meta, Google Fonts preconnect + stylesheet link, global CSS import, slot. Replaces the boilerplate `Layout.astro`.
- `src/styles/global.css` — design tokens (CSS custom props mirroring `:root` oklch palette), `@keyframes` for fade-up/soft-pulse/slow-zoom/float-soft/drift/marquee/heartbeat, `@layer base` reveal class, `prefers-reduced-motion` short-circuits, font-family base. Direct port of `src/styles.css` minus Tailwind directives and `@theme inline`.
- (Optional) `src/styles/animations.css` — split animations into a separate file if global.css grows too large. Lean toward keeping one file first.

**Components (one per section + shared atoms).**
- `src/components/NavBar.astro` — sticky pill navbar.
- `src/components/Hero.astro` — hero section (badge + headline + CTAs + photo + floating badges).
- `src/components/Marquee.astro` — pueblos marquee (CSS-only, no JS).
- `src/components/Historia.astro` — 4-step timeline + photo + dark quote block.
- `src/components/Infancias.astro` — abuela photo + 3 datos cards.
- `src/components/Impacto.astro` — 4 stat counters.
- `src/components/Misiones.astro` — 3 mission cards.
- `src/components/Donar.astro` — full-bleed photo CTA panel.
- `src/components/Voluntariado.astro` — two-card volunteer block.
- `src/components/Footer.astro` — logo, description, links, copyright.
- `src/components/Reveal.astro` — vanilla-JS intersection-observer wrapper around a `<slot>`. Server-renders the children immediately, hydrates a tiny `<script>` to add `is-visible` when the element scrolls into view. Replaces `Reveal.tsx` + `useInView`.
- `src/components/CountUp.astro` — `<span>` with `data-countup-to`, `data-prefix`, `data-suffix`. Tiny `<script>` reads the attribute, IntersectionObserver-gates rAF animation. Replaces `CountUp.tsx`. Requires no client framework.

**Pages.**
- `src/pages/index.astro` — composes the nine section components inside `BaseLayout`. Sole page in the landing scope.

**Assets (images).**
- `src/assets/hero-ninos-esperanza.jpg`, `hero-manos.jpg`, `comunidad-abuela.jpg`, `territorio.jpg`, `mision-1.jpg`, `mision-2.jpg`, `mision-3.jpg`, `ninos-1.jpg`, `ninos-2.jpg` — copied verbatim from `Sanando Con Amor/src/assets/`. (Per AGENTS, the long-term hosting story is filesystem + Nginx; for the replica we can keep them in `src/assets/` for Vite/Astro processing. The Nginx move is a deploy concern.)

### Files the replica will MODIFY in `lawho/`

- `src/pages/index.astro` — overwrite boilerplate to render the section composition.
- `astro.config.mjs` — likely add `i18n: { defaultLocale: 'es', locales: ['es', 'en'] }` if we adopt Astro's built-in i18n (see Recommendation §B).
- `package.json` — only if Tailwind is added (Approach B). For Approach A: zero deps change.

### Files the replica will DELETE in `lawho/`

- `src/components/Welcome.astro` (Astro starter).
- `src/assets/astro.svg`, `src/assets/background.svg` (Astro starter).

### Files explicitly OUT of scope for this change

- `openspec/specs/env-config/spec.md` — read-only context; do not touch.
- `src/content/**` — no content collections touched (the /operativos-de-salud blog is a separate change).
- `src/pages/api/**`, server islands, auth subdomain — separate change.
- Any PostgreSQL / Nginx / Docker plumbing — separate deployment change.

---

## Approaches

### A. Static Astro + vanilla CSS + tiny client `<script>` islands

Port `styles.css` to `src/styles/global.css` as plain CSS (custom properties for tokens, raw `@keyframes`, `@layer base` reveal rule, hand-written `photo-zoom` / `lift` utility classes). Animations use CSS only. `Reveal` and `CountUp` become `.astro` components with a `<script>` block that does IntersectionObserver + rAF. No client framework, no Tailwind, no new deps.

- **Pros.** Matches constitution rule 1 (Astro + stdlib only). Smallest possible bundle. `astro build` stays fully static (no server adapter). CSS animations already work natively — the Reveal/CountUp logic is ~40 lines each. Zero migration risk for `package.json`.
- **Cons.** Utility-class authoring is verbose for the 9 sections (no Tailwind shortcuts). Color tokens must be hand-written CSS instead of `bg-primary` shorthand. Custom CSS variables mean component-local styles can't easily share Tailwind tokens if Tailwind is later added.
- **Effort.** Medium. Most cost is in converting Tailwind utility soup in `index.tsx` to scoped `<style>` blocks in each Astro component (roughly 1:1 with the 563 lines, but cleaner per-section files).

### B. Static Astro + TailwindCSS v4

Add `tailwindcss` + `@tailwindcss/vite` to `package.json`. Convert `src/styles.css`'s `@theme inline` + `:root` directly to Tailwind v4's CSS-first config. Replace `index.tsx`'s utility classes with the same utilities in Astro components (`class:list` directive). Reveal/CountUp unchanged from A.

- **Pros.** Token parity with the reference is exact (the reference IS Tailwind v4 — `--color-primary`, `bg-primary`, etc., map 1:1). Faster authoring for new sections. Aligns with `AGENTS.md` which lists Tailwind under Tecnologías. Reduces bespoke CSS surface.
- **Cons.** Adds a dep (constitution rule 1 violation unless we update the spec first). Requires spec approval per `AGENTS.md` ("No añadas dependencias ni cambies el formato del JSON sin actualizar antes la spec"). Build gets slightly slower. Tailwind v4 in Astro 7.2 needs an Astro integration path (Vite plugin works; Astro has `@astrojs/tailwind` for v3, v4 is Vite-only — needs verification).
- **Effort.** Medium-Low IF spec is updated first; same authoring cost once configured.

### C. Static Astro + scoped `<style>` only, no tokens file

Write per-component `<style>` blocks with hand-picked colors (no `:root` tokens). Cheapest upfront, but every color/spacing/radius change is a multi-file find-and-replace.

- **Pros.** Zero token infrastructure.
- **Cons.** Maintenance hell. Doesn't scale past ~5 sections. Defeats the purpose of the reference design system.
- **Effort.** Low first, high later. Reject.

### D. Keep `output: 'server'` + an Astro adapter (Node/Vercel/Cloudflare)

Required only if we adopt server islands for in-page interactivity. The reference's animations don't need SSR — they need a client `<script>`. No adapter needed.

- **Pros.** Future-proof for the auth subdomain change later.
- **Cons.** Constitutes a new architecture choice without a current need. Astro 7.2 can ship fully static landing pages. Defers the deployment decision but bloats current scope.
- **Effort.** Low for the config; high for the unnecessary hosting surface. Reject for THIS change.

---

## Recommendation

**Approach A (static Astro + plain CSS + tiny client scripts).** Rationale:
- Honors constitution rule 1 without any spec dance.
- The reference's design system is small enough (one `:root`, ~20 tokens, 7 keyframes, 6 utility classes) to port directly — Tailwind would not save meaningful authoring time at 9 sections.
- Reveal/CountUp are ~40 lines each of vanilla JS; a server island would be over-engineered.
- Keeps `astro build` static, matching the landing's nature (no DB writes on this page).
- i18n: defer to a tiny custom dictionary approach (or `astro:translations` if installed later) rather than wiring `astro.config.mjs` i18n now — the landing content is only Spanish.

**Spec organization (one spec per section, as the user requested).** Propose the following `openspec/changes/site-implementation/specs/` slices — each maps to one section or shared atom, and each can be implemented + verified independently:

| # | Domain (spec dir) | Subject |
|---|-------------------|---------|
| 1 | `layout-template` | BaseLayout, head meta, font loading, i18n baseline (`<html lang="es">`), global CSS tokens |
| 2 | `navbar` | Sticky pill NavBar, mobile links collapse, "Doná" CTA |
| 3 | `hero` | Hero section with badge, headline + SVG underline, CTAs, photo, two floating badges |
| 4 | `marquee` | Pueblos infinite marquee (CSS-only) |
| 5 | `historia` | 4-step timeline + photo + dark quote block |
| 6 | `infancias` | Abuela photo + 3 datos cards |
| 7 | `impacto` | 4 stat counters panel (CountUp integration) |
| 8 | `misiones` | 3 mission cards |
| 9 | `donar` | Full-bleed photo CTA panel |
| 10 | `voluntariado` | Two-card volunteer block |
| 11 | `footer` | Logo + description + social links + copyright |
| 12 | `reveal-animation` | Reveal component (IntersectionObserver + CSS class toggle, prefers-reduced-motion fallback) |
| 13 | `countup-animation` | CountUp component (rAF + IntersectionObserver, `es-AR` locale) |
| 14 | `design-tokens` | `:root` CSS custom properties + `@keyframes` + `@utility` classes (`photo-zoom`, `lift`, ambient loops) — single source of truth shared by every section spec |

The 14-domain split keeps every slice ≤ ~150 lines of spec, each independently verifiable, and lets `sdd-tasks` forecast whether the aggregate exceeds the 400-line review budget per Section E. If forecasting is high, chained PRs should be used (likely 3 slices per PR: shell + hero + reveal primitives; sections 4–8; sections 9–11 + footer).

---

## Risks

1. **Identity vs. design-only copy.** The reference text is fully LaWho-specific ("LAWHO", "Chaco Salteño", "Wichí/Chorote/Chulupí", "Dra. Elizabeth Macedo", Instagram handle, mailto, "Fundación sanitaria" tagline). The user has not confirmed whether the LaWho Astro project should ship VERBATIM LaWho texts or REPURPOSE the design with placeholder/wireframe copy. **This is the single highest-risk assumption**; without clarification the spec cannot be written (see open questions).
2. **Tailwind drift.** If Approach B is chosen later, the `:root` tokens need to move from plain CSS to `@theme inline` in `global.css`. Reshuffles spec 14.
3. **Google Fonts licensing & offline build.** Fonts are loaded from `fonts.googleapis.com` via `<link>` in `__root.tsx`. At build time we can keep the `<link>` approach (no build-time fetch needed). If self-hosting is required (privacy / offline CI), we'd need to vendor Raleway + Montserrat into `public/fonts/` and use `@font-face` — adds ~50 KB and a font-licensing check.
4. **Asset hosting.** AGENTS says filesystem + Nginx long-term. For the replica we keep JPGs in `src/assets/` (Vite hashes them, Astro optimizes). The deploy story (Nginx serving from `/var/www/...`) is a separate change. Don't conflate with this one.
5. **CountUp `es-AR` locale.** The reference uses `toLocaleString("es-AR")` for `2000 → "2.000"`. In Astro client `<script>` we'd use `Intl.NumberFormat("es-AR")`. No `toLocaleString` requires the runtime locale data — Astro client ships this in modern browsers. Low risk.
6. **Reduced-motion.** CSS handles `@media (prefers-reduced-motion: reduce)` — must be carried over verbatim to keep accessibility parity.
7. **Two different sites share one identity.** If the user wants a literal LaWho copy on the Astro site (verbatim texts), then `Sanando Con Amor/` is effectively the design source, not the canonical content source. If the user wants LaWho to evolve its own copy later, the Astro site should ship placeholder/wireframe copy under each section. Different specs depending on answer to Q1.
8. **Mobile menu missing.** The reference navbar hides links below `md` and does NOT show a mobile menu — links simply disappear on small screens (likely an oversight in the Lovable output). The Astro replica must replicate this OR add a proper menu; this is a fork the user should decide (Q4).
9. **shadcn/ui in `components/ui/` of the reference is dead weight.** 47 files imported nowhere. We will NOT port them. Confirms Approach A's minimalism.
10. **i18n baseline.** Constitution declares Spanish default + English content possible. No Astro i18n config exists. For the landing replica (Spanish-only content) we can leave i18n un-wired. For the blog / auth subdomain change, i18n will need to be added. Risk of deferring i18n config: future blog change must redo the wiring. Acceptable for now.

---

## Ready for Proposal

**No — pending user clarification.**

Before `sdd-propose` runs, the user must answer (see Open Questions §). The most critical answer is **Q1 (verbatim copy vs. design-only)** because every spec text block depends on it. The remaining questions affect scope, asset handling, and a couple of small UI forks.

Once the user answers, the orchestrator should proceed to `sdd-propose` with:
- Approach A confirmed (or B if Tailwind is approved with spec update).
- The 14-domain spec slice list above as the proposal's deliverable breakdown.
- This exploration as the supporting evidence file.

---

## Open Questions for the User

> One question per message, per house style. Listed in priority order. The orchestrator should ask **Q1 first** because the rest cascade from it.

**Q1. Identity / copy.** Should the Astro site ship VERBATIM with the reference's LaWho texts (logo "LAWHO" / "Fundación sanitaria", Instagram `lawho_medicos_voluntarios`, mailto `elimacedo1806@gmail.com`, "Dra. Elizabeth Macedo", "Chaco Salteño", pueblo names, mailto CTAs), OR should it use the SAME design but with placeholder / wireframe copy that the LaWho team will replace later?

**Q2. Animations parity.** Which animations are MUST-HAVE identical (Reveal on scroll, CountUp on stats, heartbeat badge, drift blobs, marquee pueblos, float-soft floating badges, photo-zoom on hover, lift cards, slow-zoom hero image, fade-up hero entry) vs. ACCEPTABLE-TO-OMIT/SIMPLIFY (e.g. drop the heartbeat dot, drop the float-soft badges)?

**Q3. Fonts.** Google Fonts `<link>` to Raleway + Montserrat (build-time fine, runtime CDN fetch) OR self-hosted WOFF2 in `public/fonts/` with `@font-face`?

**Q4. Mobile menu.** The reference hides nav links below `md` with NO hamburger menu (links just disappear). Replicate verbatim (likely a Lovable oversight) OR add a proper mobile drawer/menu?

**Q5. Assets.** Copy the reference's JPGs verbatim into `src/assets/` of the Astro project (keeps parity), OR expect LaWho to supply its own final images later and use placeholders for now?

**Q6. Scope of `site-implementation`.** This change covers ONLY the landing (home + sections + navbar + footer) on `/`, OR does it also include the `/operativos-de-salud` blog + auth subdomain? (If blog/auth included, scope explodes and the spec slice list must be reorganized — better as a separate change.)

**Q7. Tailwind approval (only if you lean toward Approach B).** Add TailwindCSS v4 as a dependency, OR keep plain CSS? This requires a spec update to constitution rule 1 first.

**Q8. i18n for the landing.** Ship Spanish-only and defer i18n wiring to the blog change, OR wire `astro.config.mjs` `i18n: { defaultLocale: 'es', locales: ['es','en'] }` now (even if landing has no English content yet) so future blog work inherits the config?