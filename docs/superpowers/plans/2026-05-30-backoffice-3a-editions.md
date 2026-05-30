# Backoffice 3a — Foundation + Editions CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the admin backoffice shell and prove the full write vertical (REST `/api/admin/*` routes guarded by role + zod, TanStack Query client, shadcn forms, toasts) on Editions CRUD, plus an `isPublished` flag that the public read path respects.

**Architecture:** Admin pages are client components under `/admin`, wrapped in a TanStack Query provider, fetching/mutating through new `/api/admin/editions` REST routes. Each route is guarded by an API role helper (401/403) and validates with zod schemas shared with the client forms. A new `editions.isPublished` column (default true) gates the public read path (root redirect + the four Spec 1 public queries). Editions writes are admin-only; the shell is viewable by any authenticated role.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 6, Drizzle + Supabase Postgres, BetterAuth (Spec 2), @tanstack/react-query (new), zod, react-hook-form, shadcn/ui, sonner, Tailwind v4, pnpm.

**Spec source:** `docs/superpowers/specs/2026-05-30-backoffice-3a-editions-design.md`. Read it once before Task 1.

**Verification note:** No test framework (per `CLAUDE.md`). "Verify" = `pnpm tsc:ci`, `pnpm lint`, `pnpm build`, `psql`/`curl`, and browser checks. The DB is Supabase; migrations via `pnpm db:migrate`. A seeded admin exists (`ADMIN_EMAIL`/`ADMIN_PASSWORD` in `.env.local`). Dev server must run on the `BETTER_AUTH_URL` port (3000) for auth cookies to line up.

**Conventions** (`CLAUDE.md`): 2-space indent, single quotes TS / double quotes JSX, semicolons, always-multiline trailing commas, **no space after `if`/`for`/`while`/`catch`** (`if(x)`), `strict-boolean-expressions` (explicit `=== undefined`/`=== null`/`.length > 0`), `explicit-function-return-type` (annotate non-trivial arrows), comment-banner layout, `import type`, `React.FC<Props>` default-exported components. Path alias `*` → `./src/*`. `src/auth/` is strict-linted. Run `pnpm lint-fix` after edits.

**Curl/role note:** to test role rejection you need session cookies for an editor/viewer, but only an admin is seeded. For 3a, verify the admin happy paths via a logged-in cookie jar, and verify the *guard* returns 401 when **no** cookie is sent (unauthenticated). A 403 editor/viewer path is exercised in 3d when more users exist; the guard code handling it is covered by reading + the 401 test.

---

## Task 1: Add `isPublished` to editions (schema + seed + migration)

**Files:**
- Modify: `src/db/schema/editions.ts`
- Modify: `src/db/seed/index.ts`
- Create: `src/db/migrations/0004_*.sql` (generated)

- [ ] **Step 1: Add the column to the schema**

In `src/db/schema/editions.ts`, add `boolean` to the import and the column after `description`:

```ts
import {
  pgTable,
  uuid,
  integer,
  text,
  boolean,
  date,
  timestamp,
} from 'drizzle-orm/pg-core';

export const editions = pgTable('editions', {
  id: uuid('id').primaryKey().defaultRandom(),
  year: integer('year').notNull().unique(),
  description: text('description'),
  isPublished: boolean('is_published').notNull().default(true),
  dayOfFestival: date('day_of_festival').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 2: Set `isPublished` in the seed upsert**

In `src/db/seed/index.ts`, in `upsertEdition`, add `isPublished: true` to both `.values({...})` and the `onConflictDoUpdate` `set`:

```ts
    .values({
      year: edition.year,
      description: edition.description,
      isPublished: true,
      dayOfFestival: edition.dayOfFestival,
    })
    .onConflictDoUpdate({
      target: editions.year,
      set: {
        description: edition.description,
        isPublished: true,
        dayOfFestival: edition.dayOfFestival,
        updatedAt: sql`NOW()`,
      },
    })
```

- [ ] **Step 3: Generate the migration**

```bash
pnpm db:generate
```
Expected: `src/db/migrations/0004_*.sql` containing `ALTER TABLE "editions" ADD COLUMN "is_published" boolean DEFAULT true NOT NULL;`. Inspect:
```bash
grep -E "is_published|ADD COLUMN" src/db/migrations/0004_*.sql
```

- [ ] **Step 4: Apply the migration**

```bash
pnpm db:migrate
```
Expected: applies `0004_*`, exit 0.

- [ ] **Step 5: Verify existing rows are published**

```bash
pnpm exec tsx --env-file=.env.local -e "import postgres from 'postgres'; const sql=postgres(process.env.DATABASE_URL); const r=await sql\`SELECT year, is_published FROM editions ORDER BY year\`; console.log(r); await sql.end();"
```
Expected: 2023 and 2024 both `is_published: true`.

- [ ] **Step 6: Verify typecheck/lint**

```bash
pnpm tsc:ci
pnpm lint
```
Both clean (one pre-existing `<img>` warning acceptable throughout).

- [ ] **Step 7: Commit**

```bash
git add src/db/schema/editions.ts src/db/seed/index.ts src/db/migrations
git commit -m "Added editions.isPublished column (default true) + migration"
```

---

## Task 2: Filter the public read path by `isPublished`

**Files:**
- Modify: `src/app/(public)/page.tsx`
- Modify: `src/db/queries/listEditions.ts`
- Modify: `src/db/queries/getEdition.ts`
- Modify: `src/db/queries/listEditionEvents.ts`
- Modify: `src/db/queries/getEventDetail.ts`

- [ ] **Step 1: Root redirect → latest published edition**

In `src/app/(public)/page.tsx`, add `editions.isPublished` to the imports' usage and filter the query. Add `eq` import and the where clause:

```tsx
/* Framework imports ----------------------------------- */
import React from 'react';
import { redirect } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from 'db';
import { editions } from 'db/schema';

