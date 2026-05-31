# Event favorite-count KPI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Count how many times each event has been favorited (anonymous public + authenticated), and surface it on the public card, the admin events table, the admin dashboard, a public REST endpoint, and an MCP tool.

**Architecture:** Generalize the existing `favorite` table so a row is owned by *either* a `user_id` *or* an anonymous `anon_id` device token (XOR CHECK + two partial unique indexes). Anonymous clients generate a UUID in `localStorage` and sync favorites to the server; on login a `claim` transaction folds anon rows into the user. The count everywhere is one correlated `db.$count(favorites, eq(favorites.eventId, events.id))`, mirroring the existing `linkCount`/`embedCount`/`alertCount`.

**Tech Stack:** Next.js App Router, Drizzle ORM (postgres-js), BetterAuth, TanStack Query, Zod v4, `mcp-handler`, `zod-openapi`.

**Project verification reality (no test framework):** This repo has no unit-test runner. Per `CLAUDE.md`, verification = `pnpm tsc:ci`, `pnpm lint` (scope to `pnpm exec eslint src/...` if the stray worktree makes `pnpm lint` noisy), `pnpm build`, and `curl` against a running `pnpm dev`. Each task below uses those gates instead of TDD red/green.

**Working-tree note (IMPORTANT — read before starting):** The branch has uncommitted, in-flight changes for a *different* feature ("eager event descriptions") that are NOT yet committed. They have already changed the **live public read path**:

- The public page `(public)/[year]/page.tsx` now uses `useEdition`/`useEditionEvents` (`src/hooks/public/`) and maps **`EventWithDetailView` via `dtoToEvent`** — `summaryToEvent`/`EventSummaryView` are no longer used by the page.
- The live data source is `listEditionEventsWithDetail` → `EventWithDetailDto` → `GET /api/editions/[year]/events/full`.
- `EventListItem.tsx` was refactored: no per-event detail fetch; it renders `<EventRender event={event} />` directly and decides collapsibility from `event` content (no count proxies).

The `EventSummaryDto` / `listEditionEvents` / summary endpoint still exist and remain the **documented public API** and the source for the MCP `list_events` tool, so they ALSO need `favoriteCount`. Net: `favoriteCount` must land on **both** event read paths (summary AND with-detail). Tasks 8 and 11 cover both explicitly.

Because both this feature and the eager-descriptions work are uncommitted and touch overlapping files, prefer committing/landing the eager-descriptions work first if possible; otherwise execute this plan on top of the current tree as written.

---

## File Structure

**Create:**
- `src/helpers/anonId.ts` — `getOrCreateAnonId()` device token (client-only).
- `src/db/queries/topFavorites.ts` — ranked-by-favorites queries (shared primitive).
- `src/app/api/favorites/claim/route.ts` — `POST` anon→user claim.
- `src/app/api/editions/[year]/top-favorites/route.ts` — public ranked endpoint.
- `src/hooks/admin/useTopFavorites.ts` — TanStack hook for the dashboard.
- `src/app/admin/TopFavoritesCard.tsx` — dashboard card.

**Modify:**
- `src/db/schema/favorites.ts` — nullable `user_id`, add `anon_id`, CHECK, partial uniques, `event_id` index.
- `src/db/mutations/favorites.ts` — anon mutations + claim + fix existing `onConflict` target predicate.
- `src/validation/favorite.ts` — optional `anonId`, claim schema.
- `src/app/api/favorites/route.ts` — `POST` anon branch.
- `src/app/api/favorites/[eventId]/route.ts` — `DELETE` anon branch.
- `src/components/Favorites/FavoritesProvider.tsx` — anon sync + claim on login.
- `src/db/queries/types.ts` — `favoriteCount` on `EventSummaryDto` (+ `EventWithDetailDto` if present).
- `src/db/queries/listEditionEvents.ts` — select `favoriteCount`.
- `src/db/queries/getEventDetail.ts` — (no count needed; detail DTO unchanged — see Task 8 note).
- `src/db/queries/admin/listEditionEventsAdmin.ts` — select `favoriteCount`.
- `src/types/Event.ts` — `favoriteCount?` field.
- `src/app/(public)/[year]/types.ts` — `favoriteCount` on `EventSummaryView`.
- `src/app/(public)/[year]/page.tsx` — map `favoriteCount` in `summaryToEvent`.
- `src/components/EventList/EventListItem.tsx` — render count beside the Star.
- `src/app/admin/events/EventsManager.tsx` — "Favoris" column.
- `src/app/admin/page.tsx` — render `TopFavoritesCard`.
- `src/mcp/tools.ts` — `list_top_favorites` read tool.
- `src/app/api/openapi.json/route.ts` — `favoriteCount` + new path + schema.
- `src/app/llms.txt/route.ts` — mention favorite-count metric.

---

## Task 1: Generalize the `favorite` schema + migrate

**Files:**
- Modify: `src/db/schema/favorites.ts`
- Generated: `src/db/migrations/NNNN_*.sql`

- [ ] **Step 1: Rewrite the table definition**

Replace the entire contents of `src/db/schema/favorites.ts` with:

```ts
/* Module imports -------------------------------------- */
import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  timestamp,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';

/* Module imports (project) ---------------------------- */
import { user } from './auth';
import { events } from './events';

/* Table definition ------------------------------------ */
// A favorite is owned by EITHER an authenticated user (user_id) OR an
// anonymous device (anon_id) — never both, never neither (favorite_owner_chk).
// anon_id is an opaque client-generated UUID kept in the visitor's
// localStorage; it has no FK because there is no anonymous-user table.
export const favorites = pgTable(
  'favorite',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => user.id, { onDelete: 'cascade' }),
    anonId: uuid('anon_id'),
    eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userEventUq: uniqueIndex('favorite_user_event_uq')
      .on(table.userId, table.eventId)
      .where(sql`user_id IS NOT NULL`),
    anonEventUq: uniqueIndex('favorite_anon_event_uq')
      .on(table.anonId, table.eventId)
      .where(sql`anon_id IS NOT NULL`),
    userIdIdx: index('favorite_user_id_idx').on(table.userId),
    eventIdIdx: index('favorite_event_id_idx').on(table.eventId),
    ownerCheck: check('favorite_owner_chk', sql`num_nonnulls(user_id, anon_id) = 1`),
  }),
);

/* Inferred types -------------------------------------- */
export type FavoriteRow = typeof favorites.$inferSelect;
export type FavoriteInsert = typeof favorites.$inferInsert;
```

