# Data Layer Implementation Plan (Spec 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate event data from TypeScript fixtures to PostgreSQL via Drizzle, with the public site fetching events through four new read-only REST endpoints. Public-facing behaviour stays equivalent (Bordeaux Fête de la Musique programme, French UI, mobile-first), but the site now serves any year present in the DB and `/` redirects to the most recent edition.

**Architecture:** Self-hosted PostgreSQL. Drizzle ORM with the postgres-js driver. Fixtures in `src/fixtures/` stay on disk and become the source for an idempotent seed script (Strategy B: position-keyed upsert + trailing delete). Public pages move to `src/app/[year]/page.tsx`, remain `'use client'`, and fetch from `/api/editions/[year]` plus `/api/editions/[year]/events?limit=200`. Card expansion lazy-fetches `/api/events/[eventId]`. No auth, no write endpoints, no geocoding cache — those are Specs 2 and 3.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 6, Tailwind v4, shadcn/ui, PostgreSQL, drizzle-orm + drizzle-kit, postgres.js, date-fns + date-fns-tz, zod, tsx, pnpm.

**Spec source:** `docs/superpowers/specs/2026-05-30-data-layer-design.md`. Read it once before starting Task 1.

**Verification note:** This project has no test framework (per `CLAUDE.md`). "Verify" steps use `pnpm tsc:ci`, `pnpm lint`, direct `psql` queries, `curl` against the dev server, and visual checks in a browser. Do not introduce a test framework — it is out of scope for this plan.

**Local Postgres requirement:** Before starting Task 10, you need a reachable Postgres. The fastest path is Docker:

```bash
docker run --name fdlm-pg -e POSTGRES_PASSWORD=devpass -e POSTGRES_DB=fdlm_dev -p 5432:5432 -d postgres:16
```

Then set `DATABASE_URL=postgres://postgres:devpass@localhost:5432/fdlm_dev` in `.env.local` (Task 1 covers this).

**Convention reminders** (see `CLAUDE.md` for the full list — these trip people up):
- 2-space indent, single quotes in JS, double quotes in JSX, semicolons required, trailing commas always-multiline.
- **No space after `if` / `switch` / `for` / `while` / `catch`** (`if(x)`, not `if (x)`).
- `@typescript-eslint/strict-boolean-expressions` is an error — write `if(maybeString !== undefined && maybeString.length > 0)`, never `if(maybeString)`.
- `@typescript-eslint/explicit-function-return-type` is a warning — annotate return types on non-trivial arrows.
- Every component file uses the comment-banner layout (Framework / Module / Component / Style / Type imports → Prop types → Component → Export).
- Run `pnpm lint-fix` after non-trivial code edits to auto-fix formatting; treat any remaining errors as real.

---

## Task 1: Add dependencies, drizzle config, and env scaffolding

**Files:**
- Modify: `package.json`
- Create: `drizzle.config.ts`
- Create: `.env.example`
- Modify: `.env.local` (gitignored — local only, do not commit)

- [ ] **Step 1: Install runtime + dev dependencies**

```bash
pnpm add drizzle-orm postgres date-fns-tz
pnpm add -D drizzle-kit tsx dotenv
```

(`dotenv` is required so `drizzle.config.ts` can load `.env.local` when drizzle-kit invokes it — drizzle-kit itself does not auto-read `.env.local`.)

- [ ] **Step 2: Add scripts to `package.json`**

Open `package.json` and add these entries inside the existing `scripts` object (keep the existing keys in place):

```json
"db:generate": "drizzle-kit generate",
"db:migrate":  "drizzle-kit migrate",
"db:studio":   "drizzle-kit studio",
"db:seed":     "tsx --env-file=.env.local src/db/seed/index.ts"
```

`drizzle-kit migrate` / `generate` / `studio` all import `drizzle.config.ts`, which loads `.env.local` via `dotenv` (see Step 3). `db:seed` uses Node's native `--env-file` because tsx forwards it.

- [ ] **Step 3: Create `drizzle.config.ts` at the repo root**

```ts
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
```

- [ ] **Step 4: Create `.env.example`**

```
# PostgreSQL connection string used by Drizzle on the server and by db:* scripts.
# Server-only — never prefix with NEXT_PUBLIC_.
DATABASE_URL=postgres://user:password@host:5432/database

# Google Maps (already used by EventsMap)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_GEOCODING_API_KEY=
```

- [ ] **Step 5: Add `DATABASE_URL` to `.env.local`** (do not commit this file)

Append the line below to the existing `.env.local`:

```
DATABASE_URL=postgres://postgres:devpass@localhost:5432/fdlm_dev
```

Adjust to your local Postgres if different.

- [ ] **Step 6: Verify**

```bash
pnpm tsc:ci
pnpm lint
```

Both must pass. (drizzle-kit not yet exercised — that lands in Task 11.)

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml drizzle.config.ts .env.example
git commit -m "Added Drizzle, postgres-js, and db:* scripts"
```

---

## Task 2: Schema enums

**Files:**
- Create: `src/db/schema/enums.ts`

- [ ] **Step 1: Write `src/db/schema/enums.ts`**

```ts
/* Module imports -------------------------------------- */
import { pgEnum } from 'drizzle-orm/pg-core';

/* Module imports (project) ---------------------------- */
import { eventCategories } from 'types/eventCategories';

/* Enum definitions ------------------------------------ */
/** Mirrors the variants supported by src/components/ui/alert.tsx. */
export const alertVariantEnum = pgEnum('alert_variant', [
  'default',
  'destructive',
  'warning',
  'success',
]);

/** Mirrors Event['status'] in src/types/Event.ts. */
export const eventStatusEnum = pgEnum('event_status', [
  'canceled',
  'postponed',
  'rescheduled',
]);

/** Mirrors EventEmbedLinkType in src/types/Event.ts. */
export const embedPlatformEnum = pgEnum('embed_platform', [
  'instagram',
  'facebook',
]);

/**
 * Mirrors `eventCategories` in src/types/eventCategories.ts. Cast is needed
 * because pgEnum's type signature wants a non-empty tuple.
 */
export const eventCategoryEnum = pgEnum(
  'event_category',
  eventCategories as unknown as [string, ...string[]],
);
```

- [ ] **Step 2: Verify**

```bash
pnpm tsc:ci
pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add src/db/schema/enums.ts
git commit -m "Added Drizzle pgEnum definitions for events, alerts, embeds"
```

---

## Task 3: `editions` schema

**Files:**
- Create: `src/db/schema/editions.ts`

- [ ] **Step 1: Write `src/db/schema/editions.ts`**

```ts
/* Module imports -------------------------------------- */
import {
  pgTable,
  uuid,
  integer,
  text,
  date,
  timestamp,
} from 'drizzle-orm/pg-core';

/* Table definition ------------------------------------ */
export const editions = pgTable('editions', {
  id: uuid('id').primaryKey().defaultRandom(),
  year: integer('year').notNull().unique(),
  description: text('description'),
  dayOfFestival: date('day_of_festival').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/* Inferred types -------------------------------------- */
export type Edition = typeof editions.$inferSelect;
export type EditionInsert = typeof editions.$inferInsert;
```

- [ ] **Step 2: Verify**

```bash
pnpm tsc:ci
```

- [ ] **Step 3: Commit**

```bash
git add src/db/schema/editions.ts
git commit -m "Added editions table schema"
```

---

## Task 4: `events` schema with constraints

**Files:**
- Create: `src/db/schema/events.ts`

- [ ] **Step 1: Write `src/db/schema/events.ts`**

```ts
/* Module imports -------------------------------------- */
import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  timestamp,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';

/* Module imports (project) ---------------------------- */
import { editions } from './editions';
import {
  eventCategoryEnum,
  eventStatusEnum,
} from './enums';

/* Table definition ------------------------------------ */
export const events = pgTable(
  'events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    editionId: uuid('edition_id').notNull().references(() => editions.id, { onDelete: 'cascade' }),
    legacyId: text('legacy_id'),
    name: text('name'),
    description: text('description'),
    category: eventCategoryEnum('category'),
    status: eventStatusEnum('status'),
    genres: text('genres').array(),
    artists: text('artists').array(),
    priceText: text('price_text'),
    locationName: text('location_name').notNull(),
    locationAddress: text('location_address'),
    startTime: timestamp('start_time', { withTimezone: true }).notNull(),
    endTime: timestamp('end_time', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    legacyIdUq: uniqueIndex('events_edition_legacy_id_uq')
      .on(table.editionId, table.legacyId)
      .where(sql`legacy_id IS NOT NULL`),
    editionStartTimeIdx: index('events_edition_start_time_idx')
      .on(table.editionId, table.startTime, table.id),
    editionCategoryIdx: index('events_edition_category_idx')
      .on(table.editionId, table.category),
    timeCheck: check(
      'events_time_check',
      sql`end_time IS NULL OR end_time >= start_time`,
    ),
  }),
);

/* Inferred types -------------------------------------- */
export type EventRow = typeof events.$inferSelect;
export type EventInsert = typeof events.$inferInsert;
```

- [ ] **Step 2: Verify**

```bash
pnpm tsc:ci
```

- [ ] **Step 3: Commit**

```bash
git add src/db/schema/events.ts
git commit -m "Added events table schema with edition FK, unique legacyId, time check"
```

---

## Task 5: Child tables — links, embed links, alerts

**Files:**
- Create: `src/db/schema/eventLinks.ts`
- Create: `src/db/schema/eventEmbedLinks.ts`
- Create: `src/db/schema/eventAlerts.ts`

- [ ] **Step 1: Write `src/db/schema/eventLinks.ts`**

```ts
/* Module imports -------------------------------------- */
import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  integer,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';

/* Module imports (project) ---------------------------- */
import { events } from './events';

/* Table definition ------------------------------------ */
export const eventLinks = pgTable(
  'event_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    label: text('label').notNull(),
    position: integer('position').notNull(),
  },
  (table) => ({
    eventPositionUq: uniqueIndex('event_links_event_position_uq').on(table.eventId, table.position),
    eventUrlUq: uniqueIndex('event_links_event_url_uq').on(table.eventId, table.url),
    positionCheck: check('event_links_position_check', sql`position >= 0`),
  }),
);

