# Database maintenance

Run these tools from the repository root with Node 26 (`nvm use`) and installed dependencies.
They load `.env` with `process.loadEnvFile()` if present; exported environment
variables take precedence. Imports perform no connections, DDL, or provisioning.

## Quick path

1. Set **only** `MIGRATION_DATABASE_URL` for the maintenance connection. Use a
   direct endpoint and separately privileged credentials for the intended isolated
   Neon branch. Never distribute these credentials to application runtime or
   untrusted previews. Nonlocal connections always verify TLS certificates;
   `sslmode=require` is upgraded to verified TLS. `-pooler` endpoints are rejected.
2. Run `node scripts/migrate.mjs` before the application build. Stop on failure.
3. Run `node scripts/create-user.mjs` in an interactive terminal. Enter the email,
   hidden password, and confirmation. Passwords must contain 8–128 characters.
   There are no password arguments, pipe input, deploy-time resets, or public signup.

Suggested package-script mapping (maintained by the parent implementation):

| Script | Command |
| --- | --- |
| `db:migrate` | `node scripts/migrate.mjs` |
| `db:create-user` | `node scripts/create-user.mjs` |
| `test:db-tools` | `vitest run scripts/tests` |

## Migration guarantees

The runner holds a session advisory lock on the same dedicated client throughout
history inspection and application. Each migration and SHA-256 history insertion
commits together. Failures roll back that transaction; earlier committed
migrations remain. Repeated runs skip unchanged migrations. Unknown versions,
checksum drift, history gaps, and transaction-control/nontransactional SQL fail
closed. Keep the numbered SQL files immutable; add another migration instead.

Required migrations are all numbered files except `002`. Historical `001` inserts
one example note, **not** a writer or image file. `002` is optional sample content
and has no automatic opt-in in this tool. Do not run it in production by accident.
`003` adds soft deletion; `004` adds a nullable, unique finalized image reference
matching `notes/<32 lowercase hex>.jpg` or `.png`, preserving `image_url`.

## Adopting an existing database

Without history, an existing schema is **never automatically accepted**.

1. Back up the database and inspect `public.users`, `public.sessions`,
   `public.notes`, `citext`, their columns/defaults, constraints, and indexes.
2. Reconcile differences explicitly. Determine the last required migration whose
   complete schema is already present: `001`, `003`, or `004`.
3. Run, for example, `node scripts/migrate.mjs --baseline=003`. The tool builds a
   reference schema within a transaction from the unchanged historical SQL and
   compares catalog definitions. Reference data is discarded. The operator role
   needs permission to create/drop that temporary reference schema.
4. Only a matching schema is recorded as the selected baseline. The same run then
   applies later pending migrations. A mismatch rolls back adoption and creates
   no history. An existing history cannot be overwritten with `--baseline`.

Comparison is intentionally conservative: additional columns, constraints, or
indexes on these tables, alternate sequence names, or differently installed
`citext` require operator review/reconciliation. This does not infer historical
sample insertion or modify existing application data to resemble samples.

Do not delete history or accept a new checksum to bypass a mismatch. Inspect and
restore the original SQL or resolve the schema deliberately. Application rollback
does not roll back committed additive migrations. The CLI emits sanitized Spanish
errors rather than raw PostgreSQL messages that could contain credentials/data.

## Verification

Run `pnpm exec vitest run scripts/tests` and `pnpm test`.
The integration test is skipped unless `LAWHO_RUN_DB_INTEGRATION=1` and
`MIGRATION_DATABASE_URL` are explicitly set to an **empty disposable database**.
It creates and drops test schemas/tables there; never target production.
It removes `citext` only if the test installed it; preexisting extensions remain.
It deliberately does not load `.env` or infer runtime credentials.
Unit/mocked tests do not prove Neon permissions, real advisory-lock concurrency,
or Vercel deployment. Inspect generated deployment artifacts separately to ensure
these maintenance scripts and tests are not bundled into application functions.