- [ ] **Step 2: Generate the migration**

Run: `pnpm db:generate`
Expected: a new `src/db/migrations/NNNN_*.sql` is created.

- [ ] **Step 3: Review the generated SQL**

Run: `git diff --stat src/db/migrations && ls -t src/db/migrations/*.sql | head -1 | xargs cat`
Confirm it contains, in some order: `ALTER COLUMN "user_id" DROP NOT NULL`, `ADD COLUMN "anon_id" uuid`, drop of the old `favorite_user_event_uq`, creation of the two **partial** unique indexes (`WHERE "user_id" IS NOT NULL` / `WHERE "anon_id" IS NOT NULL`), `CREATE INDEX "favorite_event_id_idx"`, and the `favorite_owner_chk` CHECK (`num_nonnulls(...) = 1`). It must NOT drop/recreate the table or touch existing rows' data.

- [ ] **Step 4: Apply the migration**

Run: `pnpm db:migrate`
Expected: applies cleanly (existing rows all have `user_id` set, `anon_id` null → satisfy the CHECK).

- [ ] **Step 5: Typecheck + commit**

Run: `pnpm tsc:ci`
Expected: no errors.

```bash
git add src/db/schema/favorites.ts src/db/migrations
git commit -m "feat(db): generalize favorite table to user-or-anonymous ownership"
```

---

## Task 2: Anonymous + claim mutations

**Files:**
- Modify: `src/db/mutations/favorites.ts`

- [ ] **Step 1: Update imports and fix the existing user `onConflict` predicate**

In `src/db/mutations/favorites.ts`, change the drizzle import line to add `sql`:

```ts
import { and, eq, inArray, sql } from 'drizzle-orm';
```

Then in `addFavorites`, update the conflict clause so it matches the now-**partial** unique index (Postgres requires the predicate to infer a partial index):

```ts
  await db
    .insert(favorites)
    .values(validIds.map((eventId) => ({ userId, eventId })))
    .onConflictDoNothing({
      target: [favorites.userId, favorites.eventId],
      targetWhere: sql`user_id IS NOT NULL`,
    });
```

- [ ] **Step 2: Add anonymous mutations + claim**

Append to `src/db/mutations/favorites.ts` (after `removeFavorite`):

```ts
/* Anonymous favorites (device-keyed) ------------------ */
/** Adds favorites for an anonymous device. Mirrors `addFavorites`. */
export const addAnonymousFavorites = async (anonId: string, eventIds: string[]): Promise<void> => {
  if(eventIds.length === 0) {
    return;
  }
  const existing = await db
    .select({ id: events.id })
    .from(events)
    .where(inArray(events.id, eventIds));
  const validIds: string[] = existing.map((row) => row.id);
  if(validIds.length === 0) {
    return;
  }
  await db
    .insert(favorites)
    .values(validIds.map((eventId) => ({ anonId, eventId })))
    .onConflictDoNothing({
      target: [favorites.anonId, favorites.eventId],
      targetWhere: sql`anon_id IS NOT NULL`,
    });
};

/** Removes one favorite for an anonymous device. No-op if it doesn't exist. */
export const removeAnonymousFavorite = async (anonId: string, eventId: string): Promise<void> => {
  await db
    .delete(favorites)
    .where(and(eq(favorites.anonId, anonId), eq(favorites.eventId, eventId)));
};

/**
 * On login, fold a device's anonymous favorites into the user's favorites and
 * delete the anonymous rows. Atomic so a row is never counted twice.
 */
export const claimAnonymousFavorites = async (userId: string, anonId: string): Promise<void> => {
  await db.transaction(async (tx) => {
    const anonRows = await tx
      .select({ eventId: favorites.eventId })
      .from(favorites)
      .where(eq(favorites.anonId, anonId));
    const eventIds: string[] = anonRows.map((row) => row.eventId);
    if(eventIds.length === 0) {
      return;
    }
    await tx
      .insert(favorites)
      .values(eventIds.map((eventId) => ({ userId, eventId })))
      .onConflictDoNothing({
        target: [favorites.userId, favorites.eventId],
        targetWhere: sql`user_id IS NOT NULL`,
      });
    await tx.delete(favorites).where(eq(favorites.anonId, anonId));
  });
};
```

- [ ] **Step 3: Typecheck + commit**

Run: `pnpm tsc:ci`
Expected: no errors.

```bash
git add src/db/mutations/favorites.ts
git commit -m "feat(db): anonymous favorite mutations + login claim"
```

---

## Task 3: Anonymous device-id helper

**Files:**
- Create: `src/helpers/anonId.ts`

- [ ] **Step 1: Write the helper**

Create `src/helpers/anonId.ts`:

```ts
/* Internal variables ---------------------------------- */
const ANON_ID_KEY = 'fdlm:anon-id';

/** Memory fallback for private mode / disabled storage (per page load). */
let memoryAnonId: string | null = null;

const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/* Helper ---------------------------------------------- */
/**
 * Returns this device's stable anonymous favorite id, creating and persisting
 * one on first use. Client-only — returns a throwaway id during SSR.
 */
export const getOrCreateAnonId = (): string => {
  if(typeof window === 'undefined') {
    return memoryAnonId ?? (memoryAnonId = crypto.randomUUID());
  }
  try {
    const existing: string | null = window.localStorage.getItem(ANON_ID_KEY);
    if(existing !== null && isUuid(existing)) {
      return existing;
    }
    const created: string = crypto.randomUUID();
    window.localStorage.setItem(ANON_ID_KEY, created);
    memoryAnonId = created;
    return created;
  } catch{
    return memoryAnonId ?? (memoryAnonId = crypto.randomUUID());
  }
};
```