/* RootPage component ---------------------------------- */
const RootPage = async (): Promise<React.ReactElement> => {
  const rows = await db
    .select({ year: editions.year })
    .from(editions)
    .where(eq(editions.isPublished, true))
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

- [ ] **Step 2: `listEditions` → published only**

In `src/db/queries/listEditions.ts`, add `eq` and a where:

```ts
/* Module imports -------------------------------------- */
import { desc, eq } from 'drizzle-orm';

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
    .where(eq(editions.isPublished, true))
    .orderBy(desc(editions.year));
  return rows;
};
```

- [ ] **Step 3: `getEdition` → 404 when unpublished**

In `src/db/queries/getEdition.ts`, also select `isPublished` and return null if not published. Add the field to the select and guard:

```ts
  const editionRows = await db
    .select({
      id: editions.id,
      year: editions.year,
      description: editions.description,
      dayOfFestival: editions.dayOfFestival,
      isPublished: editions.isPublished,
    })
    .from(editions)
    .where(eq(editions.year, year))
    .limit(1);

  const edition = editionRows[0];
  if(edition === undefined || !edition.isPublished) {
    return null;
  }
```

Then when building the returned `edition` object, drop `isPublished` so the public DTO shape is unchanged:

```ts
  return {
    edition: {
      id: edition.id,
      year: edition.year,
      description: edition.description,
      dayOfFestival: edition.dayOfFestival,
    },
    generalAlerts: alertRows,
  };
```

- [ ] **Step 4: `listEditionEvents` → not-found when edition unpublished**

In `src/db/queries/listEditionEvents.ts`, the initial edition lookup selects `{ id }`. Add `isPublished` and reject:

```ts
  const editionRows = await db
    .select({ id: editions.id, isPublished: editions.isPublished })
    .from(editions)
    .where(eq(editions.year, input.year))
    .limit(1);
  const edition = editionRows[0];
  if(edition === undefined || !edition.isPublished) {
    return null;
  }
```

(The route already maps a `null` result to 404.)

- [ ] **Step 5: `getEventDetail` → 404 when the event's edition is unpublished**

In `src/db/queries/getEventDetail.ts`, join the edition's publish state. Add `editions` to imports and gate on it. Replace the event lookup:

```ts
/* Module imports -------------------------------------- */
import { and, asc, eq } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../index';
import { editions, events, eventLinks, eventEmbedLinks, eventAlerts } from '../schema';
```

```ts
  const eventRows = await db
    .select({
      id: events.id,
      editionId: events.editionId,
      description: events.description,
    })
    .from(events)
    .innerJoin(editions, eq(events.editionId, editions.id))
    .where(and(eq(events.id, eventId), eq(editions.isPublished, true)))
    .limit(1);
  const event = eventRows[0];
  if(event === undefined) {
    return null;
  }
```

- [ ] **Step 6: Verify typecheck/lint**

```bash
pnpm tsc:ci
pnpm lint
```

- [ ] **Step 7: Verify the public site still works (both editions are published)**

```bash
( BETTER_AUTH_URL=http://localhost:3000 timeout 55 pnpm dev --port 3000 > /tmp/pub-dev.log 2>&1 & )
sleep 22
P=3000
echo -n "/ -> "; curl -s -m 10 -o /dev/null -w "%{http_code} %{redirect_url}\n" "http://localhost:$P/"
echo -n "/2024 -> "; curl -s -m 10 -o /dev/null -w "%{http_code}\n" "http://localhost:$P/2024"
echo -n "/2023 -> "; curl -s -m 10 -o /dev/null -w "%{http_code}\n" "http://localhost:$P/2023"
echo -n "/api/editions count -> "; curl -s -m 10 "http://localhost:$P/api/editions" | python3 -c "import sys,json;print(len(json.load(sys.stdin)['editions']))"
sleep 16
```
Expected: `/` → 307 to `/2024`; `/2024` 200; `/2023` 200; editions count 2. If the dev server binds elsewhere, grep the log for the port.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(public)/page.tsx" src/db/queries/listEditions.ts src/db/queries/getEdition.ts src/db/queries/listEditionEvents.ts src/db/queries/getEventDetail.ts
git commit -m "Filtered public read path to published editions"
```

---

## Task 3: Shared edition validation schemas

**Files:**
- Create: `src/validation/edition.ts`

- [ ] **Step 1: Write `src/validation/edition.ts`**

```ts
/* Module imports -------------------------------------- */
import { z } from 'zod';

/* Schemas --------------------------------------------- */
const dayOfFestivalSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date au format AAAA-MM-JJ');
const descriptionSchema = z.string().trim().max(2000).optional();

/** Create: year is set once (immutable afterwards). */
export const createEditionSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  description: descriptionSchema,
  dayOfFestival: dayOfFestivalSchema,
  isPublished: z.boolean().default(true),
});

/** Update: year omitted (immutable). */
export const updateEditionSchema = z.object({
  description: descriptionSchema,
  dayOfFestival: dayOfFestivalSchema,
  isPublished: z.boolean(),
});

/* Inferred types -------------------------------------- */
export type CreateEditionInput = z.infer<typeof createEditionSchema>;
export type UpdateEditionInput = z.infer<typeof updateEditionSchema>;
```

- [ ] **Step 2: Verify + commit**

```bash
pnpm tsc:ci && pnpm lint
git add src/validation/edition.ts
git commit -m "Added shared zod schemas for edition create/update"
```

---

## Task 4: Edition mutations (Drizzle writes)

**Files:**
- Create: `src/db/mutations/editions.ts`

- [ ] **Step 1: Write `src/db/mutations/editions.ts`**

```ts
/* Module imports -------------------------------------- */
import { eq, sql } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../index';
import { editions } from '../schema';

/* Type imports ---------------------------------------- */
import type { CreateEditionInput, UpdateEditionInput } from 'validation/edition';
import type { Edition } from '../schema';

/* Helpers --------------------------------------------- */
const normalizeDescription = (description: string | undefined): string | null => {
  if(description === undefined || description.length === 0) {
    return null;
  }
  return description;
};

/* Mutations ------------------------------------------- */
export const createEdition = async (input: CreateEditionInput): Promise<Edition> => {
  const rows = await db
    .insert(editions)
    .values({
      year: input.year,
      description: normalizeDescription(input.description),
      dayOfFestival: input.dayOfFestival,
      isPublished: input.isPublished,
    })
    .returning();
  const row = rows[0];
  if(row === undefined) {
    throw new Error('createEdition: insert returned no row');
  }
  return row;
};

export const updateEdition = async (id: string, input: UpdateEditionInput): Promise<Edition | null> => {
  const rows = await db
    .update(editions)
    .set({
      description: normalizeDescription(input.description),
      dayOfFestival: input.dayOfFestival,
      isPublished: input.isPublished,
      updatedAt: sql`NOW()`,
    })
    .where(eq(editions.id, id))
    .returning();
  return rows[0] ?? null;
};

export const deleteEdition = async (id: string): Promise<boolean> => {
  const rows = await db
    .delete(editions)
    .where(eq(editions.id, id))
    .returning({ id: editions.id });
  return rows.length > 0;
};

export const editionYearExists = async (year: number): Promise<boolean> => {
  const rows = await db
    .select({ id: editions.id })
    .from(editions)
    .where(eq(editions.year, year))
    .limit(1);
  return rows.length > 0;
};
```

- [ ] **Step 2: Verify + commit**

```bash
pnpm tsc:ci && pnpm lint
git add src/db/mutations/editions.ts
git commit -m "Added edition mutations (create/update/delete + year-exists check)"
```

---

## Task 5: Admin editions list query (with counts)

**Files:**
- Create: `src/db/queries/admin/listAllEditions.ts`

- [ ] **Step 1: Write `src/db/queries/admin/listAllEditions.ts`**

```ts
/* Module imports -------------------------------------- */
import { desc, eq, sql } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../../index';
import { editions, events, generalAlerts } from '../../schema';

/* Types ----------------------------------------------- */
export interface AdminEditionDto {
  id: string;
  year: number;
  description: string | null;
  dayOfFestival: string;
  isPublished: boolean;
  eventCount: number;
  alertCount: number;
}

