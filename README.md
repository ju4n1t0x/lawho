# LaWho

Astro website, PostgreSQL-backed live blog, and authenticated writer area. Production runs on **Vercel Node**, with **Neon PostgreSQL** and a **private Neon Object Storage bucket**. Editorial images do not depend on application disk. Docker/Nginx files remain legacy references, not a verified deployment path for the Vercel build.

## Local setup

1. Use the Node version declared in `.nvmrc` / `package.json` and the pinned pnpm version. Install with `pnpm install --frozen-lockfile`.
2. Copy `docs/vercel-neon.env.example` to a gitignored `.env` and fill the placeholders. The old root `.env.example` may contain legacy filesystem settings; use the new template for this deployment.
3. Set runtime `DATABASE_*` fields to a restricted role and the **pooled** host of an isolated Neon branch; use TLS. Set `MIGRATION_DATABASE_URL` separately to a **direct** privileged connection, not a pooler URL. Never send migration credentials to the application runtime.
4. Verify the private `lawhobucket` bucket and set the five storage fields in the template. Having PostgreSQL credentials does not grant S3 access.
5. Run the migration command and provision a writer using the maintenance commands below before opening DB-backed pages.

Application modules use `astro:env/server`; maintenance tools explicitly load local `.env` through Node and validate their own script-only variables. Storage secrets are validated when storage is used, not by copying secrets into a client bundle.

Select **Node 26** in Vercel project settings and run `nvm use` locally. The maintainer requires Node 26 throughout development, CI and production. The pinned adapter has a stale runtime table and initially emits `nodejs24.x` even under Node 26. The canonical `pnpm build` explicitly normalizes that field to the documented Build Output API `nodejs26.x` runtime, preserving other function settings, then independently verifies every generated function. It fails before building under any other Node major. Do not deploy raw `astro build` output or treat an `engines` declaration alone as sufficient. This compatibility step can be removed after a newer adapter is verified to emit Node 26 natively; no vendor files are patched.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm test` | Run all unit tests, including maintenance and upload tests |
| `pnpm typecheck` | Check application/test TypeScript with the pinned compiler |
| `pnpm db:migrate` | Apply pending schema migrations with history, checksums and serialization |
| `pnpm db:create-user` | Create an active writer; enter email and a hidden password interactively |
| `astro dev --background` | Start local development in background mode |
| `astro dev status` / `astro dev logs` / `astro dev stop` | Manage the development server |
| `pnpm build` | Build Vercel output and reject test/secret artifacts in the result |
| `pnpm check:deployment` | Inspect `.vercel/output` for forbidden artifacts |

Migrations are explicit maintenance/deployment operations: no schema creation happens on visits, module imports, or serverless cold starts. `001` historically includes one example post, `003` adds mandatory soft-delete support, and `004` adds managed image references. `002` is optional sample content and excluded from normal schema application. Historical migrations must not be edited after application. For an existing database without history, follow the verified baseline procedure in `scripts/README.md`; do not assume `IF NOT EXISTS` proves compatibility.

The writer command hashes with the existing **Argon2id** helper before insertion and never prints passwords or hashes. Passwords are 8–128 characters and never CLI arguments. No public registration exists. Malformed/plaintext stored passwords need a deliberate reset; there is no plaintext login fallback or automatic deployment-time password reset.

## Neon bucket setup

Before activating storage, confirm the project's supported region, branch endpoint, bucket existence and **private** access mode, and a credential with storage read/write scopes. Private/public-read access cannot be changed in place; do not recreate an existing bucket silently.

Configure bucket CORS for explicit application origins, for example your production origin, the intended staging origin, and `http://localhost:4321`. Allow `PUT` with `Content-Type` and the headers required by the signed request; test the browser preflight. Avoid an unrestricted wildcard origin. Bucket CORS is not authentication.

- The authenticated browser requests a short-lived upload authorization and sends the image directly to a user-scoped `pending/` object. Note submissions contain fields and a pending reference, **not image bytes**. This preserves the 5 MiB image limit despite Vercel's 4.5 MB function request limit.
- The server rechecks ownership, expiry, actual bounded bytes, JPEG/PNG magic bytes and dimensions, then optimizes with sharp in memory. It writes a distinct random final object under `notes/`; a reusable pending PUT can never overwrite that final image.
- The post stores a nullable `image_key` and a stable `/media/<key>` URL in `image_url`. This route checks the associated non-deleted post, requires a session for drafts, and redirects to a fresh 60-second signed GET with no-store caching. **Expiring signed URLs are never persisted in PostgreSQL.**
- Editing without a new file retains the image. Replacement updates PostgreSQL before removing the old unreferenced managed object. Soft delete retains assets. Cleanup failures after a successful save are warnings, not a failed edit.
- Sessions remain in PostgreSQL, shared across function instances. Writer responses and image redirects disable caching. Root pages are rendered on demand so the featured-post carousel updates without a redeploy and builds do not query the live database.