- [ ] **Step 2: Typecheck + lint + commit**

Run: `pnpm tsc:ci && pnpm exec eslint src/helpers/anonId.ts`
Expected: no errors.

```bash
git add src/helpers/anonId.ts
git commit -m "feat: anonymous device-id helper for favorites"
```

---

## Task 4: Validation schemas

**Files:**
- Modify: `src/validation/favorite.ts`

- [ ] **Step 1: Add optional `anonId` and a claim schema**

Replace the `Schemas` section of `src/validation/favorite.ts` with:

```ts
/* Schemas --------------------------------------------- */
export const postFavoritesSchema = z.object({
  eventIds: z.array(z.uuid()).min(1).max(200),
  anonId: z.uuid().optional(),
});

export const eventIdParamSchema = z.object({
  eventId: z.uuid(),
});

export const claimFavoritesSchema = z.object({
  anonId: z.uuid(),
});

/* Inferred types -------------------------------------- */
export type PostFavoritesInput = z.infer<typeof postFavoritesSchema>;
export type ClaimFavoritesInput = z.infer<typeof claimFavoritesSchema>;
```

- [ ] **Step 2: Typecheck + commit**

Run: `pnpm tsc:ci`
Expected: no errors.

```bash
git add src/validation/favorite.ts
git commit -m "feat(validation): optional anonId + claim schema for favorites"
```

---

## Task 5: Public anonymous branch on favorite write routes

**Files:**
- Modify: `src/app/api/favorites/route.ts`
- Modify: `src/app/api/favorites/[eventId]/route.ts`

- [ ] **Step 1: Rewrite `POST` in `src/app/api/favorites/route.ts`**

Add `getSession` to the project imports:

```ts
import { getSession } from 'auth/helpers';
import { addFavorites, addAnonymousFavorites } from 'db/mutations/favorites';
```

(Keep the existing `authorizeApi`, `listUserFavorites`, `postFavoritesSchema` imports; the `GET` handler stays unchanged and auth-only.)

Replace the `POST` handler with:

```ts
/* POST — add favorites (authed user, or anonymous device) --- */
export const POST = async (request: NextRequest): Promise<NextResponse> => {
  let body: unknown;
  try {
    body = await request.json();
  } catch(error) {
    console.error('[api/favorites POST] bad json:', error);
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  const parsed = postFavoritesSchema.safeParse(body);
  if(!parsed.success) {
    return NextResponse.json({ error: 'invalid_request', issues: parsed.error.issues }, { status: 400 });
  }
  try {
    const session = await getSession();
    if(session !== null) {
      await addFavorites(session.user.id, parsed.data.eventIds);
      return NextResponse.json({ ok: true }, { status: 201 });
    }
    if(parsed.data.anonId === undefined) {
      return NextResponse.json({ error: 'invalid_request', message: 'anonId requis' }, { status: 400 });
    }
    await addAnonymousFavorites(parsed.data.anonId, parsed.data.eventIds);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch(error) {
    console.error('[api/favorites POST] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
```

- [ ] **Step 2: Rewrite `DELETE` in `src/app/api/favorites/[eventId]/route.ts`**

Replace the file's imports section so it reads:

```ts
/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';
import { z } from 'zod';

/* Module imports (project) ---------------------------- */
import { getSession } from 'auth/helpers';
import { removeFavorite, removeAnonymousFavorite } from 'db/mutations/favorites';
import { eventIdParamSchema } from 'validation/favorite';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';
```

Replace the `DELETE` handler with:

```ts
/* DELETE — remove one favorite (authed user, or anonymous device) --- */
export const DELETE = async (
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
): Promise<NextResponse> => {
  const parsed = eventIdParamSchema.safeParse(await params);
  if(!parsed.success) {
    return NextResponse.json({ error: 'invalid_request', issues: parsed.error.issues }, { status: 400 });
  }
  try {
    const session = await getSession();
    if(session !== null) {
      await removeFavorite(session.user.id, parsed.data.eventId);
      return NextResponse.json({ ok: true });
    }
    const rawAnonId: string | null = new URL(request.url).searchParams.get('anonId');
    const anonParsed = z.uuid().safeParse(rawAnonId);
    if(!anonParsed.success) {
      return NextResponse.json({ error: 'invalid_request', message: 'anonId requis' }, { status: 400 });
    }
    await removeAnonymousFavorite(anonParsed.data, parsed.data.eventId);
    return NextResponse.json({ ok: true });
  } catch(error) {
    console.error('[api/favorites DELETE] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
```

- [ ] **Step 3: Typecheck + lint + commit**

Run: `pnpm tsc:ci && pnpm exec eslint src/app/api/favorites`
Expected: no errors.

```bash
git add src/app/api/favorites
git commit -m "feat(api): anonymous branch on favorite add/remove routes"
```

---

## Task 6: Claim route

**Files:**
- Create: `src/app/api/favorites/claim/route.ts`

- [ ] **Step 1: Write the route**

Create `src/app/api/favorites/claim/route.ts`:

