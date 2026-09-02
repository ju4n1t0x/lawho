# Design: Site Implementation (LaWho Landing)

## Technical Approach

Static Astro 7.2 landing porting the LaWho reference (`Sanando Con Amor/src/`) verbatim: Tailwind v4 via `@tailwindcss/vite` (not the v3-oriented `@astrojs/tailwind`), CSS-first tokens in `@theme inline` + `:root` oklch, 7 `@keyframes`, two vanilla client `<script>` islands (Reveal, CountUp), self-hosted Raleway + Montserrat WOFF2, and i18n wired (`es` default, `en` fallback). Rule 1 amended first to permit Tailwind. Light-only (no `.dark`/chart/sidebar tokens). Maps to the 16 delta specs.

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
|---|---|---|---|
| Styling | Tailwind v4 via `@tailwindcss/vite` | `@astrojs/tailwind` (v3); plain CSS | Reference IS Tailwind v4; `@theme inline` maps 1:1; Vite plugin is the v4 path |
| Amendment ordering | Task 1 = rule-1 edit, atomic commit, THEN install deps | Install first | Constitution rule 2 forbids deps before spec/constitution update; spec gates apply on the commit |
| i18n routing | `routing: { prefixDefaultLocale: false }` | `prefix-default` (`/`→`/es/`); `domains` | es stays at `/`, en at `/en/`; no redirect; `domains` needs Nginx (out of scope) |
| Component model | One `index.astro` composing 12 components in `BaseLayout` | page-per-section | Static landing = one route; rule 3 layers pages→components |
| Client islands | Inline `<script>` per island + pure helpers in `src/lib/anim.ts` | shared `client.ts` | ~40 lines each; Astro dedupes; shared module keeps es-AR/easing unit-testable |
| Fonts | `src/assets/fonts/` + `@font-face` (`font-display: swap`) in `global.css` | `public/fonts/`; Google Fonts CDN | Vite hashes/dedupes; CDN forbidden (layout spec); self-host = offline/privacy |
| Animation port | 7 `@keyframes` + `@utility animate-*` verbatim, 2 vanilla scripts | `tw-animate-css`; framer-motion | Reference uses raw CSS keyframes; no extra dep; reduced-motion kept |

## Data Flow

```
index.astro ── BaseLayout.astro ── global.css (@theme inline + keyframes + utilities)
   │ compose
   ├─ NavBar/Hero/Marquee/Historia/Infancias/Impacto/Misiones/Donar/Voluntariado/Footer
   │    (static HTML; CSS-only animation)
   └─ Reveal.astro / CountUp.astro ── inline <script> (IntersectionObserver + rAF)
                                          └─ src/lib/anim.ts (pure helpers)
```

Fully static; runtime network only to mailto/Instagram.

## File Changes

| File | Action | Description |
|---|---|---|
| `src/layouts/BaseLayout.astro` | Create | Shell, `<html lang={Astro.currentLocale}>`, meta, font preload, global CSS |
| `src/layouts/Layout.astro` | Delete | Boilerplate; replaced |
| `src/styles/global.css` | Create | `@import "tailwindcss"` + tokens + keyframes + utilities |
| `src/components/{NavBar,Hero,Marquee,Historia,Infancias,Impacto,Misiones,Donar,Voluntariado,Footer,Reveal,CountUp}.astro` | Create | 10 sections + 2 islands |
| `src/lib/anim.ts` | Create | `easeOutCubic`, `formatEsAr` (pure, testable) |
| `src/pages/index.astro` | Modify | Compose sections in BaseLayout |
| `src/assets/*.jpg` (10) | Create | Copy verbatim (`ninos-3.jpg` unused) |
| `src/assets/fonts/*` | Create | Raleway + Montserrat WOFF2 + OFL licenses |
| `docs/constitution.md` | Modify | Rule 1 amendment (Tailwind exception) |
| `package.json` | Modify | `+tailwindcss @tailwindcss/vite`; `+vitest` (dev, test-only) |
| `astro.config.mjs` | Modify | Vite plugin + i18n |
| `src/components/Welcome.astro`, `src/assets/{astro,background}.svg` | Delete | Starter scaffold |

## Interfaces / Contracts

`@theme inline` tokens (light, oklch): `--primary 0.678 0.181 49.5`, `--accent 0.615 0.22 25.5`, `--secondary 0.936 0.014 82`, `--sun 0.939 0.198 105.3`, `--leaf 0.589 0.161 150.2`, `--sky 0.711 0.149 234.2`, `--violet 0.593 0.097 286.6`, `--background 0.989 0.006 84.6`, `--foreground 0.218 0 90`, `--card 0.959 0.01 81.8`, `--muted-foreground 0.502 0.018 67.4`, `--border 0.906 0.017 79.3` (+ `*-foreground`). `--radius 1.5rem`, `--ease-out-expo cubic-bezier(0.16,1,0.3,1)`, `--shadow-soft 0 24px 60px -30px oklch(0.3 0.05 60/.4)`.

7 keyframes: `fade-up`, `soft-pulse`, `slow-zoom`, `float-soft`, `drift`, `marquee`, `heartbeat` → `@utility animate-*` each. Utilities: `photo-zoom`, `lift`, `.reveal`/`.reveal.is-visible`.

```js
// astro.config.mjs (excerpt)
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  vite: { plugins: [tailwindcss()] },
  i18n: { defaultLocale: 'es', locales: ['es','en'],
          routing: { prefixDefaultLocale: false } },
});
```

`Reveal.astro`: `delay?: number`. `CountUp.astro`: `value:number`, `prefix?`, `suffix?`, `duration?=1600`. One `index.astro` renders both `/` and `/en/` (identical Spanish content); `<html lang>` differs via `Astro.currentLocale`.

## Testing Strategy

No runner (`strict_tdd:false`). Add `vitest` (test-only; rule 4 permits) as an apply task.

| Layer | What | Approach |
|---|---|---|
| Unit | `formatEsAr` (2000→"2.000", 1500→"1.500"), `easeOutCubic` bounds | vitest |
| Build | Tailwind + i18n resolve; fonts local (no Google Fonts URL); grep-env clean | `astro build` |
| Visual | Section parity + 7 animations + reduced-motion | Manual vs reference |

Honest: IntersectionObserver/rAF DOM glue is browser-only — covered by build + visual, not unit.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. (i18n routing is content routing, not a threat boundary.)

## Migration / Rollout

None — greenfield landing replacing starter. Git repo is mid-init: only `README.md` tracked, everything else untracked; delivery/commit is human-owned.

## Open Questions

- [ ] `layout-template` spec scenario says `public/fonts/`; decision uses `src/assets/fonts/` — reconcile wording before verify.
- [ ] WOFF2 subset (latin vs latin-ext) for Raleway/Montserrat — full or subsetted files.
- [ ] Visual QA: screenshot-diff tooling vs manual review — unconfirmed.
