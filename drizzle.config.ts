/* Module imports -------------------------------------- */
import { config as loadDotenv } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

/* External variables ---------------------------------- */
/* drizzle-kit imports this config at CLI time; load .env.local first so
 * process.env.DATABASE_URL is populated before we read it. */
loadDotenv({ path: '.env.local' });
loadDotenv({ path: '.env' });

const databaseUrl: string | undefined = process.env.DATABASE_URL;

if(databaseUrl === undefined || databaseUrl.length === 0) {
  throw new Error('DATABASE_URL is required. Set it in .env.local.');
}

/* Drizzle Kit configuration --------------------------- */
export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
  casing: 'snake_case',
  strict: true,
  verbose: true,
});