```ts
/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';

/* Module imports (project) ---------------------------- */
import { authorizeApi } from 'auth/apiGuard';
import { claimAnonymousFavorites } from 'db/mutations/favorites';
import { claimFavoritesSchema } from 'validation/favorite';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* POST — fold this device's anonymous favorites into the user --- */
export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const { session, response } = await authorizeApi();
  if(response !== null) {
    return response;
  }
  if(session === null) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch(error) {
    console.error('[api/favorites/claim POST] bad json:', error);
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  const parsed = claimFavoritesSchema.safeParse(body);
  if(!parsed.success) {
    return NextResponse.json({ error: 'invalid_request', issues: parsed.error.issues }, { status: 400 });
  }
  try {
    await claimAnonymousFavorites(session.user.id, parsed.data.anonId);
    return NextResponse.json({ ok: true });
  } catch(error) {
    console.error('[api/favorites/claim POST] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
```

- [ ] **Step 2: Typecheck + lint + commit**

Run: `pnpm tsc:ci && pnpm exec eslint src/app/api/favorites/claim`
Expected: no errors.

```bash
git add src/app/api/favorites/claim
git commit -m "feat(api): favorites claim route (anon to user on login)"
```

---

## Task 7: Wire anonymous sync + claim into FavoritesProvider

**Files:**
- Modify: `src/components/Favorites/FavoritesProvider.tsx`

- [ ] **Step 1: Import the helper**

Add to the module imports block:

```ts
import { getOrCreateAnonId } from 'helpers/anonId';
```

- [ ] **Step 2: Add claim to the authed reconcile**

Inside the `reconcile` async function, after the local-only POST and before the `GET`, add the claim call. The function becomes:

```ts
      const reconcile = async (): Promise<void> => {
        const anonId: string = getOrCreateAnonId();
        if(localIds.length > 0) {
          await fetch(
            '/api/favorites',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ eventIds: localIds }),
            },
          );
        }
        await fetch(
          '/api/favorites/claim',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ anonId }),
          },
        );
        const res: Response = await fetch(`/api/favorites?editionId=${editionId}`);
        if(!res.ok) {
          return;
        }
        const body = await res.json() as { eventIds: string[] };
        const merged: Set<string> = new Set([...localIds, ...body.eventIds]);
        favoriteIdsRef.current = merged;
        setFavoriteIds(merged);
        writeStoredFavorites(editionId, [...merged]);
      };
```

- [ ] **Step 3: Sync anonymous toggles to the server**

In `toggleFavorite`, replace the trailing `if(isAuthed) { ... }` block with a branch that also handles the anonymous case:

```ts
      if(isAuthed) {
        const request: Promise<Response> = willFavorite
          ? fetch(
            '/api/favorites',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ eventIds: [eventId] }),
            },
          )
          : fetch(`/api/favorites/${eventId}`, { method: 'DELETE' });
        request.catch(
          (error: unknown): void => {
            console.error('[FavoritesProvider] sync failed:', error);
          },
        );
      } else {
        const anonId: string = getOrCreateAnonId();
        const request: Promise<Response> = willFavorite
          ? fetch(
            '/api/favorites',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ eventIds: [eventId], anonId }),
            },
          )
          : fetch(`/api/favorites/${eventId}?anonId=${anonId}`, { method: 'DELETE' });
        request.catch(
          (error: unknown): void => {
            console.error('[FavoritesProvider] anon sync failed:', error);
          },
        );
      }
```

- [ ] **Step 4: Typecheck + lint + commit**

Run: `pnpm tsc:ci && pnpm exec eslint src/components/Favorites/FavoritesProvider.tsx`
Expected: no errors.

```bash
git add src/components/Favorites/FavoritesProvider.tsx
git commit -m "feat: sync anonymous favorites to server + claim on login"
```

---

## Task 8: `favoriteCount` in DTOs + read queries

**Files:**
- Modify: `src/db/queries/types.ts`
- Modify: `src/db/queries/listEditionEvents.ts`
- Modify: `src/db/queries/listEditionEventsWithDetail.ts`
- Modify: `src/db/queries/admin/listEditionEventsAdmin.ts`

> Note: `getEventDetail`'s `EventDetailDto` does NOT need a count — the card reads `favoriteCount` from the list payload, not the per-event detail. Leave `getEventDetail.ts` unchanged.

- [ ] **Step 1: Add `favoriteCount` to both event DTOs**

In `src/db/queries/types.ts`:
- Add `favoriteCount: number;` to `EventSummaryDto` (after `alertCount: number;`).
- Add `favoriteCount: number;` to `EventWithDetailDto` (after its `alerts: Array<...>;` field).

Confirm both exist: `grep -n "EventSummaryDto\|EventWithDetailDto" src/db/queries/types.ts`.

- [ ] **Step 2: Select the count in `listEditionEvents` (summary path — documented API + MCP `list_events`)**

In `src/db/queries/listEditionEvents.ts`:

(a) Add `favorites` to the schema import:

```ts
import { editions, events, eventLinks, eventEmbedLinks, eventAlerts, favorites } from '../schema';
```

(b) Next to the other count expressions, add:

```ts
  const favoriteCountSql = db.$count(favorites, eq(favorites.eventId, events.id));
```

(c) In the `.select({ ... })`, after `alertCount: alertCountSql,` add:

```ts
      favoriteCount: favoriteCountSql,
```

(d) In the `summaries` map, after `alertCount: row.alertCount,` add:

```ts
      favoriteCount: row.favoriteCount,
```

- [ ] **Step 3: Select the count in `listEditionEventsWithDetail` (LIVE public-page path)**

In `src/db/queries/listEditionEventsWithDetail.ts`:

(a) Add `favorites` to the schema import:

```ts
import { editions, events, eventLinks, eventEmbedLinks, eventAlerts, favorites } from '../schema';
```

(b) In the `eventRows` `.select({ ... })`, after `description: events.description,` add:

```ts
      favoriteCount: db.$count(favorites, eq(favorites.eventId, events.id)),
```

(c) In the final `eventRows.map((row): EventWithDetailDto => ({ ... }))`, after `description: row.description,` add:

```ts
      favoriteCount: row.favoriteCount,
```

