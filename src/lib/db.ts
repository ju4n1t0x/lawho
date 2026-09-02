import { Pool } from "pg";
import {
  DATABASE_HOST,
  DATABASE_PORT,
  DATABASE_USER,
  DATABASE_PASSWORD,
  DATABASE_NAME,
  DATABASE_SSL,
} from "astro:env/server";

let pool: Pool | undefined;

/**
 * Build the pg.Pool configuration from the server environment.
 * No connection string is hardcoded; every value comes from `astro:env/server`,
 * which Astro validates at build time (missing secrets fail the build loudly).
 */
function buildPoolConfig() {
  return {
    host: DATABASE_HOST,
    port: DATABASE_PORT,
    user: DATABASE_USER,
    password: DATABASE_PASSWORD,
    database: DATABASE_NAME,
    ssl: DATABASE_SSL,
  };
}

/**
 * Return the shared pg.Pool singleton, created lazily on first use.
 * All data-access modules must obtain their pool through this function.
 */
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool(buildPoolConfig());
  }
  return pool;
}

/**
 * Close the pool and release all connections (graceful shutdown).
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

// Graceful shutdown on termination signals.
process.on("SIGTERM", () => {
  void closePool();
});

process.on("SIGINT", () => {
  void closePool();
});