export type EventLinkRow = typeof eventLinks.$inferSelect;
export type EventLinkInsert = typeof eventLinks.$inferInsert;
```

- [ ] **Step 2: Write `src/db/schema/eventEmbedLinks.ts`**

```ts
/* Module imports -------------------------------------- */
import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  integer,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';

/* Module imports (project) ---------------------------- */
import { events } from './events';
import { embedPlatformEnum } from './enums';

/* Table definition ------------------------------------ */
export const eventEmbedLinks = pgTable(
  'event_embed_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
    platform: embedPlatformEnum('platform').notNull(),
    url: text('url').notNull(),
    position: integer('position').notNull(),
  },
  (table) => ({
    eventPositionUq: uniqueIndex('event_embed_links_event_position_uq').on(table.eventId, table.position),
    eventUrlUq: uniqueIndex('event_embed_links_event_url_uq').on(table.eventId, table.url),
    positionCheck: check('event_embed_links_position_check', sql`position >= 0`),
  }),
);

export type EventEmbedLinkRow = typeof eventEmbedLinks.$inferSelect;
export type EventEmbedLinkInsert = typeof eventEmbedLinks.$inferInsert;
```

- [ ] **Step 3: Write `src/db/schema/eventAlerts.ts`**

```ts
/* Module imports -------------------------------------- */
import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  integer,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';

/* Module imports (project) ---------------------------- */
import { events } from './events';
import { alertVariantEnum } from './enums';

/* Table definition ------------------------------------ */
export const eventAlerts = pgTable(
  'event_alerts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
    variant: alertVariantEnum('variant').notNull(),
    title: text('title'),
    content: text('content').notNull(),
    position: integer('position').notNull(),
  },
  (table) => ({
    eventPositionUq: uniqueIndex('event_alerts_event_position_uq').on(table.eventId, table.position),
    positionCheck: check('event_alerts_position_check', sql`position >= 0`),
  }),
);

export type EventAlertRow = typeof eventAlerts.$inferSelect;
export type EventAlertInsert = typeof eventAlerts.$inferInsert;
```

- [ ] **Step 4: Verify**

```bash
pnpm tsc:ci
```

- [ ] **Step 5: Commit**

```bash
git add src/db/schema/eventLinks.ts src/db/schema/eventEmbedLinks.ts src/db/schema/eventAlerts.ts
git commit -m "Added event children schemas: links, embed links, alerts"
```

---

## Task 6: `general_alerts` schema

**Files:**
- Create: `src/db/schema/generalAlerts.ts`

- [ ] **Step 1: Write `src/db/schema/generalAlerts.ts`**

```ts
/* Module imports -------------------------------------- */
import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';

/* Module imports (project) ---------------------------- */
import { editions } from './editions';
import { alertVariantEnum } from './enums';

/* Table definition ------------------------------------ */
export const generalAlerts = pgTable(
  'general_alerts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    editionId: uuid('edition_id').notNull().references(() => editions.id, { onDelete: 'cascade' }),
    variant: alertVariantEnum('variant').notNull(),
    title: text('title'),
    content: text('content').notNull(),
    isPublished: boolean('is_published').notNull().default(false),
    position: integer('position').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    editionPositionUq: uniqueIndex('general_alerts_edition_position_uq').on(table.editionId, table.position),
    positionCheck: check('general_alerts_position_check', sql`position >= 0`),
  }),
);

export type GeneralAlertRow = typeof generalAlerts.$inferSelect;
export type GeneralAlertInsert = typeof generalAlerts.$inferInsert;
```

- [ ] **Step 2: Verify**

```bash
pnpm tsc:ci
```

- [ ] **Step 3: Commit**

```bash
git add src/db/schema/generalAlerts.ts
git commit -m "Added general_alerts table schema"
```

---

## Task 7: Drizzle relations + schema barrel

**Files:**
- Create: `src/db/schema/relations.ts`
- Create: `src/db/schema/index.ts`

- [ ] **Step 1: Write `src/db/schema/relations.ts`**

```ts
/* Module imports -------------------------------------- */
import { relations } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { editions } from './editions';
import { events } from './events';
import { eventLinks } from './eventLinks';
import { eventEmbedLinks } from './eventEmbedLinks';
import { eventAlerts } from './eventAlerts';
import { generalAlerts } from './generalAlerts';

/* Relations ------------------------------------------- */
export const editionsRelations = relations(editions, ({ many }) => ({
  events: many(events),
  generalAlerts: many(generalAlerts),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  edition: one(editions, {
    fields: [events.editionId],
    references: [editions.id],
  }),
  links: many(eventLinks),
  embedLinks: many(eventEmbedLinks),
  alerts: many(eventAlerts),
}));

export const eventLinksRelations = relations(eventLinks, ({ one }) => ({
  event: one(events, {
    fields: [eventLinks.eventId],
    references: [events.id],
  }),
}));

export const eventEmbedLinksRelations = relations(eventEmbedLinks, ({ one }) => ({
  event: one(events, {
    fields: [eventEmbedLinks.eventId],
    references: [events.id],
  }),
}));

export const eventAlertsRelations = relations(eventAlerts, ({ one }) => ({
  event: one(events, {
    fields: [eventAlerts.eventId],
    references: [events.id],
  }),
}));

export const generalAlertsRelations = relations(generalAlerts, ({ one }) => ({
  edition: one(editions, {
    fields: [generalAlerts.editionId],
    references: [editions.id],
  }),
}));
```

- [ ] **Step 2: Write `src/db/schema/index.ts`**

```ts
/* Module imports (project) ---------------------------- */
export * from './enums';
export * from './editions';
export * from './events';
export * from './eventLinks';
export * from './eventEmbedLinks';
export * from './eventAlerts';
export * from './generalAlerts';
export * from './relations';
```

- [ ] **Step 3: Verify**

```bash
pnpm tsc:ci
pnpm lint
```

- [ ] **Step 4: Commit**

```bash
git add src/db/schema/relations.ts src/db/schema/index.ts
git commit -m "Added Drizzle relations and schema barrel re-export"
```

---

## Task 8: Drizzle client (HMR-safe singleton)

**Files:**
- Create: `src/db/index.ts`

- [ ] **Step 1: Write `src/db/index.ts`**

```ts
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
```

- [ ] **Step 2: Verify**

```bash
pnpm tsc:ci
pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add src/db/index.ts
git commit -m "Added Drizzle client singleton with HMR-safe globalThis cache"
```

---

## Task 9: Generate initial migration

**Files:**
- Create: `src/db/migrations/0000_*.sql` (generated)
- Create: `src/db/migrations/meta/_journal.json` (generated)

- [ ] **Step 1: Generate the migration**

```bash
pnpm db:generate
```

Expected: drizzle-kit prints a summary and writes one `.sql` file plus a `meta/` folder under `src/db/migrations/`. The SQL contains `CREATE TYPE` for each enum, `CREATE TABLE` for each table, the UNIQUE indexes, the CHECK constraints, and the FOREIGN KEY constraints.

- [ ] **Step 2: Inspect the generated SQL and prepend the pgcrypto extension**

Open the generated `src/db/migrations/0000_*.sql` and add this line as the very first line so `gen_random_uuid()` works on any Postgres ≥ 9.4 (no-op on Postgres ≥ 13 where it's built-in):

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

- [ ] **Step 3: Verify the SQL contains the expected pieces**

```bash
grep -E "CREATE TABLE|CREATE TYPE|UNIQUE|CHECK|FOREIGN KEY" src/db/migrations/0000_*.sql
```

Expected output: at least one match for each of `CREATE TABLE` (×6), `CREATE TYPE` (×4 enums), `UNIQUE` (the various UNIQUE INDEXes / constraints), `CHECK` (×5: `events_time_check`, `event_links_position_check`, `event_embed_links_position_check`, `event_alerts_position_check`, `general_alerts_position_check`), `FOREIGN KEY` (×5).

- [ ] **Step 4: Commit**

```bash
git add src/db/migrations
git commit -m "Generated initial Drizzle migration for editions/events/alerts schema"
```

---

## Task 10: Apply migration to local Postgres + smoke check

**Files:** none

- [ ] **Step 1: Ensure Postgres is running and `DATABASE_URL` resolves**

```bash
docker ps --filter name=fdlm-pg --format '{{.Names}} {{.Status}}'
```

Expected: `fdlm-pg Up ...`. If empty, start the container from the plan's preamble.

- [ ] **Step 2: Apply migrations**

```bash
pnpm db:migrate
```

Expected: prints `Applying migration 0000_*` and exits 0.

- [ ] **Step 3: Smoke-check schema**

```bash
docker exec -i fdlm-pg psql -U postgres -d fdlm_dev -c "\dt"
```

Expected output includes all six tables: `editions`, `events`, `event_links`, `event_embed_links`, `event_alerts`, `general_alerts`.

```bash
docker exec -i fdlm-pg psql -U postgres -d fdlm_dev -c "\dT"
```

Expected: lists the four enums.

```bash
docker exec -i fdlm-pg psql -U postgres -d fdlm_dev -c "\d events"
```

Expected: shows the `events_time_check` CHECK, indexes, and FK to `editions`.

- [ ] **Step 4: No commit** (migration files were committed in Task 9; this task only applies them).

---

## Task 11: Europe/Paris time normalizer

**Files:**
- Create: `src/db/seed/normalizeTime.ts`

- [ ] **Step 1: Write `src/db/seed/normalizeTime.ts`**

```ts
/* Module imports -------------------------------------- */
import { fromZonedTime } from 'date-fns-tz';

/* External variables ---------------------------------- */
const PARIS_ZONE: string = 'Europe/Paris';

/* Helpers --------------------------------------------- */
/**
 * Bare ISO strings in the fixtures (e.g. `2024-06-21T19:00:00`) carry no
 * timezone information and are interpreted in the runtime's local timezone
 * by `new Date(...)`. The festival is in Bordeaux, so we treat any bare
 * string as wall-clock time in Europe/Paris and convert to a UTC `Date`.
 *
 * Strings with explicit offsets (e.g. `2023-06-21T18:00:00+02:00`) and
 * already-constructed `Date` instances are passed through unchanged after
 * reserialization.
 */