/* Query ----------------------------------------------- */
export const listAllEditions = async (): Promise<AdminEditionDto[]> => {
  const eventCountSql = sql<number>`(SELECT COUNT(*)::int FROM ${events} WHERE ${events.editionId} = ${editions.id})`;
  const alertCountSql = sql<number>`(SELECT COUNT(*)::int FROM ${generalAlerts} WHERE ${generalAlerts.editionId} = ${editions.id})`;

  const rows = await db
    .select({
      id: editions.id,
      year: editions.year,
      description: editions.description,
      dayOfFestival: editions.dayOfFestival,
      isPublished: editions.isPublished,
      eventCount: eventCountSql,
      alertCount: alertCountSql,
    })
    .from(editions)
    .orderBy(desc(editions.year));

  return rows;
};
```

(`eq` import is unused here — omit it; the snippet above already excludes it. If lint flags an unused import, remove it.)

- [ ] **Step 2: Verify + commit**

```bash
pnpm tsc:ci && pnpm lint
git add src/db/queries/admin/listAllEditions.ts
git commit -m "Added admin listAllEditions query with event/alert counts"
```

---

## Task 6: API role-guard helper

**Files:**
- Create: `src/auth/apiGuard.ts`

Pages use `requireRole` (which `redirect`s). API routes must instead return a 401/403 Response. This helper does that.

- [ ] **Step 1: Write `src/auth/apiGuard.ts`**

```ts
/* Framework imports ----------------------------------- */
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

/* Module imports (project) ---------------------------- */
import { auth } from './config';
import { isRole } from './roles';

/* Type imports ---------------------------------------- */
import type { Role } from './roles';
import type { AuthSession } from './helpers';

/* Type declarations ----------------------------------- */
export interface AuthorizeResult {
  session: AuthSession | null;
  response: NextResponse | null;
}

/* Helper ---------------------------------------------- */
/**
 * API-route authorization. Returns `{ session }` on success, or `{ response }`
 * carrying a 401 (no session) / 403 (role not allowed). Pass no roles (or an
 * empty array) to require only an authenticated session.
 */