- [ ] **Step 4: Add the count to the admin summary**

In `src/db/queries/admin/listEditionEventsAdmin.ts`:

(a) Add `favorites` to the import:

```ts
import { events, eventLinks, eventEmbedLinks, eventAlerts, favorites } from '../../schema';
```

(b) Add to the `AdminEventSummary` interface (after `alertCount: number;`):

```ts
  favoriteCount: number;
```

(c) In the `.select({ ... })`, after the `alertCount: db.$count(...)` line add:

```ts
      favoriteCount: db.$count(favorites, eq(favorites.eventId, events.id)),
```

(d) In the return `.map(...)`, after `alertCount: r.alertCount,` add:

```ts
    favoriteCount: r.favoriteCount,
```

- [ ] **Step 5: Typecheck + commit**

Run: `pnpm tsc:ci`
Expected: no errors. (TS will flag any DTO consumer that builds these objects literally and now misses `favoriteCount` — fix any such spot by adding the field. The OpenAPI schema is handled in Task 15.)

```bash
git add src/db/queries
git commit -m "feat(db): expose favoriteCount on event summary DTOs"
```

---

## Task 9: Top-favorites query module

**Files:**
- Create: `src/db/queries/topFavorites.ts`
- Modify: `src/db/queries/index.ts`

- [ ] **Step 1: Write the query module**

Create `src/db/queries/topFavorites.ts`:

```ts
/* Module imports -------------------------------------- */
import { asc, desc, eq } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../index';
import { editions, events, favorites } from '../schema';

/* Type imports ---------------------------------------- */
import type { EventCategory } from 'types/eventCategories';

/* Types ----------------------------------------------- */
export interface TopFavoritedEvent {
  id: string;
  name: string | null;
  category: EventCategory | null;
  startTime: string;
  favoriteCount: number;
}

export interface EditionTopFavorites {
  year: number;
  events: TopFavoritedEvent[];
}

/* Internal -------------------------------------------- */
const topForEditionId = async (editionId: string, limit: number): Promise<TopFavoritedEvent[]> => {
  const countExpr = db.$count(favorites, eq(favorites.eventId, events.id));
  const rows = await db
    .select({
      id: events.id,
      name: events.name,
      category: events.category,
      startTime: events.startTime,
      favoriteCount: countExpr,
    })
    .from(events)
    .where(eq(events.editionId, editionId))
    .orderBy(desc(countExpr), asc(events.startTime), asc(events.id))
    .limit(limit);
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category as EventCategory | null,
    startTime: row.startTime.toISOString(),
    favoriteCount: row.favoriteCount,
  }));
};

/* Queries --------------------------------------------- */
/** Top events by favorite count for one published edition, or null if missing/unpublished. */
export const getTopFavoritedEventsForYear = async (
  year: number,
  limit: number,
): Promise<TopFavoritedEvent[] | null> => {
  const editionRows = await db
    .select({ id: editions.id, isPublished: editions.isPublished })
    .from(editions)
    .where(eq(editions.year, year))
    .limit(1);
  const edition = editionRows[0];
  if(edition === undefined || !edition.isPublished) {
    return null;
  }
  return topForEditionId(edition.id, limit);
};

/** Top events per published edition, newest edition first. */
export const listTopFavoritedEventsPerEdition = async (limit: number): Promise<EditionTopFavorites[]> => {
  const published = await db
    .select({ id: editions.id, year: editions.year })
    .from(editions)
    .where(eq(editions.isPublished, true))
    .orderBy(desc(editions.year));
  const result: EditionTopFavorites[] = [];
  for(const ed of published) {
    const topEvents: TopFavoritedEvent[] = await topForEditionId(ed.id, limit);
    result.push({ year: ed.year, events: topEvents });
  }
  return result;
};
```

- [ ] **Step 2: Re-export from the queries barrel**

In `src/db/queries/index.ts`, append:

```ts
export * from './topFavorites';
```

- [ ] **Step 3: Typecheck + lint + commit**

Run: `pnpm tsc:ci && pnpm exec eslint src/db/queries/topFavorites.ts`
Expected: no errors.

```bash
git add src/db/queries/topFavorites.ts src/db/queries/index.ts
git commit -m "feat(db): top-favorited-events queries"
```

---

## Task 10: Public top-favorites REST endpoint

**Files:**
- Create: `src/app/api/editions/[year]/top-favorites/route.ts`

- [ ] **Step 1: Write the route**

Create `src/app/api/editions/[year]/top-favorites/route.ts`:

```ts
/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';
import { z } from 'zod';

/* Module imports (project) ---------------------------- */
import { getTopFavoritedEventsForYear } from 'db/queries/topFavorites';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* Schemas --------------------------------------------- */
const paramsSchema = z.object({
  year: z.string().regex(/^\d{4}$/),
});

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

/* Route ----------------------------------------------- */
export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ year: string }> },
): Promise<NextResponse> => {
  const parsedParams = paramsSchema.safeParse(await params);
  if(!parsedParams.success) {
    return NextResponse.json({ error: 'invalid_request', issues: parsedParams.error.issues }, { status: 400 });
  }
  const searchParams: Record<string, string> = Object.fromEntries(new URL(request.url).searchParams);
  const parsedQuery = querySchema.safeParse(searchParams);
  if(!parsedQuery.success) {
    return NextResponse.json({ error: 'invalid_request', issues: parsedQuery.error.issues }, { status: 400 });
  }

  const year: number = Number(parsedParams.data.year);
  try {
    const topEvents = await getTopFavoritedEventsForYear(year, parsedQuery.data.limit);
    if(topEvents === null) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ events: topEvents }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
  } catch(error) {
    console.error(`[api/editions/${year}/top-favorites] internal error:`, error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
```

- [ ] **Step 2: Typecheck + lint + commit**

