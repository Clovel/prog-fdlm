/* Module imports -------------------------------------- */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

/* Module imports (project) ---------------------------- */
import * as schema from './schema';

/* Type declarations ----------------------------------- */
export type DbClient = ReturnType<typeof drizzle<typeof schema>>;

/* External variables ---------------------------------- */
/**
 * Cache the client across HMR reloads in development so we don't leak
 * connections when Next reuses the module. In production we just
 * reuse the module-scope client.
 */
const globalForDb = globalThis as unknown as {
  dbClient?: DbClient;
  dbPool?: ReturnType<typeof postgres>;
};

/* Helpers --------------------------------------------- */
const buildClient = (): DbClient => {
  const databaseUrl: string | undefined = process.env.DATABASE_URL;

  if(databaseUrl === undefined || databaseUrl.length === 0) {
    throw new Error('DATABASE_URL is not set. Add it to .env.local.');
  }

  const pool = postgres(databaseUrl, {
    max: 10,
    idle_timeout: 20,
    prepare: false,
  });

  globalForDb.dbPool = pool;

  return drizzle(pool, { schema, casing: 'snake_case' });
};

/* Public client --------------------------------------- */
export const db: DbClient = globalForDb.dbClient ?? buildClient();

if(process.env.NODE_ENV !== 'production') {
  globalForDb.dbClient = db;
}