export const authorizeApi = async (allowedRoles: Role[] = []): Promise<AuthorizeResult> => {
  const session: AuthSession | null = await auth.api.getSession({ headers: await headers() });
  if(session === null) {
    return { session: null, response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };
  }
  if(allowedRoles.length > 0) {
    const role: string = session.user.role;
    if(!isRole(role) || !allowedRoles.includes(role)) {
      return { session: null, response: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
    }
  }
  return { session, response: null };
};
```

- [ ] **Step 2: Verify + commit**

```bash
pnpm tsc:ci && pnpm lint
git add src/auth/apiGuard.ts
git commit -m "Added authorizeApi role guard for admin API routes"
```

If `session.user.role` is not typed as `string`, mirror the Spec 2 helper's `as Role`/cast approach minimally; report any cast.

---

## Task 7: `GET`/`POST /api/admin/editions`

**Files:**
- Create: `src/app/api/admin/editions/route.ts`

- [ ] **Step 1: Write `src/app/api/admin/editions/route.ts`**

```ts
/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';

/* Module imports (project) ---------------------------- */
import { authorizeApi } from 'auth/apiGuard';
import { listAllEditions } from 'db/queries/admin/listAllEditions';
import { createEdition, editionYearExists } from 'db/mutations/editions';
import { createEditionSchema } from 'validation/edition';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* GET — list all editions (any authenticated role) ---- */
export const GET = async (): Promise<NextResponse> => {
  const { response } = await authorizeApi();
  if(response !== null) {
    return response;
  }
  try {
    const editionsList = await listAllEditions();
    return NextResponse.json({ editions: editionsList });
  } catch(error) {
    console.error('[api/admin/editions GET] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};

/* POST — create an edition (admin only) --------------- */
export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const { response } = await authorizeApi(['admin']);
  if(response !== null) {
    return response;
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch(error) {
    console.error('[api/admin/editions POST] bad json:', error);
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  const parsed = createEditionSchema.safeParse(body);
  if(!parsed.success) {
    return NextResponse.json({ error: 'invalid_request', issues: parsed.error.issues }, { status: 400 });
  }
  try {
    if(await editionYearExists(parsed.data.year)) {
      return NextResponse.json({ error: 'conflict', message: 'Cette année existe déjà.' }, { status: 409 });
    }
    const edition = await createEdition(parsed.data);
    return NextResponse.json({ edition }, { status: 201 });
  } catch(error) {
    console.error('[api/admin/editions POST] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
```

- [ ] **Step 2: Verify typecheck/lint**

```bash
pnpm tsc:ci && pnpm lint
```

- [ ] **Step 3: Curl-verify (auth + create + conflict)**

```bash
( BETTER_AUTH_URL=http://localhost:3000 timeout 70 pnpm dev --port 3000 > /tmp/adm-dev.log 2>&1 & )
sleep 22
P=3000; JAR=/tmp/adm.txt; rm -f $JAR
EMAIL=$(grep -E '^ADMIN_EMAIL=' .env.local | cut -d= -f2-)
PASS=$(grep -E '^ADMIN_PASSWORD=' .env.local | cut -d= -f2-)
echo -n "GET unauthenticated -> "; curl -s -m 10 -o /dev/null -w "%{http_code}\n" "http://localhost:$P/api/admin/editions"
curl -s -m 10 -c $JAR -o /dev/null -X POST "http://localhost:$P/api/auth/sign-in/email" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}"
echo -n "GET authed -> "; curl -s -m 10 -b $JAR "http://localhost:$P/api/admin/editions" | python3 -c "import sys,json;d=json.load(sys.stdin);print(len(d['editions']),'editions')"
echo -n "POST create 2099 -> "; curl -s -m 10 -b $JAR -o /dev/null -w "%{http_code}\n" -X POST "http://localhost:$P/api/admin/editions" -H "Content-Type: application/json" -H "Origin: http://localhost:$P" -d '{"year":2099,"dayOfFestival":"2099-06-21","isPublished":false}'
echo -n "POST duplicate 2099 -> "; curl -s -m 10 -b $JAR -o /dev/null -w "%{http_code}\n" -X POST "http://localhost:$P/api/admin/editions" -H "Content-Type: application/json" -H "Origin: http://localhost:$P" -d '{"year":2099,"dayOfFestival":"2099-06-21"}'
echo -n "POST invalid (year 1800) -> "; curl -s -m 10 -b $JAR -o /dev/null -w "%{http_code}\n" -X POST "http://localhost:$P/api/admin/editions" -H "Content-Type: application/json" -H "Origin: http://localhost:$P" -d '{"year":1800,"dayOfFestival":"x"}'
sleep 14
```
Expected: GET unauthenticated → 401; GET authed → `2 editions`; POST create → 201; duplicate → 409; invalid → 400.

Note: this leaves a test edition `2099` (unpublished) in the DB — it's used by later tasks' UI checks. (If you prefer a clean DB, delete it via the DELETE route in Task 8's verification.)

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/editions/route.ts
git commit -m "Added GET/POST /api/admin/editions"
```

---

## Task 8: `PATCH`/`DELETE /api/admin/editions/[id]`

**Files:**
- Create: `src/app/api/admin/editions/[id]/route.ts`

- [ ] **Step 1: Write `src/app/api/admin/editions/[id]/route.ts`**

```ts
/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';
import { z } from 'zod';

/* Module imports (project) ---------------------------- */
import { authorizeApi } from 'auth/apiGuard';
import { updateEdition, deleteEdition } from 'db/mutations/editions';
import { updateEditionSchema } from 'validation/edition';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* Schema ---------------------------------------------- */
const idSchema = z.string().uuid();

/* PATCH — update an edition (admin only) -------------- */
export const PATCH = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> => {
  const { response } = await authorizeApi(['admin']);
  if(response !== null) {
    return response;
  }
  const { id } = await params;
  if(!idSchema.safeParse(id).success) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch(error) {
    console.error('[api/admin/editions PATCH] bad json:', error);
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  const parsed = updateEditionSchema.safeParse(body);
  if(!parsed.success) {
    return NextResponse.json({ error: 'invalid_request', issues: parsed.error.issues }, { status: 400 });
  }
  try {
    const edition = await updateEdition(id, parsed.data);
    if(edition === null) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ edition });
  } catch(error) {
    console.error('[api/admin/editions PATCH] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};

/* DELETE — delete an edition (admin only) ------------- */
export const DELETE = async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> => {
  const { response } = await authorizeApi(['admin']);
  if(response !== null) {
    return response;
  }
  const { id } = await params;
  if(!idSchema.safeParse(id).success) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  try {
    const deleted = await deleteEdition(id);
    if(!deleted) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch(error) {
    console.error('[api/admin/editions DELETE] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
```

- [ ] **Step 2: Verify typecheck/lint**

```bash
pnpm tsc:ci && pnpm lint
```

- [ ] **Step 3: Curl-verify PATCH + DELETE on the 2099 test edition**

```bash
( BETTER_AUTH_URL=http://localhost:3000 timeout 70 pnpm dev --port 3000 > /tmp/adm2-dev.log 2>&1 & )
sleep 22
P=3000; JAR=/tmp/adm2.txt; rm -f $JAR
EMAIL=$(grep -E '^ADMIN_EMAIL=' .env.local | cut -d= -f2-)
PASS=$(grep -E '^ADMIN_PASSWORD=' .env.local | cut -d= -f2-)
curl -s -m 10 -c $JAR -o /dev/null -X POST "http://localhost:$P/api/auth/sign-in/email" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}"
ID=$(curl -s -m 10 -b $JAR "http://localhost:$P/api/admin/editions" | python3 -c "import sys,json;print(next(e['id'] for e in json.load(sys.stdin)['editions'] if e['year']==2099))")
echo "2099 id=$ID"
echo -n "PATCH publish -> "; curl -s -m 10 -b $JAR -o /dev/null -w "%{http_code}\n" -X PATCH "http://localhost:$P/api/admin/editions/$ID" -H "Content-Type: application/json" -H "Origin: http://localhost:$P" -d '{"dayOfFestival":"2099-06-21","isPublished":true}'
echo -n "DELETE -> "; curl -s -m 10 -b $JAR -o /dev/null -w "%{http_code}\n" -X DELETE "http://localhost:$P/api/admin/editions/$ID" -H "Origin: http://localhost:$P"
echo -n "DELETE again (404) -> "; curl -s -m 10 -b $JAR -o /dev/null -w "%{http_code}\n" -X DELETE "http://localhost:$P/api/admin/editions/$ID" -H "Origin: http://localhost:$P"
sleep 12
```
Expected: PATCH → 200; DELETE → 200; second DELETE → 404. (Leaves the DB back at 2 editions.)

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/admin/editions/[id]/route.ts"
git commit -m "Added PATCH/DELETE /api/admin/editions/[id]"
```

---

## Task 9: TanStack Query provider

**Files:**
- Modify: `package.json` (add dep)
- Create: `src/app/admin/QueryProvider.tsx`

- [ ] **Step 1: Add the dependency**

```bash
pnpm add @tanstack/react-query
```

- [ ] **Step 2: Write `src/app/admin/QueryProvider.tsx`**

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React, { useState } from 'react';

/* Module imports -------------------------------------- */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/* QueryProvider component prop types ------------------ */
interface QueryProviderProps {
  children: React.ReactNode;
}

/* QueryProvider component ----------------------------- */
const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  const [client] = useState<QueryClient>(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30_000,
          retry: false,
          refetchOnWindowFocus: false,
        },
      },
    }),
  );

  return (
    <QueryClientProvider client={client}>
      {children}
    </QueryClientProvider>
  );
};

/* Export QueryProvider component ---------------------- */
export default QueryProvider;
```

- [ ] **Step 3: Verify + commit**

```bash
pnpm tsc:ci && pnpm lint
git add package.json pnpm-lock.yaml src/app/admin/QueryProvider.tsx
git commit -m "Added @tanstack/react-query and admin QueryProvider"
```

---

## Task 10: Admin shell (sidebar + breadcrumb + topbar)

**Files:**
- Create: `src/app/admin/AdminShell/navItems.ts`
- Create: `src/app/admin/AdminShell/AdminSidebar.tsx`
- Create: `src/app/admin/AdminShell/AdminShell.tsx`

A lightweight custom sidebar (flex + `Link` + active state) — not the heavy shadcn `sidebar` provider primitive — for maintainability.

- [ ] **Step 1: Write `src/app/admin/AdminShell/navItems.ts`**

```ts
/* Type imports ---------------------------------------- */
import type { Role } from 'auth/roles';

/* Nav item model -------------------------------------- */
export interface AdminNavItem {
  href: string;
  label: string;
  /** When set, only these roles see the item. Undefined = all authenticated roles. */
  roles?: Role[];
}

export const adminNavItems: AdminNavItem[] = [
  { href: '/admin', label: 'Tableau de bord' },
  { href: '/admin/editions', label: 'Éditions' },
  { href: '/admin/events', label: 'Événements' },
  { href: '/admin/alerts', label: 'Alertes' },
  { href: '/admin/users', label: 'Utilisateurs', roles: ['admin'] },
];
```

- [ ] **Step 2: Write `src/app/admin/AdminShell/AdminSidebar.tsx`**

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/* Module imports -------------------------------------- */
import { cn } from 'lib/utils';
import { adminNavItems } from './navItems';

/* Type imports ---------------------------------------- */
import type { Role } from 'auth/roles';

/* AdminSidebar component prop types ------------------- */
interface AdminSidebarProps {
  role: Role;
}

/* Helpers --------------------------------------------- */
const isActive = (pathname: string, href: string): boolean => {
  if(href === '/admin') {
    return pathname === '/admin';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
};

/* AdminSidebar component ------------------------------ */
const AdminSidebar: React.FC<AdminSidebarProps> = ({ role }) => {
  const pathname = usePathname();
  const items = adminNavItems.filter(
    (item) => item.roles === undefined || item.roles.includes(role),
  );

  return (
    <nav className="flex flex-col gap-1 p-3">
      {
        items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive(pathname, item.href)
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            {item.label}
          </Link>
        ))
      }
    </nav>
  );
};

/* Export AdminSidebar component ----------------------- */
export default AdminSidebar;
```

(`cn` is the shadcn class helper at `src/lib/utils.ts` — confirm it exists; it's used by every `src/components/ui/*` file.)

- [ ] **Step 3: Write `src/app/admin/AdminShell/AdminShell.tsx`**

```tsx
/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import { Separator } from 'components/ui/separator';
import UserAvatar from 'components/UserAvatar/UserAvatar';
import LogoutButton from 'components/LogoutButton/LogoutButton';
import AdminSidebar from './AdminSidebar';

/* Module imports (project) ---------------------------- */
import { gravatarUrl } from 'auth/gravatar';

/* Type imports ---------------------------------------- */
import type { Role } from 'auth/roles';

/* AdminShell component prop types --------------------- */
interface AdminShellUser {
  name: string;
  email: string;
  firstName: string;
  lastName: string;
  image: string | null;
  role: Role;
}

interface AdminShellProps {
  user: AdminShellUser;
  children: React.ReactNode;
}

/* AdminShell component -------------------------------- */
const AdminShell: React.FC<AdminShellProps> = ({ user, children }) => {
  const initials: string = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  const avatarSrc: string = (user.image !== null && user.image.length > 0)
    ? user.image
    : gravatarUrl(user.email);

  return (
    <div className="flex min-h-screen w-full">
      <aside className="w-60 shrink-0 border-r border-border bg-card">
        <div className="flex items-center gap-3 p-4">
          <UserAvatar src={avatarSrc} initials={initials} alt={user.name} />
          <div className="flex flex-col min-w-0">
            <span className="truncate text-sm font-medium">{user.name}</span>
            <span className="truncate text-xs text-muted-foreground">{user.role}</span>
          </div>
        </div>
        <Separator />
        <AdminSidebar role={user.role} />
      </aside>
      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex items-center justify-between border-b border-border px-6 py-3">
          <span className="text-sm font-semibold">Back-office</span>
          <LogoutButton />
        </header>
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

/* Export AdminShell component ------------------------- */
export default AdminShell;
```

- [ ] **Step 4: Verify + commit**

```bash
pnpm tsc:ci && pnpm lint
git add src/app/admin/AdminShell
git commit -m "Added admin shell (sidebar + topbar, role-gated nav)"
```

---

## Task 11: Wire the admin layout to QueryProvider + AdminShell

**Files:**
- Modify: `src/app/admin/layout.tsx`

- [ ] **Step 1: Replace `src/app/admin/layout.tsx`**

```tsx
/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import QueryProvider from './QueryProvider';
import AdminShell from './AdminShell/AdminShell';

/* Module imports (project) ---------------------------- */
import { requireSession } from 'auth/helpers';

/* Type imports ---------------------------------------- */
import type { Role } from 'auth/roles';

/* AdminLayout component prop types -------------------- */
interface AdminLayoutProps {
  children: React.ReactNode;
}

/* AdminLayout component ------------------------------- */
/**
 * Authoritative guard for /admin/*. Redirects to /login when unauthenticated.
 * Any authenticated role may view the backoffice; per-section write gating is
 * enforced server-side in the /api/admin routes. Do NOT call requireRole here
 * with a restrictive set — requireRole redirects to /admin and would loop.
 */
const AdminLayout = async ({ children }: AdminLayoutProps): Promise<React.ReactElement> => {
  const session = await requireSession();
  const user = session.user as typeof session.user & {
    firstName?: string;
    lastName?: string;
    role?: string;
  };

  return (
    <QueryProvider>
      <AdminShell
        user={{
          name: user.name,
          email: user.email,
          firstName: user.firstName ?? '',
          lastName: user.lastName ?? '',
          image: user.image ?? null,
          role: (user.role ?? 'viewer') as Role,
        }}
      >
        {children}
      </AdminShell>
    </QueryProvider>
  );
};

/* Export AdminLayout component ------------------------ */
export default AdminLayout;
```

- [ ] **Step 2: Verify + commit**

```bash
pnpm tsc:ci && pnpm lint
git add src/app/admin/layout.tsx
git commit -m "Wired admin layout to QueryProvider + AdminShell"
```

---

## Task 12: Editions React Query hooks

**Files:**
- Create: `src/hooks/admin/useEditions.ts`

- [ ] **Step 1: Write `src/hooks/admin/useEditions.ts`**

```ts
'use client';

/* Module imports -------------------------------------- */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/* Type imports ---------------------------------------- */
import type { AdminEditionDto } from 'db/queries/admin/listAllEditions';
import type { CreateEditionInput, UpdateEditionInput } from 'validation/edition';

/* Constants ------------------------------------------- */
const EDITIONS_KEY = ['admin', 'editions'] as const;

/* Fetchers -------------------------------------------- */
const fetchEditions = async (): Promise<AdminEditionDto[]> => {
  const response = await fetch('/api/admin/editions', { cache: 'no-store' });
  if(!response.ok) {
    throw new Error(`Failed to load editions: ${response.status}`);
  }
  const body = await response.json() as { editions: AdminEditionDto[] };
  return body.editions;
};

const postEdition = async (input: CreateEditionInput): Promise<void> => {
  const response = await fetch('/api/admin/editions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if(!response.ok) {
    const body = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message ?? `Création échouée (${response.status})`);
  }
};

const patchEdition = async (vars: { id: string; input: UpdateEditionInput }): Promise<void> => {
  const response = await fetch(`/api/admin/editions/${vars.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vars.input),
  });
  if(!response.ok) {
    throw new Error(`Mise à jour échouée (${response.status})`);
  }
};

const deleteEditionRequest = async (id: string): Promise<void> => {
  const response = await fetch(`/api/admin/editions/${id}`, { method: 'DELETE' });
  if(!response.ok) {
    throw new Error(`Suppression échouée (${response.status})`);
  }
};

/* Hooks ----------------------------------------------- */
export const useEditionsQuery = (): ReturnType<typeof useQuery<AdminEditionDto[]>> => {
  return useQuery({ queryKey: EDITIONS_KEY, queryFn: fetchEditions });
};

export const useCreateEdition = (): ReturnType<typeof useMutation<void, Error, CreateEditionInput>> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postEdition,
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: EDITIONS_KEY });
    },
  });
};

export const useUpdateEdition = (): ReturnType<typeof useMutation<void, Error, { id: string; input: UpdateEditionInput }>> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: patchEdition,
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: EDITIONS_KEY });
    },
  });
};

export const useDeleteEdition = (): ReturnType<typeof useMutation<void, Error, string>> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteEditionRequest,
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: EDITIONS_KEY });
    },
  });
};
```

- [ ] **Step 2: Verify + commit**

```bash
pnpm tsc:ci && pnpm lint
git add src/hooks/admin/useEditions.ts
git commit -m "Added TanStack Query hooks for editions"
```

If the `ReturnType<typeof useQuery<...>>` annotations are awkward for the linter, simplify to letting the return type be inferred and add an explicit-return-type eslint-disable only if required — but prefer the inferred form by removing the annotation (the `explicit-function-return-type` rule is a warning, not an error, and hook factories returning library types are a common exception). Report what you chose.

---

## Task 13: ConfirmDialog (typed-confirmation) component

**Files:**
- Create: `src/components/admin/ConfirmDialog.tsx`

- [ ] **Step 1: Write `src/components/admin/ConfirmDialog.tsx`**

Uses shadcn `alert-dialog` + `input`. Requires the user to type a confirmation string before the confirm button enables.

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React, { useState } from 'react';

/* Component imports ----------------------------------- */
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from 'components/ui/alert-dialog';
import { Input } from 'components/ui/input';
import { Label } from 'components/ui/label';

/* ConfirmDialog component prop types ------------------ */
interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  /** The exact string the user must type to enable the confirm button. */
  confirmPhrase: string;
  confirmLabel: string;
  onConfirm: () => void;
  pending?: boolean;
}

/* ConfirmDialog component ----------------------------- */
const ConfirmDialog: React.FC<ConfirmDialogProps> = (
  {
    open,
    onOpenChange,
    title,
    description,
    confirmPhrase,
    confirmLabel,
    onConfirm,
    pending = false,
  },
) => {
  const [typed, setTyped] = useState<string>('');
  const matches: boolean = typed === confirmPhrase;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next): void => {
        if(!next) {
          setTyped('');
        }
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>{description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="confirm-phrase">
            {`Tapez « ${confirmPhrase} » pour confirmer`}
          </Label>
          <Input
            id="confirm-phrase"
            value={typed}
            onChange={(e): void => setTyped(e.target.value)}
            autoComplete="off"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            disabled={!matches || pending}
            onClick={(e): void => {
              e.preventDefault();
              onConfirm();
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

/* Export ConfirmDialog component ---------------------- */
export default ConfirmDialog;
```

- [ ] **Step 2: Verify + commit**

```bash
pnpm tsc:ci && pnpm lint
git add src/components/admin/ConfirmDialog.tsx
git commit -m "Added ConfirmDialog (typed-confirmation alert dialog)"
```

Confirm the `alert-dialog` exports used (`AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle`) exist in `src/components/ui/alert-dialog.tsx`; adjust if any name differs and report.

---

## Task 14: Edition form dialog (create/edit)

**Files:**
- Create: `src/app/admin/editions/EditionFormDialog.tsx`

- [ ] **Step 1: Write `src/app/admin/editions/EditionFormDialog.tsx`**

A controlled shadcn `dialog` with a react-hook-form. Handles both create (year editable) and edit (year shown read-only). Uses sonner toasts.

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

/* Component imports ----------------------------------- */
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from 'components/ui/dialog';
import { Button } from 'components/ui/button';
import { Input } from 'components/ui/input';
import { Label } from 'components/ui/label';
import { Textarea } from 'components/ui/textarea';
import { Switch } from 'components/ui/switch';

/* Module imports (project) ---------------------------- */
import { createEditionSchema, updateEditionSchema } from 'validation/edition';
import { useCreateEdition, useUpdateEdition } from 'hooks/admin/useEditions';

/* Type imports ---------------------------------------- */
import type { AdminEditionDto } from 'db/queries/admin/listAllEditions';
import type { CreateEditionInput, UpdateEditionInput } from 'validation/edition';

/* EditionFormDialog component prop types -------------- */
interface EditionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present = edit mode; absent = create mode. */
  edition?: AdminEditionDto;
}

interface EditionFormValues {
  year: number;
  description: string;
  dayOfFestival: string;
  isPublished: boolean;
}

/* EditionFormDialog component ------------------------- */
const EditionFormDialog: React.FC<EditionFormDialogProps> = (
  {
    open,
    onOpenChange,
    edition,
  },
) => {
  const isEdit: boolean = edition !== undefined;
  const createMutation = useCreateEdition();
  const updateMutation = useUpdateEdition();

  const form = useForm<EditionFormValues>({
    resolver: zodResolver(isEdit ? updateEditionSchema : createEditionSchema) as never,
    defaultValues: {
      year: edition?.year ?? new Date().getFullYear(),
      description: edition?.description ?? '',
      dayOfFestival: edition?.dayOfFestival ?? '',
      isPublished: edition?.isPublished ?? true,
    },
  });

  useEffect(
    () => {
      if(open) {
        form.reset({
          year: edition?.year ?? new Date().getFullYear(),
          description: edition?.description ?? '',
          dayOfFestival: edition?.dayOfFestival ?? '',
          isPublished: edition?.isPublished ?? true,
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, edition],
  );

  const onSubmit = (values: EditionFormValues): void => {
    if(isEdit && edition !== undefined) {
      const input: UpdateEditionInput = {
        description: values.description.length > 0 ? values.description : undefined,
        dayOfFestival: values.dayOfFestival,
        isPublished: values.isPublished,
      };
      updateMutation.mutate(
        { id: edition.id, input },
        {
          onSuccess: (): void => {
            toast.success('Édition mise à jour.');
            onOpenChange(false);
          },
          onError: (error): void => {
            toast.error(error.message);
          },
        },
      );
      return;
    }
    const createInput: CreateEditionInput = {
      year: values.year,
      description: values.description.length > 0 ? values.description : undefined,
      dayOfFestival: values.dayOfFestival,
      isPublished: values.isPublished,
    };
    createMutation.mutate(createInput, {
      onSuccess: (): void => {
        toast.success('Édition créée.');
        onOpenChange(false);
      },
      onError: (error): void => {
        toast.error(error.message);
      },
    });
  };

  const pending: boolean = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier l\'édition' : 'Nouvelle édition'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'L\'année ne peut pas être modifiée.' : 'Choisissez l\'année et la date du festival.'}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e): void => { void form.handleSubmit(onSubmit)(e); }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="year">Année</Label>
            <Input
              id="year"
              type="number"
              disabled={isEdit}
              {...form.register('year', { valueAsNumber: true })}
            />
            {
              form.formState.errors.year !== undefined &&
                <p className="text-sm text-destructive">Année invalide (2000–2100).</p>
            }
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="dayOfFestival">Date du festival</Label>
            <Input id="dayOfFestival" type="date" {...form.register('dayOfFestival')} />
            {
              form.formState.errors.dayOfFestival !== undefined &&
                <p className="text-sm text-destructive">Date requise.</p>
            }
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Description (optionnelle)</Label>
            <Textarea id="description" rows={3} {...form.register('description')} />
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="isPublished"
              checked={form.watch('isPublished')}
              onCheckedChange={(v): void => form.setValue('isPublished', v)}
            />
            <Label htmlFor="isPublished">Publiée (visible sur le site public)</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={(): void => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Enregistrement…' : (isEdit ? 'Enregistrer' : 'Créer')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

/* Export EditionFormDialog component ------------------ */
export default EditionFormDialog;
```

- [ ] **Step 2: Verify typecheck/lint**

```bash
pnpm tsc:ci && pnpm lint
```

Notes for the implementer:
- Confirm `Textarea` (`components/ui/textarea`) and `Switch` (`components/ui/switch`) export those names; adjust if needed.
- The `zodResolver(...) as never` cast bridges the two different schema shapes (create vs update) to one form type; if a cleaner typing works without `as never`, prefer it, but do not spend long — a single localized cast is acceptable here. Report what you used.
- `@hookform/resolvers/zod` is already a dependency.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/editions/EditionFormDialog.tsx
git commit -m "Added edition create/edit form dialog"
```

---

## Task 15: Editions list page (table + publish toggle + delete)

**Files:**
- Create: `src/app/admin/editions/EditionsTable.tsx`
- Create: `src/app/admin/editions/page.tsx`

- [ ] **Step 1: Write `src/app/admin/editions/EditionsTable.tsx`**

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React, { useState } from 'react';
import { toast } from 'sonner';

/* Component imports ----------------------------------- */
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from 'components/ui/table';
import { Badge } from 'components/ui/badge';
import { Button } from 'components/ui/button';
import { Switch } from 'components/ui/switch';
import ConfirmDialog from 'components/admin/ConfirmDialog';
import EditionFormDialog from './EditionFormDialog';

/* Module imports (project) ---------------------------- */
import { useEditionsQuery, useUpdateEdition, useDeleteEdition } from 'hooks/admin/useEditions';

/* Type imports ---------------------------------------- */
import type { AdminEditionDto } from 'db/queries/admin/listAllEditions';

/* EditionsTable component prop types ------------------ */
interface EditionsTableProps {
  canManage: boolean;
}

/* EditionsTable component ----------------------------- */
const EditionsTable: React.FC<EditionsTableProps> = ({ canManage }) => {
  const editionsQuery = useEditionsQuery();
  const updateMutation = useUpdateEdition();
  const deleteMutation = useDeleteEdition();

  const [editing, setEditing] = useState<AdminEditionDto | undefined>(undefined);
  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<AdminEditionDto | undefined>(undefined);

  const togglePublish = (edition: AdminEditionDto, next: boolean): void => {
    updateMutation.mutate(
      {
        id: edition.id,
        input: {
          description: edition.description ?? undefined,
          dayOfFestival: edition.dayOfFestival,
          isPublished: next,
        },
      },
      {
        onSuccess: (): void => toast.success(next ? 'Édition publiée.' : 'Édition dépubliée.'),
        onError: (error): void => toast.error(error.message),
      },
    );
  };

  const confirmDelete = (): void => {
    if(deleting === undefined) {
      return;
    }
    const target = deleting;
    deleteMutation.mutate(target.id, {
      onSuccess: (): void => {
        toast.success(`Édition ${target.year} supprimée.`);
        setDeleting(undefined);
      },
      onError: (error): void => toast.error(error.message),
    });
  };

  if(editionsQuery.isLoading) {
    return <p className="text-muted-foreground">Chargement…</p>;
  }
  if(editionsQuery.isError) {
    return <p className="text-destructive">Impossible de charger les éditions.</p>;
  }

  const editions: AdminEditionDto[] = editionsQuery.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Année</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Publiée</TableHead>
            <TableHead>Événements</TableHead>
            <TableHead>Alertes</TableHead>
            {canManage && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {
            editions.map((edition) => (
              <TableRow key={edition.id}>
                <TableCell className="font-medium">{edition.year}</TableCell>
                <TableCell>{edition.dayOfFestival}</TableCell>
                <TableCell>
                  {
                    canManage
                      ? (
                        <Switch
                          checked={edition.isPublished}
                          onCheckedChange={(v): void => togglePublish(edition, v)}
                          aria-label="Publier"
                        />
                      )
                      : <Badge variant={edition.isPublished ? 'default' : 'secondary'}>{edition.isPublished ? 'Oui' : 'Non'}</Badge>
                  }
                </TableCell>
                <TableCell>{edition.eventCount}</TableCell>
                <TableCell>{edition.alertCount}</TableCell>
                {
                  canManage &&
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(): void => { setEditing(edition); setEditOpen(true); }}
                        >
                          Modifier
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(): void => setDeleting(edition)}
                        >
                          Supprimer
                        </Button>
                      </div>
                    </TableCell>
                }
              </TableRow>
            ))
          }
        </TableBody>
      </Table>

      {
        canManage &&
          <EditionFormDialog
            open={editOpen}
            onOpenChange={(o): void => { setEditOpen(o); if(!o) { setEditing(undefined); } }}
            edition={editing}
          />
      }

      {
        canManage &&
          <ConfirmDialog
            open={deleting !== undefined}
            onOpenChange={(o): void => { if(!o) { setDeleting(undefined); } }}
            title={`Supprimer l'édition ${deleting?.year ?? ''} ?`}
            description={
              <span>
                {`Cette action supprimera définitivement l'édition ainsi que ${deleting?.eventCount ?? 0} événement(s) et ${deleting?.alertCount ?? 0} alerte(s).`}
              </span>
            }
            confirmPhrase={String(deleting?.year ?? '')}
            confirmLabel="Supprimer"
            pending={deleteMutation.isPending}
            onConfirm={confirmDelete}
          />
      }
    </div>
  );
};

/* Export EditionsTable component ---------------------- */
export default EditionsTable;
```

- [ ] **Step 2: Write `src/app/admin/editions/page.tsx`**

A server component that resolves the role (to decide `canManage`) and renders the client table + a create button. The create button + dialog need client state, so wrap them in a small client island.

Create `src/app/admin/editions/EditionsManager.tsx`:

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React, { useState } from 'react';

/* Component imports ----------------------------------- */
import { Button } from 'components/ui/button';
import EditionsTable from './EditionsTable';
import EditionFormDialog from './EditionFormDialog';

/* EditionsManager component prop types ---------------- */
interface EditionsManagerProps {
  canManage: boolean;
}

/* EditionsManager component --------------------------- */
const EditionsManager: React.FC<EditionsManagerProps> = ({ canManage }) => {
  const [createOpen, setCreateOpen] = useState<boolean>(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Éditions</h1>
        {
          canManage &&
            <Button onClick={(): void => setCreateOpen(true)}>Nouvelle édition</Button>
        }
      </div>
      <EditionsTable canManage={canManage} />
      {
        canManage &&
          <EditionFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      }
    </div>
  );
};

/* Export EditionsManager component -------------------- */
export default EditionsManager;
```

Then `src/app/admin/editions/page.tsx` (server component — resolves role):

```tsx
/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import EditionsManager from './EditionsManager';

/* Module imports (project) ---------------------------- */
import { requireSession } from 'auth/helpers';

/* EditionsPage component ------------------------------ */
const EditionsPage = async (): Promise<React.ReactElement> => {
  const session = await requireSession();
  const role: string = (session.user as { role?: string }).role ?? 'viewer';
  const canManage: boolean = role === 'admin';

  return <EditionsManager canManage={canManage} />;
};

/* Export EditionsPage component ----------------------- */
export default EditionsPage;
```

(Editions writes are admin-only per the matrix, so `canManage = role === 'admin'`.)

- [ ] **Step 3: Verify typecheck/lint**

```bash
pnpm tsc:ci && pnpm lint
```

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/editions/EditionsTable.tsx src/app/admin/editions/EditionsManager.tsx src/app/admin/editions/page.tsx
git commit -m "Added editions admin page (table, create/edit, publish toggle, delete)"
```

---

## Task 16: Dashboard + placeholder pages

**Files:**
- Modify: `src/app/admin/page.tsx`
- Create: `src/app/admin/DashboardSummary.tsx`
- Create: `src/app/admin/events/page.tsx`
- Create: `src/app/admin/alerts/page.tsx`
- Create: `src/app/admin/users/page.tsx`

- [ ] **Step 1: Write `src/app/admin/DashboardSummary.tsx`** (client, uses the editions query)

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';

/* Module imports (project) ---------------------------- */
import { useEditionsQuery } from 'hooks/admin/useEditions';

/* DashboardSummary component prop types --------------- */
interface DashboardSummaryProps {}

/* DashboardSummary component -------------------------- */
const DashboardSummary: React.FC<DashboardSummaryProps> = () => {
  const editionsQuery = useEditionsQuery();

  if(editionsQuery.isLoading) {
    return <p className="text-muted-foreground">Chargement…</p>;
  }
  if(editionsQuery.isError) {
    return <p className="text-destructive">Impossible de charger le résumé.</p>;
  }

  const editions = editionsQuery.data ?? [];
  const published = editions.filter((e) => e.isPublished);
  const current = published.reduce<typeof published[number] | undefined>(
    (acc, e) => (acc === undefined || e.year > acc.year ? e : acc),
    undefined,
  );
  const totalEvents = editions.reduce((sum, e) => sum + e.eventCount, 0);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Éditions</CardTitle></CardHeader>
        <CardContent className="text-2xl font-semibold">{`${editions.length} (${published.length} publiées)`}</CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Édition courante</CardTitle></CardHeader>
        <CardContent className="text-2xl font-semibold">{current?.year ?? '—'}</CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Événements (toutes éditions)</CardTitle></CardHeader>
        <CardContent className="text-2xl font-semibold">{totalEvents}</CardContent>
      </Card>
    </div>
  );
};

/* Export DashboardSummary component ------------------- */
export default DashboardSummary;
```

- [ ] **Step 2: Replace `src/app/admin/page.tsx`** (dashboard)

```tsx
/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import DashboardSummary from './DashboardSummary';

/* AdminPage component --------------------------------- */
const AdminPage = (): React.ReactElement => {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Tableau de bord</h1>
      <DashboardSummary />
    </div>
  );
};

/* Export AdminPage component -------------------------- */
export default AdminPage;
```

- [ ] **Step 3: Create the three placeholder pages**

`src/app/admin/events/page.tsx`:

```tsx
/* Framework imports ----------------------------------- */
import React from 'react';

/* EventsPlaceholderPage component --------------------- */
const EventsPlaceholderPage = (): React.ReactElement => {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">Événements</h1>
      <p className="text-muted-foreground">Bientôt disponible.</p>
    </div>
  );
};

/* Export EventsPlaceholderPage component --------------- */
export default EventsPlaceholderPage;
```

`src/app/admin/alerts/page.tsx` — identical but title "Alertes" and component `AlertsPlaceholderPage`.

`src/app/admin/users/page.tsx` — identical but title "Utilisateurs" and component `UsersPlaceholderPage`. Additionally, this page is admin-only: guard it.

```tsx
/* Framework imports ----------------------------------- */
import React from 'react';
import { redirect } from 'next/navigation';

/* Module imports (project) ---------------------------- */
import { requireSession } from 'auth/helpers';

/* UsersPlaceholderPage component ---------------------- */
const UsersPlaceholderPage = async (): Promise<React.ReactElement> => {
  const session = await requireSession();
  const role: string = (session.user as { role?: string }).role ?? 'viewer';
  if(role !== 'admin') {
    redirect('/admin');
  }
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">Utilisateurs</h1>
      <p className="text-muted-foreground">Bientôt disponible.</p>
    </div>
  );
};

/* Export UsersPlaceholderPage component --------------- */
export default UsersPlaceholderPage;
```

- [ ] **Step 4: Verify typecheck/lint**

```bash
pnpm tsc:ci && pnpm lint
```

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/page.tsx src/app/admin/DashboardSummary.tsx src/app/admin/events/page.tsx src/app/admin/alerts/page.tsx src/app/admin/users/page.tsx
git commit -m "Added admin dashboard + placeholder pages for events/alerts/users"
```

---

## Task 17: End-to-end verification + build

**Files:** none

- [ ] **Step 1: Build**

```bash
pnpm build
```
Expected: exit 0, "Compiled successfully". `/admin`, `/admin/editions`, `/admin/events`, `/admin/alerts`, `/admin/users` appear in the route table; `/api/admin/editions` and `/api/admin/editions/[id]` are dynamic.

- [ ] **Step 2: Browser walk-through (manual)**

```bash
( BETTER_AUTH_URL=http://localhost:3000 pnpm dev --port 3000 > /tmp/final-dev.log 2>&1 & )
sleep 8
```
In a browser at `http://localhost:3000`:
1. `/admin` logged out → redirects to `/login`.
2. Log in as the seeded admin → lands on `/admin` dashboard with summary cards (2 editions, current 2024).
3. Sidebar nav works; "Utilisateurs" is visible (admin). Événements/Alertes/Utilisateurs show "Bientôt disponible".
4. Éditions → table lists 2023 + 2024 with publish switches + event/alert counts.
5. "Nouvelle édition" → create year 2025, date 2025-06-21, **unpublished** → success toast, row appears.
6. Open a new tab to `/` (public) → still redirects to `/2024` (2025 is unpublished, so not the latest published). Visit `/2025` → French 404 (unpublished). 
7. Toggle 2025 publish ON → `/` now redirects to `/2025`; `/2025` renders (empty list — no events yet). Toggle back OFF to restore.
8. Edit 2024's description → success; year field disabled.
9. Delete the 2025 edition → type "2025" to enable confirm → success, row removed.

Kill the server when done:
```bash
pkill -f "next dev --port 3000" 2>/dev/null || true
```

- [ ] **Step 3: Lint/tsc final**

```bash
pnpm tsc:ci && pnpm lint
```
Expected: 0 errors (1 pre-existing `<img>` warning acceptable).

- [ ] **Step 4: No commit** (verification only). If anything failed, fix in the owning task's file and re-verify.

---

## Final verification checklist

- [ ] `pnpm tsc:ci` clean; `pnpm lint` clean (1 pre-existing warning); `pnpm build` exit 0
- [ ] Migration `0004` applied; 2023/2024 published
- [ ] Public site unchanged: `/` → `/2024`, `/2023` 200, an unpublished edition 404s at `/[year]` and is excluded from `/` + `/api/editions`
- [ ] `/api/admin/editions` GET 401 unauthenticated, 200 authed; POST 201 / 409 dup / 400 invalid; PATCH/DELETE 200, DELETE-again 404
- [ ] Admin UI: dashboard, sidebar nav (role-gated Utilisateurs), editions table, create/edit dialog, publish toggle, typed-confirm delete all work in the browser
- [ ] A non-admin would see a read-only editions table (code path present; full check deferred to 3d when editor/viewer users exist)

---

## Spec coverage map

- §4 architecture/stack — Tasks 6–16
- §5 schema change — Task 1
- §6 public read-path impact — Task 2
- §7 admin shell — Tasks 9–11, 16
- §8 editions CRUD — Tasks 3–5, 7–8 (server), 12–15 (UI)
- §9 rollout — Tasks 1–17
- §10 risks — Task 2 (public regression), Task 15 (typed-confirm delete), Task 7/8 (role guard)
- §11 later sub-specs — out of scope; nav placeholders in Task 16