Run: `pnpm tsc:ci && pnpm exec eslint "src/app/api/editions/[year]/top-favorites/route.ts"`
Expected: no errors.

```bash
git add "src/app/api/editions/[year]/top-favorites"
git commit -m "feat(api): public top-favorites endpoint"
```

---

## Task 11: Public render type + view + card display

**Files:**
- Modify: `src/types/Event.ts`
- Modify: `src/app/(public)/[year]/types.ts`
- Modify: `src/app/(public)/[year]/page.tsx`
- Modify: `src/components/EventList/EventListItem.tsx`

- [ ] **Step 1: Add the field to the render type**

In `src/types/Event.ts`, inside `interface Event`, after `alertCount?: number;` add:

```ts
  favoriteCount?: number;
```

- [ ] **Step 2: Add the field to the live view type**

In `src/app/(public)/[year]/types.ts`, inside `EventWithDetailView` (the type the page actually consumes), after its `alerts: Array<...>;` field add:

```ts
  favoriteCount: number;
```

If `EventSummaryView` still exists in this file, add `favoriteCount: number;` to it too (after `alertCount: number;`) to keep it in sync with `EventSummaryDto` — harmless even though the page no longer maps it.

- [ ] **Step 3: Map it in `dtoToEvent`**

In `src/app/(public)/[year]/page.tsx`, in the `dtoToEvent` object (which maps `EventWithDetailView → Event`), after `description: dto.description ?? undefined,` add:

```ts
  favoriteCount: dto.favoriteCount,
```

- [ ] **Step 4: Render the count beside the Star**

In `src/components/EventList/EventListItem.tsx`, replace the favorite `<Button>` block (the one with `aria-pressed={favorite}` wrapping the `<Star>`) with a flex wrapper that shows the count when `> 0`:

```tsx
              <div className="flex items-center gap-1">
                {
                  event.favoriteCount !== undefined && event.favoriteCount > 0 &&
                    <span
                      className="text-xs tabular-nums text-muted-foreground"
                      aria-label={`${event.favoriteCount} personne(s) ont mis cet événement en favori`}
                    >
                      {event.favoriteCount}
                    </span>
                }
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleToggleFavorite}
                  aria-label={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  aria-pressed={favorite}
                >
                  <Star
                    className={cn(
                      'h-5 w-5',
                      favorite
                        ? 'fill-amber-400 text-amber-400 dark:fill-amber-300 dark:text-amber-300'
                        : 'text-muted-foreground',
                    )}
                  />
                </Button>
              </div>
```

- [ ] **Step 5: Typecheck + lint + commit**

Run: `pnpm tsc:ci && pnpm exec eslint src/types/Event.ts "src/app/(public)/[year]" src/components/EventList/EventListItem.tsx`
Expected: no errors.

```bash
git add src/types/Event.ts "src/app/(public)/[year]" src/components/EventList/EventListItem.tsx
git commit -m "feat(public): show favorite count on event cards"
```

---

## Task 12: Admin events table "Favoris" column

**Files:**
- Modify: `src/app/admin/events/EventsManager.tsx`

- [ ] **Step 1: Add the header**

In the `<TableHeader>` row, after `<TableHead>L/E/A</TableHead>` add:

```tsx
                    <TableHead>Favoris</TableHead>
```

- [ ] **Step 2: Add the cell**

In the body `filtered.map(...)` row, after the `<TableCell>{`${ev.linkCount}/${ev.embedCount}/${ev.alertCount}`}</TableCell>` add:

```tsx
                        <TableCell className="tabular-nums">{ev.favoriteCount}</TableCell>
```

- [ ] **Step 3: Typecheck + lint + commit**

Run: `pnpm tsc:ci && pnpm exec eslint src/app/admin/events/EventsManager.tsx`
Expected: no errors. (`ev.favoriteCount` resolves because Task 8 added it to `AdminEventSummary`.)

```bash
git add src/app/admin/events/EventsManager.tsx
git commit -m "feat(admin): favorite count column in events table"
```

---

## Task 13: Dashboard top-favorites card

**Files:**
- Create: `src/hooks/admin/useTopFavorites.ts`
- Create: `src/app/admin/TopFavoritesCard.tsx`
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Write the hook**

Create `src/hooks/admin/useTopFavorites.ts`:

```ts
'use client';

/* Module imports -------------------------------------- */
import { useQuery } from '@tanstack/react-query';

/* Type imports ---------------------------------------- */
import type { UseQueryResult } from '@tanstack/react-query';
import type { TopFavoritedEvent } from 'db/queries/topFavorites';

/* Fetcher --------------------------------------------- */
const fetchTopFavorites = async (year: number, limit: number): Promise<TopFavoritedEvent[]> => {
  const res = await fetch(`/api/editions/${year}/top-favorites?limit=${limit}`, { cache: 'no-store' });
  if(!res.ok) {
    throw new Error(`Failed to load top favorites: ${res.status}`);
  }
  const body = await res.json() as { events: TopFavoritedEvent[] };
  return body.events;
};

/* Hook ------------------------------------------------ */
export const useTopFavorites = (
  year: number | null,
  limit: number = 5,
): UseQueryResult<TopFavoritedEvent[], Error> => {
  return useQuery({
    queryKey: ['admin', 'top-favorites', year, limit],
    queryFn: (): Promise<TopFavoritedEvent[]> => {
      if(year === null) {
        throw new Error('no year');
      }
      return fetchTopFavorites(year, limit);
    },
    enabled: year !== null,
  });
};
```

- [ ] **Step 2: Write the card**

Create `src/app/admin/TopFavoritesCard.tsx`:

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';

/* Module imports (project) ---------------------------- */
import { useEditionsQuery } from 'hooks/admin/useEditions';
import { useTopFavorites } from 'hooks/admin/useTopFavorites';

/* Type imports ---------------------------------------- */
import type { AdminEditionDto } from 'db/queries/admin/listAllEditions';