export const normalizeToParis = (input: Date | string): Date => {
  if(typeof input === 'string') {
    const hasOffset: boolean = /([+-]\d{2}:?\d{2}|Z)$/.test(input);
    if(hasOffset) {
      return new Date(input);
    }
    return fromZonedTime(input, PARIS_ZONE);
  }
  // `Date` instances built from bare strings were created in local TZ.
  // We can't recover the original wall-clock intent without re-parsing,
  // so re-extract the local components and treat them as Paris wall-clock.
  const yyyy: string = String(input.getFullYear()).padStart(4, '0');
  const mm: string = String(input.getMonth() + 1).padStart(2, '0');
  const dd: string = String(input.getDate()).padStart(2, '0');
  const hh: string = String(input.getHours()).padStart(2, '0');
  const mi: string = String(input.getMinutes()).padStart(2, '0');
  const ss: string = String(input.getSeconds()).padStart(2, '0');
  const wallClock: string = `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
  return fromZonedTime(wallClock, PARIS_ZONE);
};
```

- [ ] **Step 2: Verify**

```bash
pnpm tsc:ci
pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add src/db/seed/normalizeTime.ts
git commit -m "Added Europe/Paris time normalizer for seed input"
```

---

## Task 12: Seed script

**Files:**
- Create: `src/db/seed/index.ts`

- [ ] **Step 1: Write `src/db/seed/index.ts`**

```ts
/**
 * Seed bootstrap script. Imports the on-disk fixtures and populates the DB.
 *
 * Run once after the first deploy. Re-running it on an existing DB will
 * overwrite event-row content and any link/embed/alert content at matching
 * positions (Strategy B: position-keyed upsert + trailing delete). Child
 * row UUIDs are preserved across re-seeds. Backoffice edits to seeded
 * events will be overwritten if this script is re-run.
 *
 * Use `pnpm db:reset` (drop + migrate + seed) only in development.
 */

/* Framework imports ----------------------------------- */
import { eq, sql } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../index';
import {
  editions,
  events,
  eventLinks,
  eventEmbedLinks,
  eventAlerts,
} from '../schema';
import { normalizeToParis } from './normalizeTime';
import { events as events2023 } from 'fixtures/events-2023';
import { events as events2024 } from 'fixtures/events-2024';

/* Type imports ---------------------------------------- */
import type { Event, EventLink, EventEmbedLink, EventAlert } from 'types/Event';

/* External variables ---------------------------------- */
interface EditionSeed {
  year: number;
  description: string | null;
  dayOfFestival: string;
  fixture: Event[];
}

const EDITIONS: EditionSeed[] = [
  {
    year: 2023,
    description: null,
    dayOfFestival: '2023-06-21',
    fixture: events2023,
  },
  {
    year: 2024,
    description: null,
    dayOfFestival: '2024-06-21',
    fixture: events2024,
  },
];

/* Helpers --------------------------------------------- */
const assertString = (value: unknown, context: string): string => {
  if(typeof value !== 'string') {
    throw new Error(`Expected string for ${context}, got ${typeof value}: ${String(value)}`);
  }
  return value;
};

const upsertEdition = async (edition: EditionSeed): Promise<string> => {
  const rows = await db
    .insert(editions)
    .values({
      year: edition.year,
      description: edition.description,
      dayOfFestival: edition.dayOfFestival,
    })
    .onConflictDoUpdate({
      target: editions.year,
      set: {
        description: edition.description,
        dayOfFestival: edition.dayOfFestival,
        updatedAt: sql`NOW()`,
      },
    })
    .returning({ id: editions.id });

  if(rows.length === 0 || rows[0] === undefined) {
    throw new Error(`Failed to upsert edition ${edition.year}`);
  }
  return rows[0].id;
};

const upsertEvent = async (
  fixtureEvent: Event,
  editionId: string,
): Promise<string> => {
  const description: string | null =
    fixtureEvent.description === undefined ? null : assertString(fixtureEvent.description, `event ${fixtureEvent.id} description`);
  const priceText: string | null =
    fixtureEvent.price === undefined ? null : String(fixtureEvent.price);
  const startTime: Date = normalizeToParis(fixtureEvent.startTime);
  const endTime: Date | null =
    fixtureEvent.endTime === undefined ? null : normalizeToParis(fixtureEvent.endTime);

  if(fixtureEvent.location.coords !== undefined) {
    console.warn(`[seed] Ignoring location.coords for legacy event ${fixtureEvent.id} — coord columns deferred to Spec 3.`);
  }

  const rows = await db
    .insert(events)
    .values({
      editionId,
      legacyId: fixtureEvent.id,
      name: fixtureEvent.name ?? null,
      description,
      category: fixtureEvent.category ?? null,
      status: fixtureEvent.status ?? null,
      genres: fixtureEvent.genres ?? null,
      artists: fixtureEvent.artists ?? null,
      priceText,
      locationName: fixtureEvent.location.name,
      locationAddress: fixtureEvent.location.addressStr ?? null,
      startTime,
      endTime,
    })
    .onConflictDoUpdate({
      target: [events.editionId, events.legacyId],
      set: {
        name: fixtureEvent.name ?? null,
        description,
        category: fixtureEvent.category ?? null,
        status: fixtureEvent.status ?? null,
        genres: fixtureEvent.genres ?? null,
        artists: fixtureEvent.artists ?? null,
        priceText,
        locationName: fixtureEvent.location.name,
        locationAddress: fixtureEvent.location.addressStr ?? null,
        startTime,
        endTime,
        updatedAt: sql`NOW()`,
      },
    })
    .returning({ id: events.id });

  if(rows.length === 0 || rows[0] === undefined) {
    throw new Error(`Failed to upsert event ${fixtureEvent.id}`);
  }
  return rows[0].id;
};

const syncLinks = async (eventId: string, links: EventLink[] | undefined): Promise<void> => {
  const list: EventLink[] = links ?? [];
  for(let i = 0; i < list.length; i++) {
    const link: EventLink | undefined = list[i];
    if(link === undefined) continue;
    const label: string = assertString(link.label, `link.label for event ${eventId} position ${i}`);
    await db
      .insert(eventLinks)
      .values({ eventId, url: link.url, label, position: i })
      .onConflictDoUpdate({
        target: [eventLinks.eventId, eventLinks.position],
        set: { url: link.url, label },
      });
  }
  await db.execute(
    sql`DELETE FROM event_links WHERE event_id = ${eventId} AND position >= ${list.length}`,
  );
};

const syncEmbedLinks = async (
  eventId: string,
  embedLinks: EventEmbedLink[] | undefined,
): Promise<void> => {
  const list: EventEmbedLink[] = embedLinks ?? [];
  for(let i = 0; i < list.length; i++) {
    const embed: EventEmbedLink | undefined = list[i];
    if(embed === undefined) continue;
    await db
      .insert(eventEmbedLinks)
      .values({ eventId, platform: embed.type, url: embed.url, position: i })
      .onConflictDoUpdate({
        target: [eventEmbedLinks.eventId, eventEmbedLinks.position],
        set: { platform: embed.type, url: embed.url },
      });
  }
  await db.execute(
    sql`DELETE FROM event_embed_links WHERE event_id = ${eventId} AND position >= ${list.length}`,
  );
};

const syncAlerts = async (
  eventId: string,
  alerts: EventAlert[] | undefined,
): Promise<void> => {
  const list: EventAlert[] = alerts ?? [];
  const validVariants: readonly string[] = [
    'default', 'destructive', 'warning', 'success',
  ];
  for(let i = 0; i < list.length; i++) {
    const alert: EventAlert | undefined = list[i];
    if(alert === undefined) continue;
    const variant: string = alert.type ?? 'default';
    if(!validVariants.includes(variant)) {
      throw new Error(
        `Unknown alert variant "${variant}" on event ${eventId} position ${i}`,
      );
    }
    await db
      .insert(eventAlerts)
      .values({
        eventId,
        variant: variant as typeof validVariants[number] as 'default' | 'destructive' | 'warning' | 'success',
        title: alert.title ?? null,
        content: alert.content,
        position: i,
      })
      .onConflictDoUpdate({
        target: [eventAlerts.eventId, eventAlerts.position],
        set: {
          variant: variant as 'default' | 'destructive' | 'warning' | 'success',
          title: alert.title ?? null,
          content: alert.content,
        },
      });
  }
  await db.execute(
    sql`DELETE FROM event_alerts WHERE event_id = ${eventId} AND position >= ${list.length}`,
  );
};

/* Main ------------------------------------------------ */
const main = async (): Promise<void> => {
  for(const edition of EDITIONS) {
    const editionId: string = await upsertEdition(edition);
    let upsertedEvents: number = 0;
    let childRows: number = 0;
    for(const fixtureEvent of edition.fixture) {
      const eventId: string = await upsertEvent(fixtureEvent, editionId);
      upsertedEvents += 1;
      await syncLinks(eventId, fixtureEvent.links);
      await syncEmbedLinks(eventId, fixtureEvent.embedLinks);
      await syncAlerts(eventId, fixtureEvent.alerts);
      childRows +=
        (fixtureEvent.links?.length ?? 0) +
        (fixtureEvent.embedLinks?.length ?? 0) +
        (fixtureEvent.alerts?.length ?? 0);
    }
    console.log(
      `[seed] Edition ${edition.year}: ${upsertedEvents} events upserted, ${childRows} child rows upserted.`,
    );
  }
  console.log('[seed] Done.');
};

main()
  .catch(
    (error) => {
      console.error('[seed] Failed:', error);
      process.exit(1);
    },
  )
  .finally(
    () => {
      process.exit(0);
    },
  );
```

- [ ] **Step 2: Verify**

```bash
pnpm tsc:ci
pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add src/db/seed/index.ts
git commit -m "Added idempotent seed (Strategy B, upserts editions + events + children)"
```

---

## Task 13: Run seed + verify row counts

**Files:** none

- [ ] **Step 1: Run the seed**

```bash
pnpm db:seed
```

Expected log:
```
[seed] Edition 2023: ~40 events upserted, ~N child rows upserted.
[seed] Edition 2024: ~44 events upserted, ~M child rows upserted.
[seed] Done.
```

- [ ] **Step 2: Verify counts**

```bash
docker exec -i fdlm-pg psql -U postgres -d fdlm_dev -c "SELECT year, count(*) FROM editions e JOIN events ev ON ev.edition_id = e.id GROUP BY year ORDER BY year;"
```

Expected: two rows, one per year, totals matching the fixture arrays (2023 ≈ 40 events, 2024 ≈ 44 events).

- [ ] **Step 3: Verify timezone normalization**

```bash
docker exec -i fdlm-pg psql -U postgres -d fdlm_dev -c "SELECT name, start_time AT TIME ZONE 'Europe/Paris' AS paris_wall_clock FROM events WHERE name LIKE 'Chef & the gang%';"
```

Expected: `paris_wall_clock` shows `2024-06-21 20:00:00` (matching the bare ISO string `2024-06-21T20:00:00` in the fixture).

- [ ] **Step 4: Idempotency check**

```bash
pnpm db:seed
docker exec -i fdlm-pg psql -U postgres -d fdlm_dev -c "SELECT year, count(*) FROM editions e JOIN events ev ON ev.edition_id = e.id GROUP BY year ORDER BY year;"
```

Expected: counts unchanged. Logs show same numbers as the first run.

- [ ] **Step 5: No commit.**

---

## Task 14: Query layer scaffolding + `listEditions`

**Files:**
- Create: `src/db/queries/index.ts`
- Create: `src/db/queries/listEditions.ts`
- Create: `src/db/queries/types.ts`

- [ ] **Step 1: Write `src/db/queries/types.ts`**

```ts
/* Type imports ---------------------------------------- */
import type { EventCategory } from 'types/eventCategories';

/* Shared DTO types ------------------------------------ */
export interface EditionDto {
  id: string;
  year: number;
  description: string | null;
}

export interface EditionWithMetaDto extends EditionDto {
  dayOfFestival: string; // ISO date 'YYYY-MM-DD'
}

export interface GeneralAlertDto {
  id: string;
  variant: AlertVariant;
  title: string | null;
  content: string;
  position: number;
}

export type AlertVariant = 'default' | 'destructive' | 'warning' | 'success';

export interface EventSummaryDto {
  id: string;
  editionId: string;
  name: string | null;
  category: EventCategory | null;
  status: EventStatus | null;
  genres: string[] | null;
  artists: string[] | null;
  startTime: string;     // ISO
  endTime: string | null;
  priceText: string | null;
  location: {
    name: string;
    address: string | null;
  };
  hasDescription: boolean;
  linkCount: number;
  embedCount: number;
  alertCount: number;
}

export type EventStatus = 'canceled' | 'postponed' | 'rescheduled';

export interface EventDetailDto {
  id: string;
  editionId: string;
  description: string | null;
  links: Array<{ url: string; label: string }>;
  embedLinks: Array<{ platform: 'instagram' | 'facebook'; url: string }>;
  alerts: Array<{ variant: AlertVariant; title: string | null; content: string }>;
}
```

- [ ] **Step 2: Write `src/db/queries/listEditions.ts`**

```ts
/* Module imports -------------------------------------- */
import { desc } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../index';
import { editions } from '../schema';

/* Type imports ---------------------------------------- */
import type { EditionDto } from './types';

/* Query ----------------------------------------------- */
export const listEditions = async (): Promise<EditionDto[]> => {
  const rows = await db
    .select({
      id: editions.id,
      year: editions.year,
      description: editions.description,
    })
    .from(editions)
    .orderBy(desc(editions.year));
  return rows;
};
```

- [ ] **Step 3: Write `src/db/queries/index.ts`**

```ts
export * from './types';
export * from './listEditions';
```

- [ ] **Step 4: Verify**

```bash
pnpm tsc:ci
pnpm lint
```

- [ ] **Step 5: Commit**

```bash
git add src/db/queries/types.ts src/db/queries/listEditions.ts src/db/queries/index.ts
git commit -m "Added query DTO types and listEditions"
```

---

## Task 15: `GET /api/editions` route

**Files:**
- Create: `src/app/api/editions/route.ts`

- [ ] **Step 1: Write `src/app/api/editions/route.ts`**

```ts
/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';

/* Module imports (project) ---------------------------- */
import { listEditions } from 'db/queries';

/* Route ----------------------------------------------- */
export const GET = async (): Promise<NextResponse> => {
  try {
    const list = await listEditions();
    return NextResponse.json(
      { editions: list },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      },
    );
  } catch(error) {
    console.error('[api/editions] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
```

- [ ] **Step 2: Verify**

```bash
pnpm tsc:ci
pnpm lint
```

- [ ] **Step 3: Smoke-test via curl**

In one terminal:

```bash
pnpm dev
```

In another:

```bash
curl -s http://localhost:3000/api/editions | head -200
```

Expected: JSON `{"editions":[{"id":"...","year":2024,...},{"id":"...","year":2023,...}]}`. Years in descending order.

Stop the dev server with Ctrl-C in the first terminal.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/editions/route.ts
git commit -m "Added GET /api/editions"
```

---

## Task 16: `getEdition` query + `GET /api/editions/[year]` route

**Files:**
- Create: `src/db/queries/getEdition.ts`
- Create: `src/app/api/editions/[year]/route.ts`
- Modify: `src/db/queries/index.ts`

- [ ] **Step 1: Write `src/db/queries/getEdition.ts`**

```ts
/* Module imports -------------------------------------- */
import { and, asc, eq } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../index';
import { editions, generalAlerts } from '../schema';

/* Type imports ---------------------------------------- */
import type { EditionWithMetaDto, GeneralAlertDto } from './types';

/* Query ----------------------------------------------- */
export interface GetEditionResult {
  edition: EditionWithMetaDto;
  generalAlerts: GeneralAlertDto[];
}

export const getEdition = async (year: number): Promise<GetEditionResult | null> => {
  const editionRows = await db
    .select({
      id: editions.id,
      year: editions.year,
      description: editions.description,
      dayOfFestival: editions.dayOfFestival,
    })
    .from(editions)
    .where(eq(editions.year, year))
    .limit(1);

  const edition = editionRows[0];
  if(edition === undefined) {
    return null;
  }

  const alertRows = await db
    .select({
      id: generalAlerts.id,
      variant: generalAlerts.variant,
      title: generalAlerts.title,
      content: generalAlerts.content,
      position: generalAlerts.position,
    })
    .from(generalAlerts)
    .where(
      and(
        eq(generalAlerts.editionId, edition.id),
        eq(generalAlerts.isPublished, true),
      ),
    )
    .orderBy(asc(generalAlerts.position));

  return { edition, generalAlerts: alertRows };
};
```

- [ ] **Step 2: Update `src/db/queries/index.ts`**

```ts
export * from './types';
export * from './listEditions';
export * from './getEdition';
```

- [ ] **Step 3: Write `src/app/api/editions/[year]/route.ts`**

```ts
/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';
import { z } from 'zod';

/* Module imports (project) ---------------------------- */
import { getEdition } from 'db/queries';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* Schema ---------------------------------------------- */
const paramsSchema = z.object({
  year: z.string().regex(/^\d{4}$/),
});

/* Route ----------------------------------------------- */
export const GET = async (
  _request: NextRequest,
  { params }: { params: Promise<{ year: string }> },
): Promise<NextResponse> => {
  const raw = await params;
  const parsed = paramsSchema.safeParse(raw);
  if(!parsed.success) {
    return NextResponse.json({ error: 'invalid_request', issues: parsed.error.issues }, { status: 400 });
  }
  const year: number = Number(parsed.data.year);
  try {
    const result = await getEdition(year);
    if(result === null) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
  } catch(error) {
    console.error(`[api/editions/${year}] internal error:`, error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
```

- [ ] **Step 4: Verify**

```bash
pnpm tsc:ci
pnpm lint
```

- [ ] **Step 5: Curl-test**

```bash
pnpm dev
```

In another terminal:

```bash
curl -s http://localhost:3000/api/editions/2024 | head -50
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/editions/9999
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/editions/abc
```

Expected: first returns JSON with `edition` + `generalAlerts: []`; second returns `404`; third returns `400`.

Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add src/db/queries/getEdition.ts src/db/queries/index.ts src/app/api/editions/\[year\]/route.ts
git commit -m "Added GET /api/editions/[year] and getEdition query"
```

---

## Task 17: `listEditionEvents` query + `GET /api/editions/[year]/events` route

**Files:**
- Create: `src/db/queries/listEditionEvents.ts`
- Create: `src/app/api/editions/[year]/events/route.ts`
- Modify: `src/db/queries/index.ts`

- [ ] **Step 1: Write `src/db/queries/listEditionEvents.ts`**

```ts
/* Module imports -------------------------------------- */
import { and, asc, eq, gt, ilike, inArray, lt, or, sql } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../index';
import { editions, events, eventLinks, eventEmbedLinks, eventAlerts } from '../schema';

/* Type imports ---------------------------------------- */
import type { EventSummaryDto, EventStatus } from './types';
import type { EventCategory } from 'types/eventCategories';

/* Cursor encoding ------------------------------------- */
interface Cursor {
  startTime: string;
  id: string;
}

export const encodeCursor = (c: Cursor): string =>
  Buffer.from(JSON.stringify(c), 'utf-8').toString('base64url');

export const decodeCursor = (raw: string): Cursor | null => {
  try {
    const json: string = Buffer.from(raw, 'base64url').toString('utf-8');
    const parsed: unknown = JSON.parse(json);
    if(
      typeof parsed === 'object' && parsed !== null &&
      'startTime' in parsed && typeof (parsed as Record<string, unknown>).startTime === 'string' &&
      'id' in parsed && typeof (parsed as Record<string, unknown>).id === 'string'
    ) {
      return parsed as Cursor;
    }
    return null;
  } catch {
    return null;
  }
};

/* Query inputs ---------------------------------------- */
export interface ListEditionEventsInput {
  year: number;
  category?: EventCategory;
  q?: string;
  genre?: string;
  status?: EventStatus;
  ids?: string[];
  cursor?: string;
  limit: number;
}

export interface ListEditionEventsResult {
  events: EventSummaryDto[];
  nextCursor: string | null;
}

/* Query ----------------------------------------------- */
export const listEditionEvents = async (input: ListEditionEventsInput): Promise<ListEditionEventsResult | null> => {
  const editionRows = await db
    .select({ id: editions.id })
    .from(editions)
    .where(eq(editions.year, input.year))
    .limit(1);
  const edition = editionRows[0];
  if(edition === undefined) {
    return null;
  }

  const cursor: Cursor | null = input.cursor !== undefined ? decodeCursor(input.cursor) : null;

  const linkCountSql = sql<number>`(SELECT COUNT(*)::int FROM ${eventLinks} WHERE ${eventLinks.eventId} = ${events.id})`;
  const embedCountSql = sql<number>`(SELECT COUNT(*)::int FROM ${eventEmbedLinks} WHERE ${eventEmbedLinks.eventId} = ${events.id})`;
  const alertCountSql = sql<number>`(SELECT COUNT(*)::int FROM ${eventAlerts} WHERE ${eventAlerts.eventId} = ${events.id})`;
  const hasDescriptionSql = sql<boolean>`(${events.description} IS NOT NULL AND ${events.description} <> '')`;

  const filters = [
    eq(events.editionId, edition.id),
  ];
  if(input.category !== undefined) {
    filters.push(eq(events.category, input.category));
  }
  if(input.status !== undefined) {
    filters.push(eq(events.status, input.status));
  }
  if(input.genre !== undefined && input.genre.length > 0) {
    filters.push(sql`${events.genres} @> ARRAY[${input.genre}]::text[]`);
  }
  if(input.q !== undefined && input.q.length > 0) {
    const like: string = `%${input.q}%`;
    const qFilter = or(
      ilike(events.name, like),
      ilike(events.locationName, like),
      sql`array_to_string(${events.artists}, ' ') ILIKE ${like}`,
    );
    if(qFilter !== undefined) filters.push(qFilter);
  }
  if(input.ids !== undefined && input.ids.length > 0) {
    filters.push(inArray(events.id, input.ids));
  }
  if(cursor !== null) {
    filters.push(
      or(
        gt(events.startTime, new Date(cursor.startTime)),
        and(eq(events.startTime, new Date(cursor.startTime)), gt(events.id, cursor.id)),
      )!,
    );
  }

  const rows = await db
    .select({
      id: events.id,
      editionId: events.editionId,
      name: events.name,
      category: events.category,
      status: events.status,
      genres: events.genres,
      artists: events.artists,
      startTime: events.startTime,
      endTime: events.endTime,
      priceText: events.priceText,
      locationName: events.locationName,
      locationAddress: events.locationAddress,
      linkCount: linkCountSql,
      embedCount: embedCountSql,
      alertCount: alertCountSql,
      hasDescription: hasDescriptionSql,
    })
    .from(events)
    .where(and(...filters))
    .orderBy(asc(events.startTime), asc(events.id))
    .limit(input.limit + 1);

  const hasMore: boolean = rows.length > input.limit;
  const page = hasMore ? rows.slice(0, input.limit) : rows;
  const last = page[page.length - 1];
  const nextCursor: string | null =
    hasMore && last !== undefined
      ? encodeCursor({ startTime: last.startTime.toISOString(), id: last.id })
      : null;

  const summaries: EventSummaryDto[] = page.map(
    (row) => ({
      id: row.id,
      editionId: row.editionId,
      name: row.name,
      category: row.category as EventCategory | null,
      status: row.status as EventStatus | null,
      genres: row.genres,
      artists: row.artists,
      startTime: row.startTime.toISOString(),
      endTime: row.endTime === null ? null : row.endTime.toISOString(),
      priceText: row.priceText,
      location: {
        name: row.locationName,
        address: row.locationAddress,
      },
      hasDescription: row.hasDescription,
      linkCount: row.linkCount,
      embedCount: row.embedCount,
      alertCount: row.alertCount,
    }),
  );

  return { events: summaries, nextCursor };
};
```

- [ ] **Step 2: Update `src/db/queries/index.ts`**

```ts
export * from './types';
export * from './listEditions';
export * from './getEdition';
export * from './listEditionEvents';
```

- [ ] **Step 3: Write `src/app/api/editions/[year]/events/route.ts`**

```ts
/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';
import { z } from 'zod';

/* Module imports (project) ---------------------------- */
import { listEditionEvents } from 'db/queries';
import { eventCategories } from 'types/eventCategories';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* Schema ---------------------------------------------- */
const paramsSchema = z.object({
  year: z.string().regex(/^\d{4}$/),
});

const querySchema = z.object({
  category: z.enum(eventCategories as readonly [string, ...string[]]).optional(),
  q: z.string().trim().max(200).optional(),
  genre: z.string().trim().max(80).optional(),
  status: z.enum(['canceled', 'postponed', 'rescheduled']).optional(),
  ids: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

const uuidRegex: RegExp = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* Route ----------------------------------------------- */
export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ year: string }> },
): Promise<NextResponse> => {
  const rawParams = await params;
  const parsedParams = paramsSchema.safeParse(rawParams);
  if(!parsedParams.success) {
    return NextResponse.json({ error: 'invalid_request', issues: parsedParams.error.issues }, { status: 400 });
  }

  const url: URL = new URL(request.url);
  const searchParams: Record<string, string> = Object.fromEntries(url.searchParams);
  const parsedQuery = querySchema.safeParse(searchParams);
  if(!parsedQuery.success) {
    return NextResponse.json({ error: 'invalid_request', issues: parsedQuery.error.issues }, { status: 400 });
  }

  let ids: string[] | undefined;
  if(parsedQuery.data.ids !== undefined && parsedQuery.data.ids.length > 0) {
    ids = parsedQuery.data.ids.split(',').map((s) => s.trim());
    if(ids.length > 200) {
      return NextResponse.json({ error: 'invalid_request', issues: [{ message: 'ids too long' }] }, { status: 400 });
    }
    for(const id of ids) {
      if(!uuidRegex.test(id)) {
        return NextResponse.json({ error: 'invalid_request', issues: [{ message: `invalid uuid: ${id}` }] }, { status: 400 });
      }
    }
  }

  const year: number = Number(parsedParams.data.year);

  try {
    const result = await listEditionEvents({
      year,
      category: parsedQuery.data.category as never,
      q: parsedQuery.data.q,
      genre: parsedQuery.data.genre,
      status: parsedQuery.data.status,
      ids,
      cursor: parsedQuery.data.cursor,
      limit: parsedQuery.data.limit,
    });
    if(result === null) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
  } catch(error) {
    console.error(`[api/editions/${year}/events] internal error:`, error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
```

- [ ] **Step 4: Verify**

```bash
pnpm tsc:ci
pnpm lint
```

- [ ] **Step 5: Curl-test**

```bash
pnpm dev
```

```bash
curl -s 'http://localhost:3000/api/editions/2024/events?limit=200' | python3 -c "import sys, json; d=json.load(sys.stdin); print('count', len(d['events']), 'first', d['events'][0]['name']); print('cursor', d['nextCursor'])"
curl -s 'http://localhost:3000/api/editions/2024/events?category=Centre%20ville&limit=5' | python3 -c "import sys, json; d=json.load(sys.stdin); print('count', len(d['events']))"
curl -s 'http://localhost:3000/api/editions/2024/events?q=Bordeaux&limit=5' | python3 -c "import sys, json; d=json.load(sys.stdin); print('count', len(d['events']))"
curl -s -o /dev/null -w "%{http_code}\n" 'http://localhost:3000/api/editions/9999/events'
curl -s -o /dev/null -w "%{http_code}\n" 'http://localhost:3000/api/editions/2024/events?limit=999'
```

Expected: first prints something like `count 44 first ...`; second + third print counts ≥ 1; fourth returns `404`; fifth returns `400`.

Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add src/db/queries/listEditionEvents.ts src/db/queries/index.ts 'src/app/api/editions/[year]/events/route.ts'
git commit -m "Added GET /api/editions/[year]/events with filters and keyset cursor"
```

---

## Task 18: `getEventDetail` query + `GET /api/events/[eventId]` route

**Files:**
- Create: `src/db/queries/getEventDetail.ts`
- Create: `src/app/api/events/[eventId]/route.ts`
- Modify: `src/db/queries/index.ts`

- [ ] **Step 1: Write `src/db/queries/getEventDetail.ts`**

```ts
/* Module imports -------------------------------------- */
import { asc, eq } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../index';
import { events, eventLinks, eventEmbedLinks, eventAlerts } from '../schema';

/* Type imports ---------------------------------------- */
import type { EventDetailDto, AlertVariant } from './types';

/* Query ----------------------------------------------- */
export const getEventDetail = async (eventId: string): Promise<EventDetailDto | null> => {
  const eventRows = await db
    .select({
      id: events.id,
      editionId: events.editionId,
      description: events.description,
    })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  const event = eventRows[0];
  if(event === undefined) {
    return null;
  }

  const [linkRows, embedRows, alertRows] = await Promise.all([
    db
      .select({ url: eventLinks.url, label: eventLinks.label, position: eventLinks.position })
      .from(eventLinks)
      .where(eq(eventLinks.eventId, eventId))
      .orderBy(asc(eventLinks.position)),
    db
      .select({ platform: eventEmbedLinks.platform, url: eventEmbedLinks.url, position: eventEmbedLinks.position })
      .from(eventEmbedLinks)
      .where(eq(eventEmbedLinks.eventId, eventId))
      .orderBy(asc(eventEmbedLinks.position)),
    db
      .select({ variant: eventAlerts.variant, title: eventAlerts.title, content: eventAlerts.content, position: eventAlerts.position })
      .from(eventAlerts)
      .where(eq(eventAlerts.eventId, eventId))
      .orderBy(asc(eventAlerts.position)),
  ]);

  return {
    id: event.id,
    editionId: event.editionId,
    description: event.description,
    links: linkRows.map(({ url, label }) => ({ url, label })),
    embedLinks: embedRows.map(({ platform, url }) => ({ platform: platform as 'instagram' | 'facebook', url })),
    alerts: alertRows.map(({ variant, title, content }) => ({ variant: variant as AlertVariant, title, content })),
  };
};
```

- [ ] **Step 2: Update `src/db/queries/index.ts`**

```ts
export * from './types';
export * from './listEditions';
export * from './getEdition';
export * from './listEditionEvents';
export * from './getEventDetail';
```

- [ ] **Step 3: Write `src/app/api/events/[eventId]/route.ts`**

```ts
/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';
import { z } from 'zod';

/* Module imports (project) ---------------------------- */
import { getEventDetail } from 'db/queries';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* Schema ---------------------------------------------- */
const paramsSchema = z.object({
  eventId: z.string().uuid(),
});

/* Route ----------------------------------------------- */
export const GET = async (
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
): Promise<NextResponse> => {
  const raw = await params;
  const parsed = paramsSchema.safeParse(raw);
  if(!parsed.success) {
    return NextResponse.json({ error: 'invalid_request', issues: parsed.error.issues }, { status: 400 });
  }
  try {
    const detail = await getEventDetail(parsed.data.eventId);
    if(detail === null) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ event: detail }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
  } catch(error) {
    console.error(`[api/events/${parsed.data.eventId}] internal error:`, error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
```

- [ ] **Step 4: Verify**

```bash
pnpm tsc:ci
pnpm lint
```

- [ ] **Step 5: Curl-test**

```bash
pnpm dev
```

```bash
EVENT_ID=$(curl -s 'http://localhost:3000/api/editions/2024/events?limit=1' | python3 -c "import sys, json; print(json.load(sys.stdin)['events'][0]['id'])")
echo "EVENT_ID=$EVENT_ID"
curl -s "http://localhost:3000/api/events/$EVENT_ID" | head -200
curl -s -o /dev/null -w "%{http_code}\n" 'http://localhost:3000/api/events/00000000-0000-0000-0000-000000000000'
curl -s -o /dev/null -w "%{http_code}\n" 'http://localhost:3000/api/events/not-a-uuid'
```

Expected: detail JSON for the real event; `404` for the random UUID; `400` for the non-UUID string.

Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add src/db/queries/getEventDetail.ts src/db/queries/index.ts 'src/app/api/events/[eventId]/route.ts'
git commit -m "Added GET /api/events/[eventId] and getEventDetail query"
```

---

## Task 19: New root page — redirect to latest edition

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace `src/app/page.tsx`**

This **replaces** the existing client-side page that imports the 2024 fixture. The page becomes a server component that picks the latest edition and redirects.

```tsx
/* Framework imports ----------------------------------- */
import { redirect } from 'next/navigation';
import { desc } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from 'db';
import { editions } from 'db/schema';

/* RootPage component ---------------------------------- */
const RootPage = async (): Promise<React.ReactElement> => {
  const rows = await db
    .select({ year: editions.year })
    .from(editions)
    .orderBy(desc(editions.year))
    .limit(1);

  const latest = rows[0];
  if(latest === undefined) {
    return (
      <div className="flex flex-col items-center justify-center w-full p-8 text-center">
        <h1 className="text-2xl font-semibold pb-4">
          Aucune édition disponible
        </h1>
        <p className="text-muted-foreground">
          {'Aucune édition de la Fête de la musique n\'est encore enregistrée.'}
        </p>
      </div>
    );
  }

  redirect(`/${latest.year}`);
};

/* Export RootPage component --------------------------- */
export default RootPage;
```

- [ ] **Step 2: Verify**

```bash
pnpm tsc:ci
pnpm lint
```

`pnpm dev` won't be useful yet — the `/[year]` route is added in the next task. Skip the visual check until Task 20.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "Rewrote root page as server component redirecting to latest edition"
```

---

## Task 20: `/[year]/page.tsx` — move + swap fixture for fetch

**Files:**
- Create: `src/app/[year]/page.tsx`
- Create: `src/app/[year]/types.ts` (front-end view types)

- [ ] **Step 1: Write `src/app/[year]/types.ts`**

These are the page's local view types. They mirror the API DTOs without duplicating cross-cutting Drizzle types.

```ts
/* Type imports ---------------------------------------- */
import type { EventCategory } from 'types/eventCategories';

/* View-layer types ------------------------------------ */
export type AlertVariant = 'default' | 'destructive' | 'warning' | 'success';
export type EventStatus = 'canceled' | 'postponed' | 'rescheduled';

export interface EditionView {
  id: string;
  year: number;
  description: string | null;
  dayOfFestival: string;
}

export interface GeneralAlertView {
  id: string;
  variant: AlertVariant;
  title: string | null;
  content: string;
  position: number;
}

export interface EventSummaryView {
  id: string;
  editionId: string;
  name: string | null;
  category: EventCategory | null;
  status: EventStatus | null;
  genres: string[] | null;
  artists: string[] | null;
  startTime: string;
  endTime: string | null;
  priceText: string | null;
  location: { name: string; address: string | null };
  hasDescription: boolean;
  linkCount: number;
  embedCount: number;
  alertCount: number;
}

export interface EventDetailView {
  id: string;
  description: string | null;
  links: Array<{ url: string; label: string }>;
  embedLinks: Array<{ platform: 'instagram' | 'facebook'; url: string }>;
  alerts: Array<{ variant: AlertVariant; title: string | null; content: string }>;
}
```

- [ ] **Step 2: Write `src/app/[year]/page.tsx`**

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React, { useEffect, useMemo, useState } from 'react';
import { notFound, useParams } from 'next/navigation';

/* Module imports -------------------------------------- */
import { reduceEventsByCategory } from 'helpers/reduceEventsByCategory';
import { sortEventsByCategoryEntries } from 'helpers/orderEventsByCategory';

/* Component imports ----------------------------------- */
import { Separator } from 'components/ui/separator';
import { InstagramEmbed } from 'components/embeds';
import EventsRecap from 'components/EventsRecap/EventsRecap';
import EventCategoryView from 'components/EventCategoryView/EventCategoryView';
import EventsMap from 'components/EventsMap/EventsMap';

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';
import type { EditionView, EventSummaryView, GeneralAlertView } from './types';

/* Helpers --------------------------------------------- */
const summaryToEvent = (summary: EventSummaryView): Event => ({
  id: summary.id,
  name: summary.name ?? undefined,
  status: summary.status ?? undefined,
  category: summary.category ?? undefined,
  genres: summary.genres ?? undefined,
  artists: summary.artists ?? undefined,
  price: summary.priceText ?? undefined,
  location: {
    name: summary.location.name,
    addressStr: summary.location.address ?? undefined,
  },
  startTime: new Date(summary.startTime),
  endTime: summary.endTime !== null ? new Date(summary.endTime) : undefined,
  // Description and child arrays are filled in on expand (see EventListItem).
});

const fetchEdition = async (year: string): Promise<{ edition: EditionView; generalAlerts: GeneralAlertView[] }> => {
  const response: Response = await fetch(`/api/editions/${year}`, { cache: 'no-store' });
  if(response.status === 404) {
    notFound();
  }
  if(!response.ok) {
    throw new Error(`Edition fetch failed: ${response.status}`);
  }
  return await response.json() as { edition: EditionView; generalAlerts: GeneralAlertView[] };
};

const fetchEvents = async (year: string): Promise<EventSummaryView[]> => {
  const response: Response = await fetch(`/api/editions/${year}/events?limit=200`, { cache: 'no-store' });
  if(response.status === 404) {
    notFound();
  }
  if(!response.ok) {
    throw new Error(`Events fetch failed: ${response.status}`);
  }
  const body = await response.json() as { events: EventSummaryView[]; nextCursor: string | null };
  return body.events;
};

/* EditionPage component prop types -------------------- */
interface EditionPageProps {}

/* EditionPage component ------------------------------- */
const EditionPage: React.FC<EditionPageProps> = () => {
  const params = useParams<{ year: string }>();
  const year: string = params.year;

  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [edition, setEdition] = useState<EditionView | null>(null);
  const [generalAlerts, setGeneralAlerts] = useState<GeneralAlertView[]>([]);
  const [summaries, setSummaries] = useState<EventSummaryView[]>([]);

  useEffect(
    () => {
      let cancelled: boolean = false;
      setLoading(true);
      setErrorMessage(null);
      Promise.all([fetchEdition(year), fetchEvents(year)])
        .then(
          ([editionPayload, eventList]) => {
            if(cancelled) return;
            setEdition(editionPayload.edition);
            setGeneralAlerts(editionPayload.generalAlerts);
            setSummaries(eventList);
          },
        )
        .catch(
          (error: unknown) => {
            if(cancelled) return;
            console.error('[EditionPage] load failed:', error);
            setErrorMessage('Impossible de charger les événements.');
          },
        )
        .finally(
          () => {
            if(!cancelled) setLoading(false);
          },
        );
      return () => {
        cancelled = true;
      };
    },
    [year],
  );

  const viewEvents: Event[] = useMemo<Event[]>(
    () => summaries.map(summaryToEvent),
    [summaries],
  );

  const feteDeLaMusiqueDay: Date = useMemo<Date>(
    () => (edition !== null ? new Date(edition.dayOfFestival) : new Date(`${year}-06-21`)),
    [edition, year],
  );

  if(loading) {
    return (
      <div className="flex justify-center w-full py-16">
        <p className="text-muted-foreground">Chargement des événements...</p>
      </div>
    );
  }
  if(errorMessage !== null) {
    return (
      <div className="flex justify-center w-full py-16">
        <p className="text-destructive">{errorMessage}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col place-items-center min-w-full py-4 lg:py-0">
      {
        generalAlerts.length > 0 &&
          <div className="w-full max-w-5xl px-4 mx-auto pb-4">
            {/* General alerts UI lands in Spec 3; for now we render a plain bullet list. */}
            <ul className="text-sm text-muted-foreground list-disc pl-4">
              {generalAlerts.map((alert) => (
                <li key={alert.id}>
                  {alert.title !== null ? `${alert.title}: ` : ''}{alert.content}
                </li>
              ))}
            </ul>
          </div>
      }
      {
        Object.entries(reduceEventsByCategory(viewEvents))
          .sort(sortEventsByCategoryEntries)
          .map(
            (categoryEntry, index, array) => {
              const categoryTitle = categoryEntry[0];
              const categoryEvents = categoryEntry[1];
              return (
                <React.Fragment key={`${categoryTitle}-${index}`}>
                  <EventCategoryView
                    categoryTitle={categoryTitle}
                    categoryEvents={categoryEvents}
                    feteDeLaMusiqueDay={feteDeLaMusiqueDay}
                  />
                  {
                    array.length - 1 !== index &&
                      <Separator className="w-full" />
                  }
                </React.Fragment>
              );
            },
          )
      }
      <EventsRecap events={viewEvents} />
      <section className="w-full max-w-5xl px-4 g:py-8 mx-auto lg:px-0">
        <InstagramEmbed url="https://www.instagram.com/p/C8bvNYJI_BV/?img_index=1" />
      </section>
      <section className="w-full max-w-5xl px-4 g:py-8 mx-auto lg:px-0">
        <h4 className="text-2xl font-semibold tracking-tight pb-4">
          Cartes des événements
        </h4>
        {
          process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY !== undefined &&
          process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.length > 0 &&
            <EventsMap events={viewEvents} />
        }
        <InstagramEmbed url="https://www.instagram.com/p/C8bz_zPIUdX/" />
      </section>
    </div>
  );
};

/* Export EditionPage component ------------------------ */
export default EditionPage;
```

- [ ] **Step 3: Verify**

```bash
pnpm tsc:ci
pnpm lint
```

- [ ] **Step 4: Manual smoke check**

```bash
pnpm dev
```

In a browser:
- Visit `http://localhost:3000/` → expect redirect to `/2024`.
- Visit `/2024` → expect "Chargement..." briefly, then the full grouped event list (no descriptions visible because the cards are collapsed and detail-on-expand isn't wired yet — that's Task 22).
- Visit `/2023` → expect 2023 events.
- Visit `/9999` → expect Next's default 404 page (the proper not-found.tsx lands in Task 21).

Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add 'src/app/[year]/types.ts' 'src/app/[year]/page.tsx'
git commit -m "Added /[year] client page that fetches edition and events from API"
```

---

## Task 21: `/[year]/not-found.tsx`

**Files:**
- Create: `src/app/[year]/not-found.tsx`

- [ ] **Step 1: Write `src/app/[year]/not-found.tsx`**

```tsx
/* Framework imports ----------------------------------- */
import React from 'react';
import Link from 'next/link';

/* NotFound component prop types ----------------------- */
interface NotFoundProps {}

/* NotFound component ---------------------------------- */
const NotFound: React.FC<NotFoundProps> = () => {
  return (
    <div className="flex flex-col items-center justify-center w-full p-8 text-center gap-2">
      <h1 className="text-2xl font-semibold">
        Édition introuvable
      </h1>
      <p className="text-muted-foreground">
        Cette édition de la Fête de la musique n'existe pas.
      </p>
      <Link
        href="/"
        className="text-blue-600 dark:text-blue-400 underline-offset-4 hover:underline"
      >
        Revenir à l'édition courante
      </Link>
    </div>
  );
};

/* Export NotFound component --------------------------- */
export default NotFound;
```

- [ ] **Step 2: Verify**

```bash
pnpm tsc:ci
pnpm lint
```

- [ ] **Step 3: Visual check**

```bash
pnpm dev
```

Visit `/9999` → expect the localised "Édition introuvable" page (the page calls `notFound()` after the API returns 404). Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add 'src/app/[year]/not-found.tsx'
git commit -m "Added localised 404 page for unknown editions"
```

---

## Task 22: Detail-on-expand in `EventListItem` + summary metadata pass-through

**Files:**
- Modify: `src/types/Event.ts`
- Modify: `src/app/[year]/page.tsx`
- Modify: `src/components/EventList/EventListItem.tsx`

- [ ] **Step 1: Extend `src/types/Event.ts` with summary metadata fields**

Open the file and add the four optional summary metadata fields to the `Event` interface. They're only populated when an `Event` was constructed from an API summary; the existing fixture-style usage continues to work because they're optional.

Replace the current `Event` interface declaration block with:

```ts
export interface Event {
  id: string;
  name?: string;
  status?: 'canceled' | 'postponed' | 'rescheduled';
  alerts?: EventAlert[];
  description?: string;
  category?: EventCategory;
  genres?: string[];
  links?: EventLink[];
  embedLinks?: EventEmbedLink[];
  location: Location;
  startTime: Date;
  endTime?: Date; /* Might be unknown, might be an all-nighter */
  price?: number | string; /* Might be free */
  artists?: string[];
  /** Summary metadata — set when the event came from an API list payload. */
  hasDescription?: boolean;
  linkCount?: number;
  embedCount?: number;
  alertCount?: number;
}
```

- [ ] **Step 2: Update `src/app/[year]/page.tsx` to propagate the summary metadata**

Locate the `summaryToEvent` helper and update it to copy the four metadata fields. Replace the existing helper with:

```ts
const summaryToEvent = (summary: EventSummaryView): Event => ({
  id: summary.id,
  name: summary.name ?? undefined,
  status: summary.status ?? undefined,
  category: summary.category ?? undefined,
  genres: summary.genres ?? undefined,
  artists: summary.artists ?? undefined,
  price: summary.priceText ?? undefined,
  location: {
    name: summary.location.name,
    addressStr: summary.location.address ?? undefined,
  },
  startTime: new Date(summary.startTime),
  endTime: summary.endTime !== null ? new Date(summary.endTime) : undefined,
  hasDescription: summary.hasDescription,
  linkCount: summary.linkCount,
  embedCount: summary.embedCount,
  alertCount: summary.alertCount,
});
```

- [ ] **Step 3: Replace `src/components/EventList/EventListItem.tsx`**

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React, { useMemo, useState } from 'react';

/* Component imports ----------------------------------- */
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from 'components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from 'components/ui/collapsible';
import EventTime from './EventTime';
import EventTitleBlock from 'components/EventTitleBlock/EventTitleBlock';
import EventRender from 'components/EventRender/EventRender';

/* Type imports ---------------------------------------- */
import type {
  Event,
  EventAlert,
  EventEmbedLink,
  EventLink,
} from 'types/Event';

/* EventListItem component prop types ------------------ */
interface EventListItemProps {
  event: Event;
  feteDeLaMusiqueDay: Date;
}

interface DetailPayload {
  event: {
    id: string;
    editionId: string;
    description: string | null;
    links: Array<{ url: string; label: string }>;
    embedLinks: Array<{ platform: 'instagram' | 'facebook'; url: string }>;
    alerts: Array<{ variant: NonNullable<EventAlert['type']>; title: string | null; content: string }>;
  };
}

/* Helpers --------------------------------------------- */
const summaryHasContent = (event: Event): boolean => {
  if(event.description !== undefined && event.description.length > 0) return true;
  if(event.links !== undefined && event.links.length > 0) return true;
  if(event.embedLinks !== undefined && event.embedLinks.length > 0) return true;
  if(event.alerts !== undefined && event.alerts.length > 0) return true;
  if(event.hasDescription === true) return true;
  if(event.linkCount !== undefined && event.linkCount > 0) return true;
  if(event.embedCount !== undefined && event.embedCount > 0) return true;
  if(event.alertCount !== undefined && event.alertCount > 0) return true;
  return false;
};

/* EventListItem component ----------------------------- */
const EventListItem: React.FC<EventListItemProps> = (
  {
    event,
    feteDeLaMusiqueDay,
  },
) => {
  const [open, setOpen] = useState<boolean>(false);
  const [detailLoaded, setDetailLoaded] = useState<boolean>(false);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [enrichedEvent, setEnrichedEvent] = useState<Event>(event);

  const collapsiblePresent: boolean = useMemo<boolean>(
    () => summaryHasContent(event),
    [event],
  );

  const handleOpenChange = (next: boolean): void => {
    setOpen(next);
    if(next && !detailLoaded && !detailLoading) {
      setDetailLoading(true);
      setDetailError(null);
      fetch(`/api/events/${event.id}`, { cache: 'no-store' })
        .then(
          async (response) => {
            if(!response.ok) {
              throw new Error(`Detail fetch failed: ${response.status}`);
            }
            const body = await response.json() as DetailPayload;
            const links: EventLink[] = body.event.links.map(({ url, label }) => ({ url, label }));
            const embedLinks: EventEmbedLink[] = body.event.embedLinks.map(
              ({ platform, url }) => ({ type: platform, url }),
            );
            const alerts: EventAlert[] = body.event.alerts.map(
              ({ variant, title, content }) => ({
                type: variant,
                title: title ?? undefined,
                content,
              }),
            );
            setEnrichedEvent(
              {
                ...event,
                description: body.event.description ?? undefined,
                links,
                embedLinks,
                alerts,
              },
            );
            setDetailLoaded(true);
            return undefined;
          },
        )
        .catch(
          (error: unknown) => {
            console.error('[EventListItem] detail fetch failed:', error);
            setDetailError('Impossible de charger les détails.');
          },
        )
        .finally(
          () => {
            setDetailLoading(false);
          },
        );
    }
  };

  return (
    <li className="py-2">
      <Collapsible
        open={open}
        onOpenChange={handleOpenChange}
        disabled={!collapsiblePresent}
      >
        <CollapsibleTrigger asChild disabled={!collapsiblePresent}>
          <div className="flex items-center justify-between gap-2 px-4 cursor-pointer rounded-md hover:bg-accent">
            <div className="flex-1 min-w-0 -mx-2 px-2 py-1">
              <EventTitleBlock event={event} />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <EventTime
                startTime={event.startTime}
                endTime={event.endTime}
                feteDeLaMusiqueDay={feteDeLaMusiqueDay}
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label={open ? 'Replier' : 'Déplier'}
              >
                {
                  open ?
                    <ChevronUp className="h-5 w-5" /> :
                    <ChevronDown className="h-5 w-5" />
                }
              </Button>
            </div>
          </div>
        </CollapsibleTrigger>
        {
          collapsiblePresent &&
            <CollapsibleContent>
              {
                detailLoading && !detailLoaded &&
                  <p className="px-4 py-2 text-sm text-muted-foreground">
                    Chargement des détails...
                  </p>
              }
              {
                detailError !== null &&
                  <p className="px-4 py-2 text-sm text-destructive">
                    {detailError}
                  </p>
              }
              {
                detailLoaded &&
                  <EventRender event={enrichedEvent} />
              }
            </CollapsibleContent>
        }
      </Collapsible>
    </li>
  );
};

/* Export EventListItem component ---------------------- */
export default EventListItem;
```

- [ ] **Step 4: Verify**

```bash
pnpm tsc:ci
pnpm lint
```

- [ ] **Step 5: Manual smoke check**

```bash
pnpm dev
```

Browser:
- Visit `/2024`. Expand a card with content (e.g. "Allez les filles..."): expect "Chargement des détails..." for a beat, then the description + links + embeds appear.
- Re-collapse and re-expand the same card: no second fetch (check the Network tab — there should be one `events/<uuid>` request for that card across the session).
- Expand a card with no description and no links (rare; some bars in the 2024 list): expect the chevron to be disabled (`collapsiblePresent === false`).

Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add src/types/Event.ts 'src/app/[year]/page.tsx' src/components/EventList/EventListItem.tsx
git commit -m "Added detail-on-expand lazy fetch in EventListItem with per-item cache"
```

---

## Task 23: Header refactor — drop fixture import, take `eventsCount` prop

**Files:**
- Modify: `src/components/Header/Header.tsx`
- Modify: `src/app/MainLayout.tsx`
- Create: `src/app/HeaderContext.tsx`

The Header is rendered inside `MainLayout` which is mounted in the root `layout.tsx`. We can't pass the per-page event count down through normal props because the layout is above the page in the React tree. We use a small client-side context for it.

- [ ] **Step 1: Create `src/app/HeaderContext.tsx`**

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React, { createContext, useContext, useMemo, useState } from 'react';

/* Type declarations ----------------------------------- */
export interface HeaderState {
  year: number | null;
  eventsCount: number | null;
}

interface HeaderContextValue {
  state: HeaderState;
  setState: (next: HeaderState) => void;
}

/* External variables ---------------------------------- */
const HeaderContext = createContext<HeaderContextValue | undefined>(undefined);

/* HeaderProvider component prop types ----------------- */
interface HeaderProviderProps {
  children: React.ReactNode;
}

/* HeaderProvider component ---------------------------- */
export const HeaderProvider: React.FC<HeaderProviderProps> = (
  { children },
) => {
  const [state, setState] = useState<HeaderState>({ year: null, eventsCount: null });
  const value: HeaderContextValue = useMemo(() => ({ state, setState }), [state]);
  return <HeaderContext.Provider value={value}>{children}</HeaderContext.Provider>;
};

/* useHeader hook -------------------------------------- */
export const useHeader = (): HeaderContextValue => {
  const ctx: HeaderContextValue | undefined = useContext(HeaderContext);
  if(ctx === undefined) {
    throw new Error('useHeader must be used inside <HeaderProvider>');
  }
  return ctx;
};
```

- [ ] **Step 2: Update `src/app/MainLayout.tsx` to mount the provider**

Replace the file body inside the `ThemeProvider` to wrap children with `HeaderProvider`:

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports -------------------------------------- */
import { ThemeProvider } from 'next-themes';

/* Component imports ----------------------------------- */
import Header from 'components/Header/Header';
import Copyright from 'components/Copyright/Copyright';
import { HeaderProvider } from './HeaderContext';

/* MainLayout component prop types --------------------- */
interface MainLayoutProps {
  children: React.ReactNode;
}

/* MainLayout component -------------------------------- */
const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <HeaderProvider>
        <body className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-1 min-h-full flex flex-col items-center lg:p-24 lg:pt-8">
            {children}
          </main>
          <footer className="flex flex-col justify-center h-14">
            <Copyright />
          </footer>
        </body>
      </HeaderProvider>
    </ThemeProvider>
  );
};

/* Export MainLayout component ------------------------- */
export default MainLayout;
```

- [ ] **Step 3: Replace `src/components/Header/Header.tsx`**

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports -------------------------------------- */
import { useHeader } from 'app/HeaderContext';

/* Component imports ----------------------------------- */
import ThemeToggle from 'components/ThemeToggle/ThemeToggle';

/* Header component prop types ------------------------- */
interface HeaderProps {
  showEventsCount?: boolean;
}

/* Header component ------------------------------------ */
const Header: React.FC<HeaderProps> = (
  {
    showEventsCount = false,
  },
) => {
  const { state } = useHeader();
  const year: number | null = state.year;
  const count: number | null = state.eventsCount;

  return (
    <header className="w-full font-mono flex flex-col lg:flex-row items-center justify-between gap-2 lg:p-16">
      <div>
        <p className="w-full justify-center border-b border-border bg-gradient-to-b from-muted/50 to-transparent pb-6 pt-8 backdrop-blur-2xl lg:rounded-xl lg:border lg:bg-muted/50 lg:p-4 p-2">
          {
            year !== null ?
              `Liste des événements de la fête de la musique ${year} à Bordeaux` :
              'Fête de la musique à Bordeaux'
          }
          {
            showEventsCount === true && count !== null &&
              <>
                <br />
                <br />
                {count}
                {' '}
                événement
                {count !== 1 ? 's' : ''}
                {' '}
                cette année.
              </>
          }
        </p>
      </div>
      <div className="flex items-center gap-2">
        <p>
          {'Made with ❤️ by '}
          <a
            href="https://github.com/Clovel"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 underline-offset-4 hover:underline"
          >
            Clovis Durand
          </a>
        </p>
        <ThemeToggle />
      </div>
    </header>
  );
};

/* Export Header component ----------------------------- */
export default Header;
```

- [ ] **Step 4: Update `src/app/[year]/page.tsx` to push state into the header**

Inside the existing `EditionPage` component (added in Task 20 and modified in Task 22), import the hook and call it after a successful load. Add this import near the other imports:

```ts
import { useHeader } from 'app/HeaderContext';
```

Then add this hook call near the top of the component body, after the `useState` declarations:

```ts
const { setState: setHeaderState } = useHeader();
```

And inside the existing `useEffect` that loads edition + events, after `setSummaries(eventList);`, add:

```ts
setHeaderState({ year: Number(year), eventsCount: eventList.length });
```

Also add a cleanup so the header doesn't carry stale state when the page unmounts. Replace the `return () => { cancelled = true; };` at the end of the effect with:

```ts
return () => {
  cancelled = true;
  setHeaderState({ year: null, eventsCount: null });
};
```

- [ ] **Step 5: Verify**

```bash
pnpm tsc:ci
pnpm lint
```

- [ ] **Step 6: Manual smoke check**

```bash
pnpm dev
```

Browser: visit `/2024`. Header should display "Liste des événements de la fête de la musique 2024 à Bordeaux". Visit `/2023`: header reflects 2023. Navigate back to `/`: brief redirect, then back to /2024 with the correct header. Stop the dev server.

- [ ] **Step 7: Commit**

```bash
git add src/app/HeaderContext.tsx src/app/MainLayout.tsx src/components/Header/Header.tsx 'src/app/[year]/page.tsx'
git commit -m "Wired Header to per-page edition state via HeaderProvider context"
```

---

## Task 24: Final cleanup — remove fixture runtime imports, update layout metadata

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Update `src/app/layout.tsx` metadata to be year-agnostic**

Replace the existing `metadata` block. The site no longer ships with a hardcoded year:

```ts
export const metadata: Metadata = {
  title: 'Fête de la musique à Bordeaux',
  description: 'Le programme de la fête de la musique à Bordeaux.',
};
```

- [ ] **Step 2: Verify no runtime imports of `fixtures/` remain in `src/app` or `src/components`**

```bash
grep -RIn "from 'fixtures/" src/app src/components
```

Expected: no output.

```bash
grep -RIn "fixtures/events-202" src/app src/components src/helpers
```

Expected: no output. (The seed script in `src/db/seed/index.ts` does import the fixtures — that's the intended remaining consumer.)

- [ ] **Step 3: Full type-check + lint pass**

```bash
pnpm tsc:ci
pnpm lint
```

- [ ] **Step 4: End-to-end visual check**

```bash
pnpm dev
```

Walk through:
- `/` redirects to `/2024`.
- Header shows "Liste des événements de la fête de la musique 2024 à Bordeaux".
- Event list renders grouped by category.
- Expanding a card with content shows description + links + embeds.
- Expanding a card with no content has the chevron disabled.
- Map loads markers (if `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set).
- `/2023` works.
- `/9999` shows the French 404.

Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx
git commit -m "Removed last fixture runtime references; year-agnostic metadata"
```

---

## Task 25: Final pass — production checks

**Files:** none

- [ ] **Step 1: Production build**

```bash
pnpm build
```

Expected: build succeeds with no errors. Pay attention to warnings — none should mention runtime fixture imports or untyped fetches.

- [ ] **Step 2: Run production build locally**

```bash
pnpm start
```

In a browser, repeat the Task 24 end-to-end checks against the production build. Stop the server.

- [ ] **Step 3: Validate the eslint baseline is still clean**

```bash
pnpm lint
```

- [ ] **Step 4: No commit.** This task only validates.

---

## Task 26: README — local Postgres setup notes

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Read the current README**

```bash
cat README.md
```

- [ ] **Step 2: Append a "Local Postgres" section to the end of `README.md`**

Add this block at the very end of the file (after the last existing line):

```markdown
## Local Postgres

The site reads events from a PostgreSQL database via Drizzle. For local dev, the simplest path is Docker:

```bash
docker run --name fdlm-pg -e POSTGRES_PASSWORD=devpass -e POSTGRES_DB=fdlm_dev -p 5432:5432 -d postgres:16
```

Set `DATABASE_URL` in `.env.local`:

```
DATABASE_URL=postgres://postgres:devpass@localhost:5432/fdlm_dev
```

Then apply migrations and seed:

```bash
pnpm db:migrate
pnpm db:seed
```

`pnpm db:seed` is idempotent — re-running it preserves child-row UUIDs but overwrites event-row content. For a full reset in dev only: drop the DB, recreate it, and re-run migrate + seed.
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "Documented local Postgres setup in README"
```

---

## Final verification checklist

Before declaring the implementation complete, confirm:

- [ ] `pnpm tsc:ci` — clean
- [ ] `pnpm lint` — clean
- [ ] `pnpm build` — succeeds
- [ ] `pnpm db:migrate` — applies 0000_*.sql without error on a fresh DB
- [ ] `pnpm db:seed` — populates both editions, idempotent on second run
- [ ] `grep -RIn "from 'fixtures/" src/app src/components` — no output
- [ ] Browser: `/` redirects to latest year; `/[year]` renders events list; `/9999` shows 404; card expansion lazy-loads detail; map markers populate.

---

## Reference: spec sections

- §3 Stack & file layout — Tasks 1–8
- §4 Schema — Tasks 2–7
- §5 API surface — Tasks 14–18
- §6 Read path migration — Tasks 19–23
- §7 Seed strategy — Tasks 11–13
- §8 Rollout plan — Tasks 1–26
- §9 Risk register — Final verification checklist
- §11 Out of scope — confirms nothing in this plan crosses into auth (Spec 2) or backoffice (Spec 3).
