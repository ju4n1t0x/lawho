# LaWho

Sitio web de la Asociación Civil LaWho: a static landing page (NavBar, Historia, Infancias, Terreno, Sumate, Dona, Footer) plus an internal blog (`/operativos-de-salud`) backed by PostgreSQL. A separate authenticated writer area (`/escritor/**`) lets registered users publish notes that appear on the blog immediately, without a redeploy.

This README covers the local development workflow. See `deploy/nginx.conf.example` for the production reverse-proxy reference.

## Stack

- **Astro 7.2** (standard library) with the `@astrojs/node` standalone adapter
- **TypeScript** (strict), **TailwindCSS v4**
- **PostgreSQL** (external service) via `pg`
- **argon2id** password hashing via `argon2`
- **pnpm** as the package manager
- Tests via **Vitest**

The only non-standard dependencies are those explicitly permitted by `docs/constitution.md`: `@astrojs/node`, `pg`, `argon2`, `@astrojs/markdown-satteri`, and TailwindCSS.

## Prerequisites

- **Node.js >= 22.12.0** (recommended via [nvm](https://github.com/nvm-sh/nvm)):

  ```sh
  nvm install 22
  nvm use 22
  ```

- **pnpm** (the project pins `pnpm@10.28.2` via the `packageManager` field).
- A running **PostgreSQL** instance. The database lives outside Docker (constitution rule 5).

## Setup

1. Install dependencies:

   ```sh
   pnpm install
   ```

2. Create your environment file:

   ```sh
   cp .env.example .env
   ```

   Fill in the real values. All variables are declared in `astro.config.mjs` (`env.schema`) and imported from `astro:env/server` — never from `process.env`.

   | Variable | Description |
   | --- | --- |
   | `DATABASE_HOST` | PostgreSQL host |
   | `DATABASE_PORT` | PostgreSQL port (default `5432`) |
   | `DATABASE_USER` | PostgreSQL user |
   | `DATABASE_PASSWORD` | PostgreSQL password |
   | `DATABASE_NAME` | PostgreSQL database name |
   | `DATABASE_SSL` | Whether to use SSL (`true`/`false`) |
   | `SESSION_TTL_MS` | Sliding session lifetime in ms (default `86400000`, i.e. 24h) |
   | `UPLOADS_DIR` | Local filesystem directory for uploaded images (default `./uploads`) |
   | `PUBLIC_UPLOADS_URL` | Public URL prefix stored in the DB for uploaded images (default `/uploads`) |
   | `MAX_UPLOAD_SIZE_BYTES` | Upload size cap in bytes (default `5242880`, i.e. 5MB) |
   | `SESSION_SECRET` | Optional; reserved for future signing, not consumed by current code |

3. Run the migration to create the `users`, `sessions`, and `notes` tables (plus a seed note):

   ```sh
   psql -h "$DATABASE_HOST" -p "$DATABASE_PORT" -U "$DATABASE_USER" -d "$DATABASE_NAME" -f migrations/001-init.sql
   ```

4. Create a writer user. **Registration does not exist by design** — the maintainer creates user rows directly in the database. The `password_hash` must be an argon2id hash (matching `src/lib/password.ts`). You can generate one with the project's own dependency:

   ```sh
   node --input-type=module -e 'import("argon2").then(({ default: a }) => a.hash("tu-clave").then((h) => console.log(h)))'
   ```

   Then insert it:

   ```sql
   INSERT INTO users (email, password_hash, role, is_active)
   VALUES ('tu@correo.com', '<argon2id-hash>', 'writer', true);
   ```

## Development

Start the dev server in background mode:

```sh
astro dev --background
```

Manage it with:

```sh
astro dev status   # is it running?
astro dev logs     # tail the logs
astro dev stop     # shut it down
```

The site serves at `http://localhost:4321`.

### Writer routes (auth)

In development the writer routes are reached on the same host:

- `http://localhost:4321/escritor/` — login
- `http://localhost:4321/escritor/nueva` — new note (redirects to login when unauthenticated)

To mimic the production subdomain locally, add a hosts entry:

```sh
# /etc/hosts
127.0.0.1 auth.lawho.local
```

Then visit `http://auth.lawho.local:4321/escritor/`. The Astro dev server answers on any host header; in production the same routes live behind an Nginx vhost (see `deploy/nginx.conf.example`).

## Commands

| Command | Action |
| --- | --- |
| `pnpm install` | Install dependencies |
| `astro dev --background` | Start the dev server in the background |
| `pnpm dev` | Start the dev server in the foreground |
| `pnpm build` | Build the production site to `./dist/` |
| `pnpm preview` | Preview the production build locally |
| `pnpm test` | Run the Vitest suite once (`vitest run`) |

## Blog architecture

The blog is a **live collection** over PostgreSQL (`src/live.config.ts`, `src/lib/notes-repo.ts`). Markdown note bodies are rendered to HTML inside the loader (`src/lib/markdown.ts`). The landing page stays fully static; only the blog and writer routes opt out of prerendering with `export const prerender = false`.