/* TopFavoritesCard component prop types --------------- */
interface TopFavoritesCardProps {}

/* TopFavoritesCard component -------------------------- */
const TopFavoritesCard: React.FC<TopFavoritesCardProps> = () => {
  const editionsQuery = useEditionsQuery();

  const editions: AdminEditionDto[] = editionsQuery.data ?? [];
  let current: AdminEditionDto | undefined = undefined;
  for(const ed of editions) {
    if(ed.isPublished && (current === undefined || ed.year > current.year)) {
      current = ed;
    }
  }
  const year: number | null = current?.year ?? null;

  const topQuery = useTopFavorites(year, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {year !== null ? `Top favoris — ${year}` : 'Top favoris'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {
          year === null
            ? <p className="text-muted-foreground">Aucune édition publiée.</p>
            : topQuery.isLoading
              ? <p className="text-muted-foreground">Chargement…</p>
              : topQuery.isError
                ? <p className="text-destructive">Impossible de charger le top favoris.</p>
                : (topQuery.data ?? []).length === 0
                  ? <p className="text-muted-foreground">Aucun favori pour le moment.</p>
                  : (
                    <ol className="flex flex-col gap-2">
                      {
                        (topQuery.data ?? []).map((event, index) => (
                          <li key={event.id} className="flex items-center justify-between gap-3">
                            <span className="truncate">
                              {`${index + 1}. ${event.name ?? '(sans nom)'}`}
                            </span>
                            <span className="tabular-nums font-semibold shrink-0">{event.favoriteCount}</span>
                          </li>
                        ))
                      }
                    </ol>
                  )
        }
      </CardContent>
    </Card>
  );
};

/* Export TopFavoritesCard component ------------------- */
export default TopFavoritesCard;
```

- [ ] **Step 3: Render it on the dashboard**

In `src/app/admin/page.tsx`, add the import and render it under `DashboardSummary`:

```tsx
import TopFavoritesCard from './TopFavoritesCard';
```

```tsx
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Tableau de bord</h1>
      <DashboardSummary />
      <TopFavoritesCard />
    </div>
  );
```

- [ ] **Step 4: Typecheck + lint + commit**

Run: `pnpm tsc:ci && pnpm exec eslint src/hooks/admin/useTopFavorites.ts src/app/admin/TopFavoritesCard.tsx src/app/admin/page.tsx`
Expected: no errors.

```bash
git add src/hooks/admin/useTopFavorites.ts src/app/admin/TopFavoritesCard.tsx src/app/admin/page.tsx
git commit -m "feat(admin): top-favorites dashboard card"
```

---

## Task 14: MCP `list_top_favorites` tool

**Files:**
- Modify: `src/mcp/tools.ts`

- [ ] **Step 1: Import the queries**

Add to the project imports in `src/mcp/tools.ts`:

```ts
import { getTopFavoritedEventsForYear, listTopFavoritedEventsPerEdition } from 'db/queries/topFavorites';
```

- [ ] **Step 2: Register the tool**

Inside `registerReadTools`, after the `get_event` tool registration, add:

```ts
  server.tool(
    'list_top_favorites',
    'Most-favorited events. With `year`, returns that published edition\'s top events by favorite count. Without `year`, returns the top events of every published edition, grouped: [{ year, events }]. Each event includes its favoriteCount.',
    {
      year: z.number().int().optional(),
      limit: z.number().int().min(1).max(50).optional(),
    },
    async (args): Promise<ToolResult> => run(async () => {
      const limit: number = (args.limit as number | undefined) ?? 10;
      if(args.year === undefined) {
        return ok(await listTopFavoritedEventsPerEdition(limit));
      }
      const result = await getTopFavoritedEventsForYear(args.year as number, limit);
      return result === null
        ? fail(`No published edition for year ${String(args.year)}`)
        : ok(result);
    }),
  );
```

- [ ] **Step 3: Typecheck + lint + commit**

Run: `pnpm tsc:ci && pnpm exec eslint src/mcp/tools.ts`
Expected: no errors.

```bash
git add src/mcp/tools.ts
git commit -m "feat(mcp): list_top_favorites read tool"
```

---

## Task 15: Document the metric (OpenAPI + llms.txt)

**Files:**
- Modify: `src/app/api/openapi.json/route.ts`
- Modify: `src/app/llms.txt/route.ts`

- [ ] **Step 1: Add `favoriteCount` to the event summary schema**

In `src/app/api/openapi.json/route.ts`, in `eventSummaryDto`, after `alertCount: z.number().int(),` add:

```ts
  favoriteCount: z.number().int(),
```

(If an `EventWithDetail` schema was added by the in-flight work, add the same field there.)

- [ ] **Step 2: Add a top-favorited-event schema**

After the `eventSummaryDto` / `eventListDto` definitions, add:

```ts
const topFavoritedEventDto = z.object({
  id: z.uuid(),
  name: z.string().nullable(),
  category: z.string().nullable(),
  startTime: z.iso.datetime({ offset: true }),
  favoriteCount: z.number().int(),
}).meta({ id: 'TopFavoritedEvent' });

const topFavoritesListDto = z.object({
  events: z.array(topFavoritedEventDto),
}).meta({ id: 'TopFavoritesList' });
```

- [ ] **Step 3: Add the path**

In the `paths` object, after the `'/api/editions/{year}/events'` entry, add:

```ts
    '/api/editions/{year}/top-favorites': {
      get: {
        summary: 'Top events of a published edition by favorite count',
        requestParams: {
          path: z.object({ year: z.coerce.number().int() }),
          query: z.object({ limit: z.coerce.number().int().min(1).max(50).optional() }),
        },
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: topFavoritesListDto } } },
          '404': { description: 'Not found' },
        },
      },
    },