## Vercel deployment from Git

Deploy from the Vercel dashboard: **Add New → Project → import the GitHub repository → framework preset Astro → Node 26 → Deploy**. No local Vercel CLI, login, token or prebuilt artifact is involved. `vercel.json` keeps Git deployments enabled, pins `pnpm build` as the build command and installs strictly from the lockfile.

| Branch | Vercel environment | Use |
| --- | --- | --- |
| `dev` | Preview/staging with its own scoped variables | integration check before `main` |
| `main` | Production | only after the maintainer confirms `dev` is stable |

Each push runs the canonical `pnpm build` inside Vercel: Node 26 guard, adapter runtime normalization to `nodejs26.x`, build, and artifact inspection. A failed build blocks that deployment. `.github/workflows/ci.yml` runs `pnpm typecheck`, `pnpm test` and the same build on `dev`, `main` and pull requests, with no deployment step and no privileged secret.

Keep Preview and Production variables scoped and keep them on isolated Neon branches. Check the application region against the actual Neon region in project settings. Untrusted fork/branch previews must not receive production credentials. Do not treat a successful local build as proof of live Vercel/Neon connectivity or native-module compatibility in the deployed runtime.

### Release order

1. Run `pnpm db:migrate` locally with `MIGRATION_DATABASE_URL` **before** pushing code that requires the new schema. Migrations stay additive and expand/contract so the running application keeps working with the previous schema while the new one is applied.
2. Push or merge into `dev` and verify the Preview deployment against the intended Neon branch and bucket.
3. After the maintainer confirms `dev` is stable, merge into `main`; Vercel builds and promotes production.

Migrations are deliberately **not** part of the Vercel build. Vercel has no build-only variables, so a migration URL configured in the project would also be readable by every deployed function. `MIGRATION_DATABASE_URL` therefore stays in the local gitignored `.env` and never reaches Vercel.

Tests remain versioned with code in `dev` and `main` and run before deployment. Test dependencies may be installed during build, but test files, fixtures, coverage, test-only tooling and `.env` files are forbidden in deployed static/function output. `pnpm build` inspects that output rather than relying on `devDependencies` alone.

## Existing images, orphans, and rollback

Legacy `image_url` values remain unchanged when `image_key` is null. On Vercel, `/uploads/...` references still require an actual accessible image origin or an explicit transfer; a URL in a seed row is not an image file. Do not claim legacy migration is complete until real sources have been inventoried and copied.

For a legacy transfer: inventory actual files and matching rows, dry-run a proposed mapping, validate/optimize each source, upload to a unique finalized key, verify the destination, and update only the matching row/reference. Preserve missing/unreadable references and never delete local originals automatically. A bulk transfer is not run as part of deployment; schedule it explicitly if existing data requires one.

Pending objects are removed after successful saves. For abandoned uploads, use a trusted maintenance session to list `pending/` keys and remove only objects older than the pending TTL **and** signed PUT expiry, allowing an operational grace period for in-flight requests. For finalized orphans, inventory `notes/` objects, allow a long grace period, and check all rows including soft-deleted notes immediately before deletion. Do not run broad bucket deletes or rely on Neon lifecycle expiration rules: those rules are stored but not currently enforced. Automating cleanup requires a separately reviewed maintenance job; there is no destructive cleanup endpoint.

Rollback application releases without dropping additive schema, deleting stored assets, or undoing user data. Build failure after a committed migration does not reverse that migration. Changes integrate through `dev`; `main` is updated only after explicit maintainer confirmation that staging is stable. No deployment script pushes Git branches.

## Verification before activation

Run `pnpm test`, `pnpm typecheck` and `pnpm build`, then use an **isolated** Neon branch/bucket to verify fresh/repeated/concurrent migrations, writer login/logout, direct upload, create/edit/replacement, draft protection, image reads after signed-link expiry, and failure cleanup. Cloud activation, credential scoping, CORS, region, any legacy transfer, and the Vercel project settings must be verified separately; unit tests do not provision or validate them.
