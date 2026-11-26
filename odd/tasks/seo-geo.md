# LAWHO technical SEO and search visibility
Branch: `feat/seo-geo`, based on `dev` at `9f55a3c`. Delivery: ask-on-risk; no push or production configuration changes.
Verification: Node 26.13.1, pnpm 12.21.0; focused tests, `pnpm test`, `pnpm typecheck`, and canonical `pnpm build`.

## Specs

- S1: “sin cambiar nada del contenido visual y actual que posee el proyecto, ni modificar la estructura”
- S2: “Cada URL necesita su title, description y OG propios.” “Revisar que haya <link rel="canonical">, og:image, og:url, og:locale="es_AR" y <html lang="es-AR">.”
- S3: “Todavía no hay operativos publicados” “el dominio es lawho.com.ar y ya esta activo y desplegado por si queres revisarlo”
- S4: “Revisar: sitemap.xml (con @astrojs/sitemap), robots.txt que apunte al sitemap, HTTPS con redirección www/no-www a una sola versión, y Core Web Jitals (las imágenes AVIF/WebP ya ayudan).”
- S5: “Agregá un bloque Organization / NGO con name, alternateName ("LAWHO Asociación Civil"), url, logo, description, areaServed (Rivadavia Banda Norte, Salta), sameAs (Instagram), email, foundingDate y founder.”
- S6: “Dejá el valor real en el HTML y animá solo visualmente.”

## Tasks

- T1 — S1–S3 — Inline — done (implementation and functional verification) — Route-specific metadata, canonical links, stable share image, and indexing for the empty list; staged, no commit. Native review of the future committed slice remains pending.
- T2 — S1, S3–S4 — Worker — done (implementation and functional verification) — Public, canonical sitemap and robots reference; commit owner: maintainer.
- T3 — S1, S5–S6 — Worker — done (implementation and functional verification) — Verified organizational schema; commit owner: maintainer. Counter change excluded because the existing spec requires visibly starting at zero.

## Log

L1: ahora si, comienza con los cambios, el proyecto se despliega desde vercel de forma automatica con en enlace del repositorio

- Production audit: apex and `www` both respond 200 over HTTPS; the two inspected Spanish routes share metadata; the empty list is indexable; `robots.txt` has no sitemap reference; sitemap candidates respond 404. Vercel domain redirects, webmaster accounts, crawl/training policy, and editorial expansion are not deployment actions for this branch; `/llms.txt` was optional in the plan.
- Design basis: retain existing routes, navigation, page body and styling. Use the confirmed apex as canonical. Index the listing only after a successful nonempty read; never infer an empty catalog from a read error. Do not emit `hreflang` for unconfirmed translations. Keep structured data to public, verifiable facts.
- Forecast: about 250 authored lines T1, 140 T2, 110 T3. Reviewable boundary between T1 and subsequent work if published later.
- Baseline: `pnpm test` exited 0 (246 passed, 1 skipped); `pnpm build` exited 0, normalized one Vercel function to `nodejs26.x`, and passed artifact exclusions. Engram mirror pending: no Engram tools are exposed in this session.
- T1: `/en/` paths currently mirror Spanish content, so they are aliases of the corresponding Spanish canonicals, not distinct search documents; no `hreflang` emitted. Keep editorial and language routing unchanged. The independent check identified managed JPEG/PNG and false empty-state handling; both reproduced/covered and corrected. Focused tests passed (8), suite passed (254; 1 skipped), and typecheck and canonical build passed, with the public share image byte-identical in Vercel output. Isolated HTTP checks covered both route families, including draft head isolation, missing detail, empty/published/error lists and escaping. Differential checked the layout head/status/robots on writer paths against `dev` for anonymous requests. `git commit` exited 128: `Author identity unknown`; T1 remains staged and no local commit was created. T2 proceeds on disjoint paths while the author identity is pending.
- T2 design: serve `/sitemap.xml` as an on-demand Astro endpoint with the apex home, the list if it has published notes, and canonical published note URLs. Exclude mirrors, drafts, soft-deleted notes, writer pages, media, and previews from the URL set. Reuse the public-published source of truth without rendering Markdown where practical; a data failure must give a retryable, non-cacheable error, not an apparently successful partial sitemap. Retain the existing writer exclusion in `robots.txt`. No dependency, migration, Vercel change, or production access.
- Maintainer correction: no tienes que configurar nada de git, la sincronizacion ya esta realizada los commits y push los realizo yo
- Ownership: no more staging, commits, pushes, or Git configuration changes. Keep the existing index untouched. Local implementation and checks continue; no native review closure is claimed.
- T2: focused RED reproduced missing route and robots behavior; focused GREEN passed (23 tests including existing repository tests). Public HTTP fixture checks passed for empty, published, 503/retry, and robots discovery. Full suite, typecheck and the canonical Vercel build passed; `/sitemap.xml` is routed to `_render`, not copied as static output. No Git index edits by the worker.
- T3 design: add a single NGO JSON-LD block to the Spanish canonical home only. Use verified public facts from the current site (name, description, official social profile, public contact when present, and area served) and an existing public official logo only if suitable. Omit unsupported founder, dates, counts and legal identifiers. Google accepts JSON-LD in the body; prefer adding only an inert script to the current home over touching the shared layout or the visual component tree. Serialize safely, including escaping `<` before inline output. No events, FAQ, external service changes, new dependencies, or visual edits.
- T3: isolated RED (2 failed) and GREEN (2 passed) observed. HTTP verified one parseable NGO block at `/`, none at `/en/`, and SVG icon availability. Final suite: 260 passed, 1 opt-in DB integration test skipped; typecheck, canonical build, and Vercel artifact inspection passed (Node 26 only, dynamic sitemap, public images copied, test artifacts excluded). No verified public founder or founding date, so both are omitted.
- Handoff: staged T1 and unstaged T2/T3 remain as-is; no local commit, push, or deploy was performed. Native RDD assessment could not bind this worktree containing untracked paths; the final committed slice has no native review result. The actual www redirect and webmaster tools still need separate production-side action.