```

- [ ] **Step 4: Mention the metric in llms.txt**

In `src/app/llms.txt/route.ts`, in the `## Données pour agents IA` block, add a line after the OpenAPI line:

```ts
- Événements les plus mis en favori : /api/editions/{année}/top-favorites (ou l'outil MCP list_top_favorites)
```

(Add it inside the template literal, matching the existing `- ...` lines.)

- [ ] **Step 5: Verify the OpenAPI document still builds + commit**

Run: `pnpm tsc:ci && pnpm exec eslint src/app/api/openapi.json/route.ts src/app/llms.txt/route.ts`
Expected: no errors.

```bash
git add src/app/api/openapi.json/route.ts src/app/llms.txt/route.ts
git commit -m "docs(api): document favoriteCount + top-favorites endpoint"
```

---

## Task 16: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Static gates**

Run: `pnpm tsc:ci && pnpm exec eslint src/ && pnpm build`
Expected: all pass. (Use `pnpm exec eslint src/` rather than `pnpm lint` to avoid the stray-worktree `.next` noise documented in CLAUDE.md.)

- [ ] **Step 2: Start dev server**

Run (background): `pnpm dev`
Wait for `Ready` on http://localhost:3000.

- [ ] **Step 3: Anonymous add → count increments**

Pick a real published year and an event id from it:

```bash
YEAR=2024
EVENT=$(curl -s "http://localhost:3000/api/editions/$YEAR/events?limit=1" | python3 -c "import sys,json;print(json.load(sys.stdin)['events'][0]['id'])")
ANON=$(python3 -c "import uuid;print(uuid.uuid4())")
curl -s -X POST http://localhost:3000/api/favorites -H 'Content-Type: application/json' -d "{\"eventIds\":[\"$EVENT\"],\"anonId\":\"$ANON\"}" -i | head -1
curl -s "http://localhost:3000/api/editions/$YEAR/events?ids=$EVENT" | python3 -c "import sys,json;print('favoriteCount=',json.load(sys.stdin)['events'][0]['favoriteCount'])"
```
Expected: POST → `HTTP/1.1 201`, then `favoriteCount= 1` (or +1 over its prior value).

- [ ] **Step 4: Anonymous remove → count decrements**

```bash
curl -s -X DELETE "http://localhost:3000/api/favorites/$EVENT?anonId=$ANON" -i | head -1
curl -s "http://localhost:3000/api/editions/$YEAR/events?ids=$EVENT" | python3 -c "import sys,json;print('favoriteCount=',json.load(sys.stdin)['events'][0]['favoriteCount'])"
```
Expected: DELETE → `HTTP/1.1 200`, count back to its prior value.

- [ ] **Step 5: Missing anonId is rejected**

```bash
curl -s -X POST http://localhost:3000/api/favorites -H 'Content-Type: application/json' -d "{\"eventIds\":[\"$EVENT\"]}" -i | head -1
```
Expected: `HTTP/1.1 400` (no session, no anonId).

- [ ] **Step 6: Top-favorites endpoint**

```bash
curl -s "http://localhost:3000/api/editions/$YEAR/top-favorites?limit=5" | python3 -m json.tool | head -20
curl -s "http://localhost:3000/api/editions/0000/top-favorites" -i | head -1
```
Expected: first → `{ "events": [ ... ] }` ranked by `favoriteCount` desc; second → `HTTP/1.1 404`.

- [ ] **Step 7: Visual checks**

- Visit `http://localhost:3000/$YEAR` → favorite an event, confirm a number appears beside its star; reload → number persists (server-backed).
- Log in at `/login`, visit `/admin/events` → "Favoris" column shows counts.
- Visit `/admin` → "Top favoris — $YEAR" card lists ranked events.

- [ ] **Step 8: Login-claim dedup (manual)**

While logged out, favorite an event (creates an anon row). Log in. Confirm via the public events API that the event's `favoriteCount` did **not** jump by 2 (the anon row was claimed into the user row, not double-counted), and that the star stays filled after login.

- [ ] **Step 9: Stop dev server**

Stop the background `pnpm dev`.

---

## Self-Review

**Spec coverage:**
- Data model (generalize `favorite`, XOR check, partial uniques, event_id index) → Task 1. ✓
- Anonymous identity helper → Task 3. ✓
- Anon write mutations + existing-target predicate fix → Task 2. ✓
- Public anon branch on POST/DELETE → Task 5. ✓
- Login claim (mutation + route + provider wiring) → Tasks 2, 6, 7. ✓
- `favoriteCount` on summary/admin DTOs + read queries → Task 8. ✓
- Aggregate query module (year + per-edition) → Task 9. ✓
- Public REST top-favorites → Task 10. ✓
- Public card display → Task 11. ✓
- Admin table column → Task 12. ✓
- Admin dashboard card → Task 13. ✓
- MCP `list_top_favorites` + `favoriteCount` riding along in existing reads → Task 14 (+ Task 8 makes it ride along). ✓
- OpenAPI + llms.txt docs → Task 15. ✓
- Privacy/abuse: design decisions, no code (documented in spec); no task needed. ✓

**Placeholder scan:** No TBD/TODO; every code step has complete code. ✓

**Type consistency:** `addAnonymousFavorites(anonId, eventIds)`, `removeAnonymousFavorite(anonId, eventId)`, `claimAnonymousFavorites(userId, anonId)`, `getOrCreateAnonId()`, `getTopFavoritedEventsForYear(year, limit)`, `listTopFavoritedEventsPerEdition(limit)`, `TopFavoritedEvent`, `useTopFavorites(year, limit)` — names used consistently across producing and consuming tasks. `favoriteCount` field name identical in DTOs, view types, render type, queries, and UI. ✓

**In-flight working-tree coupling:** Tasks 8 and 11 explicitly extend the uncommitted `EventWithDetailDto` / `events/full` producer and any detail view/mapping if present. ✓
