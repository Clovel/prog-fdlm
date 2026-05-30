# Backoffice 3b — Events CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full Events CRUD in the backoffice — an atomic single-page form (event core + three drag-reorderable child sections: links/embeds/alerts) saved in one transaction, scoped per edition, with correct Europe/Paris↔UTC time handling.

**Architecture:** New `/api/admin/events` REST routes (guarded `admin`+`editor`, zod-validated) backed by transactional Drizzle mutations that replace child rows on save (delete-then-reinsert in submitted order). Client uses TanStack Query (3a foundation) + react-hook-form `useFieldArray` + `@dnd-kit` for child reordering. Form datetime-local values are interpreted as Paris and converted to UTC client-side; the server validates/stores ISO instants. Public read path is unchanged (events inherit their edition's publish state from 3a).

**Tech Stack:** Next.js 16, React 19, TS 6, Drizzle + Supabase, BetterAuth, @tanstack/react-query, @dnd-kit (new), react-hook-form, zod, date-fns-tz, shadcn/ui, sonner, Tailwind v4, pnpm.

**Spec source:** `docs/superpowers/specs/2026-05-30-backoffice-3b-events-design.md`. Read it once before Task 1.

**Verification note:** No test framework (`CLAUDE.md`). "Verify" = `pnpm tsc:ci`, `pnpm lint`, `pnpm build`, `curl` with an admin cookie jar, browser checks. DB is Supabase; dev server must run with `BETTER_AUTH_URL=http://localhost:3000` on port 3000 for auth cookies to line up (a seeded admin exists in `.env.local`).

**Conventions** (`CLAUDE.md`): 2-space indent, single quotes TS / double quotes JSX, semicolons, always-multiline trailing commas, **no space after `if`/`for`/`while`/`catch`** (`if(x)`), `strict-boolean-expressions` (explicit `=== undefined`/`=== null`/`.length > 0`), `explicit-function-return-type`, comment-banner layout, `import type`, `React.FC<Props>` default-exported components, `react-hooks` v7 (use `useWatch`/`useFieldArray`, not `form.watch`). Path alias `*` → `./src/*`. `toast.success/error` return a value — discard in block-body `(): void => { toast.success(...); }`. Run `pnpm lint-fix` after edits.

**3a patterns to reuse:** `authorizeApi(roles?)` from `auth/apiGuard` (`{ session, response }`, 401/403), the `{ error, issues }` envelope + status codes, `useEditionsQuery` from `hooks/admin/useEditions` (for the edition picker), `ConfirmDialog` from `components/admin/ConfirmDialog`, the editions hooks/route files as templates.

---

## Task 1: Add @dnd-kit dependencies

**Files:** `package.json`

- [ ] **Step 1: Install**

```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

(`@dnd-kit/utilities` provides the `CSS` transform helper used by sortable rows.)

- [ ] **Step 2: Verify + commit**

```bash
pnpm tsc:ci && pnpm lint
git add package.json pnpm-lock.yaml
git commit -m "Added @dnd-kit for child-row drag reordering"
```

Both clean (one pre-existing `<img>` warning in `DescriptionRender.tsx` acceptable throughout).

---

## Task 2: Festival time helpers (Paris ↔ UTC)

**Files:** Create `src/lib/festivalTime.ts`

Note: `src/lib/` is ESLint-relaxed (shadcn). This is a tiny pure util; keeping it in `lib/` is fine and matches where shared helpers live.

- [ ] **Step 1: Write `src/lib/festivalTime.ts`**

```ts
/* Module imports -------------------------------------- */
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';

/* Constants ------------------------------------------- */
const PARIS_ZONE = 'Europe/Paris';

/* Helpers --------------------------------------------- */
/**
 * Interpret a `datetime-local` value ("2024-06-21T19:00", no zone) as
 * Europe/Paris wall-clock time and return the corresponding UTC Date.
 * Mirrors the seed's normalizeToParis approach (date-fns-tz fromZonedTime).
 */
export const parisInputToUtc = (localValue: string): Date => {
  return fromZonedTime(localValue, PARIS_ZONE);
};

/**
 * Format a UTC instant as a Paris `datetime-local` string (yyyy-MM-ddTHH:mm)
 * for pre-filling the edit form.
 */
export const toParisInput = (date: Date): string => {
  return formatInTimeZone(date, PARIS_ZONE, "yyyy-MM-dd'T'HH:mm");
};
```

- [ ] **Step 2: Sanity-check the round-trip**

```bash
pnpm exec tsx -e "import { parisInputToUtc, toParisInput } from './src/lib/festivalTime.ts'; const utc = parisInputToUtc('2024-06-21T19:00'); console.log('UTC iso:', utc.toISOString()); console.log('back to paris input:', toParisInput(utc));"
```
Expected: `UTC iso: 2024-06-21T17:00:00.000Z` (Paris is UTC+2 in June) and `back to paris input: 2024-06-21T19:00`.

- [ ] **Step 3: Verify + commit**

```bash
pnpm tsc:ci && pnpm lint
git add src/lib/festivalTime.ts
git commit -m "Added Paris<->UTC datetime-local helpers"
```

---

## Task 3: Shared event validation schemas

**Files:** Create `src/validation/event.ts`

Two schema families share the child schemas: **form** schemas (datetime-local strings, for react-hook-form) and **API** schemas (ISO instants, for the server). The form's submit handler converts local→ISO via `parisInputToUtc`.

- [ ] **Step 1: Write `src/validation/event.ts`**

```ts
/* Module imports -------------------------------------- */
import { z } from 'zod';

/* Module imports (project) ---------------------------- */
import { eventCategories } from 'types/eventCategories';

/* Shared enums ---------------------------------------- */
const categoryEnum = z.enum(eventCategories as unknown as [string, ...string[]]);
const statusEnum = z.enum(['canceled', 'postponed', 'rescheduled']);
const platformEnum = z.enum(['instagram', 'facebook']);
const variantEnum = z.enum(['default', 'destructive', 'warning', 'success']);

/* Shared child schemas (identical for form + API) ----- */
export const eventLinkSchema = z.object({
  url: z.string().url('URL invalide'),
  label: z.string().trim().min(1, 'Libellé requis').max(200),
});

export const eventEmbedLinkSchema = z.object({
  platform: platformEnum,
  url: z.string().url('URL invalide'),
});

export const eventAlertSchema = z.object({
  variant: variantEnum,
  title: z.string().trim().max(200).optional(),
  content: z.string().trim().min(1, 'Contenu requis').max(2000),
});

/* Core (shared field set, no datetime) ---------------- */
const coreShape = {
  name: z.string().trim().max(300).optional(),
  description: z.string().max(10000).optional(),
  category: categoryEnum.optional(),
  status: statusEnum.optional(),
  genres: z.array(z.string().trim().min(1)).default([]),
  artists: z.array(z.string().trim().min(1)).default([]),
  priceText: z.string().trim().max(200).optional(),
  locationName: z.string().trim().min(1, 'Lieu requis').max(300),
  locationAddress: z.string().trim().max(500).optional(),
  links: z.array(eventLinkSchema).default([]),
  embedLinks: z.array(eventEmbedLinkSchema).default([]),
  alerts: z.array(eventAlertSchema).default([]),
};

/* Form schema (datetime-local strings) ---------------- */
const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Date/heure requise');
export const eventFormSchema = z.object({
  ...coreShape,
  startTime: localDateTime,
  endTime: z.union([localDateTime, z.literal('')]).optional(),
}).refine(
  (v) => v.endTime === undefined || v.endTime === '' || v.endTime >= v.startTime,
  { message: 'La fin doit être après le début.', path: ['endTime'] },
);
export type EventFormValues = z.infer<typeof eventFormSchema>;

/* API schemas (ISO instants) -------------------------- */
const isoDateTime = z.string().datetime({ offset: true });
const apiCore = {
  ...coreShape,
  startTime: isoDateTime,
  endTime: isoDateTime.nullable().optional(),
};
const endAfterStart = (v: { startTime: string; endTime?: string | null }): boolean =>
  v.endTime === undefined || v.endTime === null || v.endTime >= v.startTime;

export const createEventSchema = z.object({
  ...apiCore,
  editionId: z.string().uuid(),
}).refine(endAfterStart, { message: 'endTime must be >= startTime', path: ['endTime'] });

export const updateEventSchema = z.object(apiCore)
  .refine(endAfterStart, { message: 'endTime must be >= startTime', path: ['endTime'] });

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
```

- [ ] **Step 2: Verify + commit**

```bash
pnpm tsc:ci && pnpm lint
git add src/validation/event.ts
git commit -m "Added shared event validation schemas (form + API)"
```

If `z.enum(eventCategories as unknown as [string, ...string[]])` trips the `no-unnecessary-type-assertion` or similar, mirror the cast already used in `src/db/schema/enums.ts` for the category pgEnum and report. If `z.string().datetime({ offset: true })` is deprecated in the installed zod v4, use `z.iso.datetime({ offset: true })` or `z.string().datetime()` per what typechecks; report the choice.

---

## Task 4: Admin event read queries

**Files:** Create `src/db/queries/admin/listEditionEventsAdmin.ts`, `src/db/queries/admin/getEventForEdit.ts`

- [ ] **Step 1: Write `src/db/queries/admin/listEditionEventsAdmin.ts`**

```ts
/* Module imports -------------------------------------- */
import { and, asc, eq, sql } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../../index';
import { events, eventLinks, eventEmbedLinks, eventAlerts } from '../../schema';

/* Types ----------------------------------------------- */
export interface AdminEventSummary {
  id: string;
  name: string | null;
  category: string | null;
  status: string | null;
  startTime: string;
  endTime: string | null;
  linkCount: number;
  embedCount: number;
  alertCount: number;
}

/* Query ----------------------------------------------- */
export const listEditionEventsAdmin = async (editionId: string): Promise<AdminEventSummary[]> => {
  const linkCountSql = sql<number>`(SELECT COUNT(*)::int FROM ${eventLinks} WHERE ${eventLinks.eventId} = ${events.id})`;
  const embedCountSql = sql<number>`(SELECT COUNT(*)::int FROM ${eventEmbedLinks} WHERE ${eventEmbedLinks.eventId} = ${events.id})`;
  const alertCountSql = sql<number>`(SELECT COUNT(*)::int FROM ${eventAlerts} WHERE ${eventAlerts.eventId} = ${events.id})`;

  const rows = await db
    .select({
      id: events.id,
      name: events.name,
      category: events.category,
      status: events.status,
      startTime: events.startTime,
      endTime: events.endTime,
      linkCount: linkCountSql,
      embedCount: embedCountSql,
      alertCount: alertCountSql,
    })
    .from(events)
    .where(and(eq(events.editionId, editionId)))
    .orderBy(asc(events.startTime), asc(events.id));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    status: r.status,
    startTime: r.startTime.toISOString(),
    endTime: r.endTime === null ? null : r.endTime.toISOString(),
    linkCount: r.linkCount,
    embedCount: r.embedCount,
    alertCount: r.alertCount,
  }));
};
```

- [ ] **Step 2: Write `src/db/queries/admin/getEventForEdit.ts`**

```ts
/* Module imports -------------------------------------- */
import { asc, eq } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../../index';
import { events, eventLinks, eventEmbedLinks, eventAlerts } from '../../schema';

/* Types ----------------------------------------------- */
export interface AdminEventDetail {
  id: string;
  editionId: string;
  name: string | null;
  description: string | null;
  category: string | null;
  status: string | null;
  genres: string[];
  artists: string[];
  priceText: string | null;
  locationName: string;
  locationAddress: string | null;
  startTime: string;
  endTime: string | null;
  links: Array<{ url: string; label: string }>;
  embedLinks: Array<{ platform: 'instagram' | 'facebook'; url: string }>;
  alerts: Array<{ variant: 'default' | 'destructive' | 'warning' | 'success'; title: string | null; content: string }>;
}

/* Query ----------------------------------------------- */
export const getEventForEdit = async (id: string): Promise<AdminEventDetail | null> => {
  const rows = await db.select().from(events).where(eq(events.id, id)).limit(1);
  const ev = rows[0];
  if(ev === undefined) {
    return null;
  }

  const [linkRows, embedRows, alertRows] = await Promise.all([
    db.select({ url: eventLinks.url, label: eventLinks.label }).from(eventLinks).where(eq(eventLinks.eventId, id)).orderBy(asc(eventLinks.position)),
    db.select({ platform: eventEmbedLinks.platform, url: eventEmbedLinks.url }).from(eventEmbedLinks).where(eq(eventEmbedLinks.eventId, id)).orderBy(asc(eventEmbedLinks.position)),
    db.select({ variant: eventAlerts.variant, title: eventAlerts.title, content: eventAlerts.content }).from(eventAlerts).where(eq(eventAlerts.eventId, id)).orderBy(asc(eventAlerts.position)),
  ]);

  return {
    id: ev.id,
    editionId: ev.editionId,
    name: ev.name,
    description: ev.description,
    category: ev.category,
    status: ev.status,
    genres: ev.genres ?? [],
    artists: ev.artists ?? [],
    priceText: ev.priceText,
    locationName: ev.locationName,
    locationAddress: ev.locationAddress,
    startTime: ev.startTime.toISOString(),
    endTime: ev.endTime === null ? null : ev.endTime.toISOString(),
    links: linkRows,
    embedLinks: embedRows.map((r) => ({ platform: r.platform as 'instagram' | 'facebook', url: r.url })),
    alerts: alertRows.map((r) => ({ variant: r.variant as 'default' | 'destructive' | 'warning' | 'success', title: r.title, content: r.content })),
  };
};
```

- [ ] **Step 3: Verify + commit**

```bash
pnpm tsc:ci && pnpm lint
git add src/db/queries/admin/listEditionEventsAdmin.ts src/db/queries/admin/getEventForEdit.ts
git commit -m "Added admin event read queries (list by edition + detail for edit)"
```

If `ev.category`/`ev.status` are already typed as enum unions (not `string | null`), the DTO `string | null` still accepts them; if tsc complains, widen via `as string | null` minimally and report.

---

## Task 5: Event mutations (transactional, replace-children)

**Files:** Create `src/db/mutations/events.ts`

- [ ] **Step 1: Write `src/db/mutations/events.ts`**

```ts
/* Module imports -------------------------------------- */
import { eq, sql } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../index';
import { events, eventLinks, eventEmbedLinks, eventAlerts } from '../schema';

/* Type imports ---------------------------------------- */
import type { CreateEventInput, UpdateEventInput } from 'validation/event';

/* Helpers --------------------------------------------- */
const emptyToNull = (value: string | undefined | null): string | null => {
  if(value === undefined || value === null || value.length === 0) {
    return null;
  }
  return value;
};

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const insertChildren = async (tx: Tx, eventId: string, input: CreateEventInput | UpdateEventInput): Promise<void> => {
  if(input.links.length > 0) {
    await tx.insert(eventLinks).values(
      input.links.map((l, i) => ({ eventId, url: l.url, label: l.label, position: i })),
    );
  }
  if(input.embedLinks.length > 0) {
    await tx.insert(eventEmbedLinks).values(
      input.embedLinks.map((e, i) => ({ eventId, platform: e.platform, url: e.url, position: i })),
    );
  }
  if(input.alerts.length > 0) {
    await tx.insert(eventAlerts).values(
      input.alerts.map((a, i) => ({ eventId, variant: a.variant, title: emptyToNull(a.title), content: a.content, position: i })),
    );
  }
};

const coreValues = (input: CreateEventInput | UpdateEventInput): Record<string, unknown> => ({
  name: emptyToNull(input.name),
  description: emptyToNull(input.description),
  category: input.category ?? null,
  status: input.status ?? null,
  genres: input.genres.length > 0 ? input.genres : null,
  artists: input.artists.length > 0 ? input.artists : null,
  priceText: emptyToNull(input.priceText),
  locationName: input.locationName,
  locationAddress: emptyToNull(input.locationAddress),
  startTime: new Date(input.startTime),
  endTime: input.endTime === undefined || input.endTime === null ? null : new Date(input.endTime),
});

/* Mutations ------------------------------------------- */
export const createEventWithChildren = async (input: CreateEventInput): Promise<string> => {
  return db.transaction(async (tx) => {
    const rows = await tx
      .insert(events)
      .values({ editionId: input.editionId, ...coreValues(input) })
      .returning({ id: events.id });
    const row = rows[0];
    if(row === undefined) {
      throw new Error('createEvent: insert returned no row');
    }
    await insertChildren(tx, row.id, input);
    return row.id;
  });
};

export const updateEventWithChildren = async (id: string, input: UpdateEventInput): Promise<string | null> => {
  return db.transaction(async (tx) => {
    const rows = await tx
      .update(events)
      .set({ ...coreValues(input), updatedAt: sql`NOW()` })
      .where(eq(events.id, id))
      .returning({ id: events.id });
    const row = rows[0];
    if(row === undefined) {
      return null;
    }
    await tx.delete(eventLinks).where(eq(eventLinks.eventId, id));
    await tx.delete(eventEmbedLinks).where(eq(eventEmbedLinks.eventId, id));
    await tx.delete(eventAlerts).where(eq(eventAlerts.eventId, id));
    await insertChildren(tx, id, input);
    return row.id;
  });
};

export const deleteEvent = async (id: string): Promise<boolean> => {
  const rows = await db.delete(events).where(eq(events.id, id)).returning({ id: events.id });
  return rows.length > 0;
};
```

- [ ] **Step 2: Verify + commit**

```bash
pnpm tsc:ci && pnpm lint
git add src/db/mutations/events.ts
git commit -m "Added transactional event mutations (create/update-replace/delete)"
```

If `coreValues` returning `Record<string, unknown>` causes a Drizzle `.set()`/`.values()` type mismatch, change its return to a typed object literal inline at each call site (drop the helper) OR type it as `Partial<typeof events.$inferInsert>`; prefer the typed form and report. The `Tx` type alias derives the transaction client type from `db.transaction`'s callback parameter.

---

## Task 6: `GET`/`POST /api/admin/events`

**Files:** Create `src/app/api/admin/events/route.ts`

- [ ] **Step 1: Write `src/app/api/admin/events/route.ts`**

```ts
/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';
import { z } from 'zod';

/* Module imports (project) ---------------------------- */
import { authorizeApi } from 'auth/apiGuard';
import { listEditionEventsAdmin } from 'db/queries/admin/listEditionEventsAdmin';
import { createEventWithChildren } from 'db/mutations/events';
import { createEventSchema } from 'validation/event';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* Schema ---------------------------------------------- */
const editionIdSchema = z.string().uuid();

/* GET — list one edition's events (any auth role) ----- */
export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const { response } = await authorizeApi();
  if(response !== null) {
    return response;
  }
  const editionId = new URL(request.url).searchParams.get('editionId');
  if(editionId === null || !editionIdSchema.safeParse(editionId).success) {
    return NextResponse.json({ error: 'invalid_request', message: 'editionId requis' }, { status: 400 });
  }
  try {
    const list = await listEditionEventsAdmin(editionId);
    return NextResponse.json({ events: list });
  } catch(error) {
    console.error('[api/admin/events GET] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};

/* POST — create an event (admin+editor) --------------- */
export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const { response } = await authorizeApi(['admin', 'editor']);
  if(response !== null) {
    return response;
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch(error) {
    console.error('[api/admin/events POST] bad json:', error);
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  const parsed = createEventSchema.safeParse(body);
  if(!parsed.success) {
    return NextResponse.json({ error: 'invalid_request', issues: parsed.error.issues }, { status: 400 });
  }
  try {
    const id = await createEventWithChildren(parsed.data);
    return NextResponse.json({ id }, { status: 201 });
  } catch(error) {
    console.error('[api/admin/events POST] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
```

- [ ] **Step 2: Verify typecheck/lint**

```bash
pnpm tsc:ci && pnpm lint
```

- [ ] **Step 3: Curl-verify (auth + create)**

```bash
( BETTER_AUTH_URL=http://localhost:3000 timeout 80 pnpm dev --port 3000 > /tmp/3b-t6.log 2>&1 & )
sleep 24
P=3000; JAR=/tmp/3b-t6.txt; rm -f $JAR
EMAIL=$(grep -E '^ADMIN_EMAIL=' .env.local | cut -d= -f2-)
PASS=$(grep -E '^ADMIN_PASSWORD=' .env.local | cut -d= -f2-)
curl -s -m10 -c $JAR -o /dev/null -X POST "http://localhost:$P/api/auth/sign-in/email" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}"
EDID=$(curl -s -m10 -b $JAR "http://localhost:$P/api/admin/editions" | python3 -c "import sys,json;print(next(e['id'] for e in json.load(sys.stdin)['editions'] if e['year']==2024))")
echo "2024 edition id: $EDID"
echo -n "GET unauth -> "; curl -s -m10 -o /dev/null -w "%{http_code}\n" "http://localhost:$P/api/admin/events?editionId=$EDID"
echo -n "GET authed count -> "; curl -s -m10 -b $JAR "http://localhost:$P/api/admin/events?editionId=$EDID" | python3 -c "import sys,json;print(len(json.load(sys.stdin)['events']))"
echo -n "GET missing editionId -> "; curl -s -m10 -b $JAR -o /dev/null -w "%{http_code}\n" "http://localhost:$P/api/admin/events"
echo -n "POST create -> "; curl -s -m10 -b $JAR -H "Origin: http://localhost:$P" -X POST "http://localhost:$P/api/admin/events" -H "Content-Type: application/json" -d "{\"editionId\":\"$EDID\",\"locationName\":\"Test Venue\",\"startTime\":\"2024-06-21T17:00:00.000Z\",\"name\":\"PLAN TEST EVENT\",\"genres\":[\"Rock\"],\"artists\":[],\"links\":[{\"url\":\"https://example.com\",\"label\":\"Site\"}],\"embedLinks\":[],\"alerts\":[]}" -o /tmp/3b-create.json -w "%{http_code}\n"
echo -n "POST invalid (no locationName) -> "; curl -s -m10 -b $JAR -H "Origin: http://localhost:$P" -X POST "http://localhost:$P/api/admin/events" -H "Content-Type: application/json" -d "{\"editionId\":\"$EDID\",\"startTime\":\"2024-06-21T17:00:00.000Z\",\"genres\":[],\"artists\":[],\"links\":[],\"embedLinks\":[],\"alerts\":[]}" -o /dev/null -w "%{http_code}\n"
cat /tmp/3b-create.json; echo
sleep 16
```
Expected: GET unauth → 401; GET authed → 44 (2024's seeded events); missing editionId → 400; create → 201 with `{id}`; invalid → 400. **Record the created event id** (from `/tmp/3b-create.json`) — Task 7 edits/deletes it. Paste outputs.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/events/route.ts
git commit -m "Added GET/POST /api/admin/events"
```

---

## Task 7: `GET`/`PATCH`/`DELETE /api/admin/events/[id]`

**Files:** Create `src/app/api/admin/events/[id]/route.ts`

- [ ] **Step 1: Write `src/app/api/admin/events/[id]/route.ts`**

```ts
/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';
import { z } from 'zod';

/* Module imports (project) ---------------------------- */
import { authorizeApi } from 'auth/apiGuard';
import { getEventForEdit } from 'db/queries/admin/getEventForEdit';
import { updateEventWithChildren, deleteEvent } from 'db/mutations/events';
import { updateEventSchema } from 'validation/event';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* Schema ---------------------------------------------- */
const idSchema = z.string().uuid();

/* GET — full event for edit (any auth role) ----------- */
export const GET = async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> => {
  const { response } = await authorizeApi();
  if(response !== null) {
    return response;
  }
  const { id } = await params;
  if(!idSchema.safeParse(id).success) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  try {
    const event = await getEventForEdit(id);
    if(event === null) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ event });
  } catch(error) {
    console.error('[api/admin/events/[id] GET] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};

/* PATCH — update + replace children (admin+editor) ---- */
export const PATCH = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> => {
  const { response } = await authorizeApi(['admin', 'editor']);
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
    console.error('[api/admin/events/[id] PATCH] bad json:', error);
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  const parsed = updateEventSchema.safeParse(body);
  if(!parsed.success) {
    return NextResponse.json({ error: 'invalid_request', issues: parsed.error.issues }, { status: 400 });
  }
  try {
    const result = await updateEventWithChildren(id, parsed.data);
    if(result === null) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ id: result });
  } catch(error) {
    console.error('[api/admin/events/[id] PATCH] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};

/* DELETE — delete an event (admin+editor) ------------- */
export const DELETE = async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> => {
  const { response } = await authorizeApi(['admin', 'editor']);
  if(response !== null) {
    return response;
  }
  const { id } = await params;
  if(!idSchema.safeParse(id).success) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  try {
    const deleted = await deleteEvent(id);
    if(!deleted) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch(error) {
    console.error('[api/admin/events/[id] DELETE] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
```

- [ ] **Step 2: Verify typecheck/lint**

```bash
pnpm tsc:ci && pnpm lint
```

- [ ] **Step 3: Curl-verify GET/PATCH/DELETE on the test event from Task 6**

```bash
( BETTER_AUTH_URL=http://localhost:3000 timeout 80 pnpm dev --port 3000 > /tmp/3b-t7.log 2>&1 & )
sleep 24
P=3000; JAR=/tmp/3b-t7.txt; rm -f $JAR
EMAIL=$(grep -E '^ADMIN_EMAIL=' .env.local | cut -d= -f2-)
PASS=$(grep -E '^ADMIN_PASSWORD=' .env.local | cut -d= -f2-)
curl -s -m10 -c $JAR -o /dev/null -X POST "http://localhost:$P/api/auth/sign-in/email" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}"
EDID=$(curl -s -m10 -b $JAR "http://localhost:$P/api/admin/editions" | python3 -c "import sys,json;print(next(e['id'] for e in json.load(sys.stdin)['editions'] if e['year']==2024))")
ID=$(curl -s -m10 -b $JAR "http://localhost:$P/api/admin/events?editionId=$EDID" | python3 -c "import sys,json;print(next(e['id'] for e in json.load(sys.stdin)['events'] if e['name']=='PLAN TEST EVENT'))")
echo "test event id: $ID"
echo -n "GET detail (expect links=1) -> "; curl -s -m10 -b $JAR "http://localhost:$P/api/admin/events/$ID" | python3 -c "import sys,json;d=json.load(sys.stdin)['event'];print('links',len(d['links']),'name',d['name'])"
echo -n "PATCH (replace children: 2 links, 1 alert) -> "; curl -s -m10 -b $JAR -H "Origin: http://localhost:$P" -X PATCH "http://localhost:$P/api/admin/events/$ID" -H "Content-Type: application/json" -d '{"locationName":"Test Venue 2","startTime":"2024-06-21T18:00:00.000Z","name":"PLAN TEST EVENT","genres":[],"artists":[],"links":[{"url":"https://a.com","label":"A"},{"url":"https://b.com","label":"B"}],"embedLinks":[],"alerts":[{"variant":"warning","content":"Attention"}]}' -o /dev/null -w "%{http_code}\n"
echo -n "GET detail after PATCH (expect links=2, alerts=1) -> "; curl -s -m10 -b $JAR "http://localhost:$P/api/admin/events/$ID" | python3 -c "import sys,json;d=json.load(sys.stdin)['event'];print('links',len(d['links']),'alerts',len(d['alerts']),'loc',d['locationName'])"
echo -n "DELETE -> "; curl -s -m10 -b $JAR -H "Origin: http://localhost:$P" -X DELETE "http://localhost:$P/api/admin/events/$ID" -o /dev/null -w "%{http_code}\n"
echo -n "DELETE again -> "; curl -s -m10 -b $JAR -H "Origin: http://localhost:$P" -X DELETE "http://localhost:$P/api/admin/events/$ID" -o /dev/null -w "%{http_code}\n"
echo -n "final 2024 count (expect 44) -> "; curl -s -m10 -b $JAR "http://localhost:$P/api/admin/events?editionId=$EDID" | python3 -c "import sys,json;print(len(json.load(sys.stdin)['events']))"
sleep 14
```
Expected: GET detail links=1; PATCH → 200; GET after → links=2, alerts=1, loc "Test Venue 2" (children replaced); DELETE → 200; DELETE again → 404; final count 44 (back to seed). Paste outputs.

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/admin/events/[id]/route.ts"
git commit -m "Added GET/PATCH/DELETE /api/admin/events/[id]"
```

---

## Task 8: Admin events React Query hooks

**Files:** Create `src/hooks/admin/useAdminEvents.ts`

- [ ] **Step 1: Write `src/hooks/admin/useAdminEvents.ts`**

```ts
'use client';

/* Module imports -------------------------------------- */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/* Type imports ---------------------------------------- */
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import type { AdminEventSummary } from 'db/queries/admin/listEditionEventsAdmin';
import type { AdminEventDetail } from 'db/queries/admin/getEventForEdit';
import type { CreateEventInput, UpdateEventInput } from 'validation/event';

/* Fetchers -------------------------------------------- */
const fetchEvents = async (editionId: string): Promise<AdminEventSummary[]> => {
  const res = await fetch(`/api/admin/events?editionId=${editionId}`, { cache: 'no-store' });
  if(!res.ok) {
    throw new Error(`Failed to load events: ${res.status}`);
  }
  return (await res.json() as { events: AdminEventSummary[] }).events;
};

const fetchEvent = async (id: string): Promise<AdminEventDetail> => {
  const res = await fetch(`/api/admin/events/${id}`, { cache: 'no-store' });
  if(!res.ok) {
    throw new Error(`Failed to load event: ${res.status}`);
  }
  return (await res.json() as { event: AdminEventDetail }).event;
};

const postEvent = async (input: CreateEventInput): Promise<string> => {
  const res = await fetch('/api/admin/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if(!res.ok) {
    throw new Error(`Création échouée (${res.status})`);
  }
  return (await res.json() as { id: string }).id;
};

const patchEvent = async (vars: { id: string; input: UpdateEventInput }): Promise<void> => {
  const res = await fetch(`/api/admin/events/${vars.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vars.input),
  });
  if(!res.ok) {
    throw new Error(`Mise à jour échouée (${res.status})`);
  }
};

const deleteEventRequest = async (id: string): Promise<void> => {
  const res = await fetch(`/api/admin/events/${id}`, { method: 'DELETE' });
  if(!res.ok) {
    throw new Error(`Suppression échouée (${res.status})`);
  }
};

/* Hooks ----------------------------------------------- */
export const useEventsQuery = (editionId: string | null): UseQueryResult<AdminEventSummary[], Error> => {
  return useQuery({
    queryKey: ['admin', 'events', editionId],
    queryFn: (): Promise<AdminEventSummary[]> => fetchEvents(editionId as string),
    enabled: editionId !== null,
  });
};

export const useEventQuery = (id: string | null): UseQueryResult<AdminEventDetail, Error> => {
  return useQuery({
    queryKey: ['admin', 'event', id],
    queryFn: (): Promise<AdminEventDetail> => fetchEvent(id as string),
    enabled: id !== null,
  });
};

export const useCreateEvent = (): UseMutationResult<string, Error, CreateEventInput> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postEvent,
    onSuccess: (): void => {
      void qc.invalidateQueries({ queryKey: ['admin', 'events'] });
    },
  });
};

export const useUpdateEvent = (): UseMutationResult<void, Error, { id: string; input: UpdateEventInput }> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: patchEvent,
    onSuccess: (_data, vars): void => {
      void qc.invalidateQueries({ queryKey: ['admin', 'events'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'event', vars.id] });
    },
  });
};

export const useDeleteEvent = (): UseMutationResult<void, Error, string> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteEventRequest,
    onSuccess: (): void => {
      void qc.invalidateQueries({ queryKey: ['admin', 'events'] });
    },
  });
};
```

- [ ] **Step 2: Verify + commit**

```bash
pnpm tsc:ci && pnpm lint
git add src/hooks/admin/useAdminEvents.ts
git commit -m "Added TanStack Query hooks for admin events"
```

The `editionId as string` / `id as string` casts inside `queryFn` are safe because `enabled` gates the query on non-null; if the linter dislikes the cast, guard with an explicit `if(editionId === null) throw` inside the fetcher and report.

---

## Task 9: Extend ConfirmDialog with a no-typing mode

**Files:** Modify `src/components/admin/ConfirmDialog.tsx`

- [ ] **Step 1: Make `confirmPhrase` optional; when omitted, no typed confirmation is required**

Edit the props interface and body. Change `confirmPhrase: string;` to `confirmPhrase?: string;`. Then update the matching logic + render so that when `confirmPhrase` is undefined, the input is hidden and the confirm button is enabled (subject only to `pending`).

Replace the component body's `matches` line and the typed-input block:

```tsx
  const [typed, setTyped] = useState<string>('');
  const requiresTyping: boolean = confirmPhrase !== undefined;
  const matches: boolean = !requiresTyping || typed === confirmPhrase;
```

and the input block (the `<div className="flex flex-col gap-2">...</div>` containing the Label+Input) becomes conditional:

```tsx
        {
          requiresTyping &&
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm-phrase">
                {`Tapez « ${confirmPhrase ?? ''} » pour confirmer`}
              </Label>
              <Input
                id="confirm-phrase"
                value={typed}
                onChange={(e): void => setTyped(e.target.value)}
                autoComplete="off"
              />
            </div>
        }
```

Leave the `disabled={!matches || pending}` on `AlertDialogAction` as-is (now correct for both modes). Leave the `setTyped('')` reset on close as-is.

- [ ] **Step 2: Verify (the existing editions delete still requires typing)**

```bash
pnpm tsc:ci && pnpm lint
```
The editions `EditionsTable` passes `confirmPhrase={String(...year)}`, so it still requires typing — unchanged behavior. Only callers that omit `confirmPhrase` get the no-typing mode.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/ConfirmDialog.tsx
git commit -m "Made ConfirmDialog confirmPhrase optional (no-typing mode)"
```

---

## Task 10: TagsInput (chips for genres/artists)

**Files:** Create `src/app/admin/events/TagsInput.tsx`

- [ ] **Step 1: Write `src/app/admin/events/TagsInput.tsx`**

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React, { useState } from 'react';
import { X } from 'lucide-react';

/* Component imports ----------------------------------- */
import { Badge } from 'components/ui/badge';
import { Input } from 'components/ui/input';

/* TagsInput component prop types ---------------------- */
interface TagsInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  id?: string;
}

/* TagsInput component --------------------------------- */
const TagsInput: React.FC<TagsInputProps> = (
  {
    value,
    onChange,
    placeholder = 'Ajouter… (Entrée)',
    id,
  },
) => {
  const [draft, setDraft] = useState<string>('');

  const addTag = (): void => {
    const trimmed = draft.trim();
    if(trimmed.length === 0 || value.includes(trimmed)) {
      setDraft('');
      return;
    }
    onChange([...value, trimmed]);
    setDraft('');
  };

  const removeAt = (index: number): void => {
    onChange(value.filter((_, i) => i !== index));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if(e.key === 'Enter') {
      e.preventDefault();
      addTag();
    } else if(e.key === 'Backspace' && draft.length === 0 && value.length > 0) {
      removeAt(value.length - 1);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {
        value.length > 0 &&
          <div className="flex flex-wrap gap-1">
            {
              value.map((tag, index) => (
                <Badge key={`${tag}-${index}`} variant="secondary" className="gap-1">
                  {tag}
                  <button
                    type="button"
                    aria-label={`Retirer ${tag}`}
                    onClick={(): void => removeAt(index)}
                    className="ml-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            }
          </div>
      }
      <Input
        id={id}
        value={draft}
        placeholder={placeholder}
        onChange={(e): void => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={(): void => addTag()}
      />
    </div>
  );
};

/* Export TagsInput component -------------------------- */
export default TagsInput;
```

- [ ] **Step 2: Verify + commit**

```bash
pnpm tsc:ci && pnpm lint
git add src/app/admin/events/TagsInput.tsx
git commit -m "Added TagsInput chips component"
```

`lucide-react` is already a dependency (used elsewhere). If `X` isn't exported, use another icon present in the project or a plain `×` character; report.

---

## Task 11: DnD primitives (SortableList + SortableRow)

**Files:** Create `src/app/admin/events/SortableList.tsx`, `src/app/admin/events/SortableRow.tsx`

One generic sortable list reused by all three child sections.

- [ ] **Step 1: Write `src/app/admin/events/SortableRow.tsx`**

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

/* SortableRow component prop types -------------------- */
interface SortableRowProps {
  id: string;
  children: React.ReactNode;
}

/* SortableRow component ------------------------------- */
const SortableRow: React.FC<SortableRowProps> = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2 rounded-md border border-border p-3">
      <button
        type="button"
        className="mt-1 cursor-grab text-muted-foreground"
        aria-label="Réordonner"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
};

/* Export SortableRow component ------------------------ */
export default SortableRow;
```

- [ ] **Step 2: Write `src/app/admin/events/SortableList.tsx`**

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import SortableRow from './SortableRow';

/* Type imports ---------------------------------------- */
import type { DragEndEvent } from '@dnd-kit/core';

/* SortableList component prop types ------------------- */
interface SortableListProps {
  /** Stable row ids (react-hook-form field ids). */
  ids: string[];
  onReorder: (from: number, to: number) => void;
  renderRow: (index: number) => React.ReactNode;
}

/* SortableList component ------------------------------ */
const SortableList: React.FC<SortableListProps> = ({ ids, onReorder, renderRow }) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    if(over === null || active.id === over.id) {
      return;
    }
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if(from === -1 || to === -1) {
      return;
    }
    onReorder(from, to);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {ids.map((id, index) => (
            <SortableRow key={id} id={id}>
              {renderRow(index)}
            </SortableRow>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

/* Export SortableList component ----------------------- */
export default SortableList;
```

- [ ] **Step 3: Verify + commit**

```bash
pnpm tsc:ci && pnpm lint
git add src/app/admin/events/SortableList.tsx src/app/admin/events/SortableRow.tsx
git commit -m "Added DnD primitives (SortableList + SortableRow)"
```

---

## Task 12: The three child sections

**Files:** Create `src/app/admin/events/sections/LinksSection.tsx`, `EmbedsSection.tsx`, `AlertsSection.tsx`

Each uses `useFieldArray` + `SortableList` + the row inputs for its type. They receive the react-hook-form `control` typed to `EventFormValues`.

- [ ] **Step 1: Write `src/app/admin/events/sections/LinksSection.tsx`**

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React from 'react';
import { useFieldArray } from 'react-hook-form';

/* Component imports ----------------------------------- */
import { Button } from 'components/ui/button';
import { Input } from 'components/ui/input';
import { Label } from 'components/ui/label';
import SortableList from '../SortableList';

/* Type imports ---------------------------------------- */
import type { Control, UseFormRegister } from 'react-hook-form';
import type { EventFormValues } from 'validation/event';

/* LinksSection component prop types ------------------- */
interface LinksSectionProps {
  control: Control<EventFormValues>;
  register: UseFormRegister<EventFormValues>;
}

/* LinksSection component ------------------------------ */
const LinksSection: React.FC<LinksSectionProps> = ({ control, register }) => {
  const { fields, append, remove, move } = useFieldArray({ control, name: 'links' });

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Liens</h3>
        <Button type="button" variant="outline" size="sm" onClick={(): void => append({ url: '', label: '' })}>
          Ajouter un lien
        </Button>
      </div>
      <SortableList
        ids={fields.map((f) => f.id)}
        onReorder={move}
        renderRow={(index): React.ReactNode => (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 flex flex-col gap-1">
              <Label htmlFor={`links.${index}.label`}>Libellé</Label>
              <Input id={`links.${index}.label`} {...register(`links.${index}.label`)} />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <Label htmlFor={`links.${index}.url`}>URL</Label>
              <Input id={`links.${index}.url`} type="url" {...register(`links.${index}.url`)} />
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={(): void => remove(index)}>
              Retirer
            </Button>
          </div>
        )}
      />
    </section>
  );
};

/* Export LinksSection component ----------------------- */
export default LinksSection;
```

- [ ] **Step 2: Write `src/app/admin/events/sections/EmbedsSection.tsx`**

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React from 'react';
import { useFieldArray, Controller } from 'react-hook-form';

/* Component imports ----------------------------------- */
import { Button } from 'components/ui/button';
import { Input } from 'components/ui/input';
import { Label } from 'components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'components/ui/select';
import SortableList from '../SortableList';

/* Type imports ---------------------------------------- */
import type { Control, UseFormRegister } from 'react-hook-form';
import type { EventFormValues } from 'validation/event';

/* EmbedsSection component prop types ------------------ */
interface EmbedsSectionProps {
  control: Control<EventFormValues>;
  register: UseFormRegister<EventFormValues>;
}

/* EmbedsSection component ----------------------------- */
const EmbedsSection: React.FC<EmbedsSectionProps> = ({ control, register }) => {
  const { fields, append, remove, move } = useFieldArray({ control, name: 'embedLinks' });

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Intégrations (embeds)</h3>
        <Button type="button" variant="outline" size="sm" onClick={(): void => append({ platform: 'instagram', url: '' })}>
          Ajouter un embed
        </Button>
      </div>
      <SortableList
        ids={fields.map((f) => f.id)}
        onReorder={move}
        renderRow={(index): React.ReactNode => (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex flex-col gap-1">
              <Label>Plateforme</Label>
              <Controller
                control={control}
                name={`embedLinks.${index}.platform`}
                render={({ field }): React.ReactElement => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <Label htmlFor={`embedLinks.${index}.url`}>URL</Label>
              <Input id={`embedLinks.${index}.url`} type="url" {...register(`embedLinks.${index}.url`)} />
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={(): void => remove(index)}>
              Retirer
            </Button>
          </div>
        )}
      />
    </section>
  );
};

/* Export EmbedsSection component ---------------------- */
export default EmbedsSection;
```

- [ ] **Step 3: Write `src/app/admin/events/sections/AlertsSection.tsx`**

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React from 'react';
import { useFieldArray, Controller } from 'react-hook-form';

/* Component imports ----------------------------------- */
import { Button } from 'components/ui/button';
import { Input } from 'components/ui/input';
import { Label } from 'components/ui/label';
import { Textarea } from 'components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'components/ui/select';
import SortableList from '../SortableList';

/* Type imports ---------------------------------------- */
import type { Control, UseFormRegister } from 'react-hook-form';
import type { EventFormValues } from 'validation/event';

/* AlertsSection component prop types ------------------ */
interface AlertsSectionProps {
  control: Control<EventFormValues>;
  register: UseFormRegister<EventFormValues>;
}

/* AlertsSection component ----------------------------- */
const AlertsSection: React.FC<AlertsSectionProps> = ({ control, register }) => {
  const { fields, append, remove, move } = useFieldArray({ control, name: 'alerts' });

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Alertes</h3>
        <Button type="button" variant="outline" size="sm" onClick={(): void => append({ variant: 'warning', title: '', content: '' })}>
          Ajouter une alerte
        </Button>
      </div>
      <SortableList
        ids={fields.map((f) => f.id)}
        onReorder={move}
        renderRow={(index): React.ReactNode => (
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex flex-col gap-1">
                <Label>Type</Label>
                <Controller
                  control={control}
                  name={`alerts.${index}.variant`}
                  render={({ field }): React.ReactElement => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Info</SelectItem>
                        <SelectItem value="warning">Avertissement</SelectItem>
                        <SelectItem value="destructive">Erreur</SelectItem>
                        <SelectItem value="success">Succès</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <Label htmlFor={`alerts.${index}.title`}>Titre (optionnel)</Label>
                <Input id={`alerts.${index}.title`} {...register(`alerts.${index}.title`)} />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={`alerts.${index}.content`}>Contenu</Label>
              <Textarea id={`alerts.${index}.content`} rows={2} {...register(`alerts.${index}.content`)} />
            </div>
            <Button type="button" variant="ghost" size="sm" className="self-end" onClick={(): void => remove(index)}>
              Retirer
            </Button>
          </div>
        )}
      />
    </section>
  );
};

/* Export AlertsSection component ---------------------- */
export default AlertsSection;
```

- [ ] **Step 4: Verify + commit**

```bash
pnpm tsc:ci && pnpm lint
git add src/app/admin/events/sections
git commit -m "Added event child sections (links/embeds/alerts) with DnD"
```

Confirm `Select`/`SelectContent`/`SelectItem`/`SelectTrigger`/`SelectValue` are exported from `components/ui/select` (they are standard shadcn). If `useFieldArray` typing complains that `append` needs all required fields, the append default objects above include every required field per the form schema — adjust if the schema differs and report.

---

## Task 13: EventForm (atomic form)

**Files:** Create `src/app/admin/events/EventForm.tsx`

- [ ] **Step 1: Write `src/app/admin/events/EventForm.tsx`**

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

/* Component imports ----------------------------------- */
import { Button } from 'components/ui/button';
import { Input } from 'components/ui/input';
import { Label } from 'components/ui/label';
import { Textarea } from 'components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'components/ui/select';
import TagsInput from './TagsInput';
import LinksSection from './sections/LinksSection';
import EmbedsSection from './sections/EmbedsSection';
import AlertsSection from './sections/AlertsSection';

/* Module imports (project) ---------------------------- */
import { eventFormSchema } from 'validation/event';
import { eventCategories } from 'types/eventCategories';
import { parisInputToUtc } from 'lib/festivalTime';
import { useCreateEvent, useUpdateEvent } from 'hooks/admin/useAdminEvents';

/* Type imports ---------------------------------------- */
import type { EventFormValues, CreateEventInput, UpdateEventInput } from 'validation/event';

/* EventForm component prop types ---------------------- */
interface EventFormProps {
  editionId: string;
  editionYear: number;
  /** Present = edit mode. */
  eventId?: string;
  initialValues: EventFormValues;
}

/* Helpers --------------------------------------------- */
const toApiTimes = (values: EventFormValues): { startTime: string; endTime: string | null } => ({
  startTime: parisInputToUtc(values.startTime).toISOString(),
  endTime: (values.endTime === undefined || values.endTime === '')
    ? null
    : parisInputToUtc(values.endTime).toISOString(),
});

/* EventForm component --------------------------------- */
const EventForm: React.FC<EventFormProps> = (
  {
    editionId,
    editionYear,
    eventId,
    initialValues,
  },
) => {
  const router = useRouter();
  const isEdit: boolean = eventId !== undefined;
  const createMutation = useCreateEvent();
  const updateMutation = useUpdateEvent();

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: initialValues,
  });

  const onSubmit = (values: EventFormValues): void => {
    const times = toApiTimes(values);
    const shared = {
      name: values.name,
      description: values.description,
      category: values.category,
      status: values.status,
      genres: values.genres,
      artists: values.artists,
      priceText: values.priceText,
      locationName: values.locationName,
      locationAddress: values.locationAddress,
      links: values.links,
      embedLinks: values.embedLinks,
      alerts: values.alerts,
      ...times,
    };
    if(isEdit && eventId !== undefined) {
      updateMutation.mutate(
        { id: eventId, input: shared as UpdateEventInput },
        {
          onSuccess: (): void => { toast.success('Événement mis à jour.'); router.push(`/admin/events?edition=${editionId}`); },
          onError: (error): void => { toast.error(error.message); },
        },
      );
      return;
    }
    createMutation.mutate(
      { ...shared, editionId } as CreateEventInput,
      {
        onSuccess: (): void => { toast.success('Événement créé.'); router.push(`/admin/events?edition=${editionId}`); },
        onError: (error): void => { toast.error(error.message); },
      },
    );
  };

  const pending: boolean = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={(e): void => { void form.handleSubmit(onSubmit)(e); }} className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{isEdit ? 'Modifier l\'événement' : 'Nouvel événement'}</h1>
        <span className="text-sm text-muted-foreground">{`Édition ${editionYear}`}</span>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="name">Nom</Label>
        <Input id="name" {...form.register('name')} />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="locationName">Lieu</Label>
        <Input id="locationName" {...form.register('locationName')} />
        {
          form.formState.errors.locationName !== undefined &&
            <p className="text-sm text-destructive">Lieu requis.</p>
        }
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="locationAddress">Adresse (pour la carte)</Label>
        <Input id="locationAddress" {...form.register('locationAddress')} />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1 flex flex-col gap-1">
          <Label htmlFor="startTime">Début</Label>
          <Input id="startTime" type="datetime-local" {...form.register('startTime')} />
          {
            form.formState.errors.startTime !== undefined &&
              <p className="text-sm text-destructive">Début requis.</p>
          }
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <Label htmlFor="endTime">Fin (optionnelle)</Label>
          <Input id="endTime" type="datetime-local" {...form.register('endTime')} />
          {
            form.formState.errors.endTime !== undefined &&
              <p className="text-sm text-destructive">{form.formState.errors.endTime.message}</p>
          }
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1 flex flex-col gap-1">
          <Label>Catégorie</Label>
          <Controller
            control={form.control}
            name="category"
            render={({ field }): React.ReactElement => (
              <Select value={field.value ?? ''} onValueChange={(v): void => field.onChange(v === '' ? undefined : v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {eventCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <Label>Statut</Label>
          <Controller
            control={form.control}
            name="status"
            render={({ field }): React.ReactElement => (
              <Select value={field.value ?? ''} onValueChange={(v): void => field.onChange(v === '' ? undefined : v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="canceled">Annulé</SelectItem>
                  <SelectItem value="postponed">Reporté</SelectItem>
                  <SelectItem value="rescheduled">Reprogrammé</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="priceText">Tarif</Label>
        <Input id="priceText" {...form.register('priceText')} placeholder="Gratuit, 9€…" />
      </div>

      <div className="flex flex-col gap-1">
        <Label>Genres</Label>
        <Controller
          control={form.control}
          name="genres"
          render={({ field }): React.ReactElement => (
            <TagsInput value={field.value} onChange={field.onChange} placeholder="Rock, Techno… (Entrée)" />
          )}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label>Artistes</Label>
        <Controller
          control={form.control}
          name="artists"
          render={({ field }): React.ReactElement => (
            <TagsInput value={field.value} onChange={field.onChange} placeholder="Nom d'artiste… (Entrée)" />
          )}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="description">Description (Markdown)</Label>
        <Textarea id="description" rows={6} {...form.register('description')} />
      </div>

      <LinksSection control={form.control} register={form.register} />
      <EmbedsSection control={form.control} register={form.register} />
      <AlertsSection control={form.control} register={form.register} />

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={(): void => router.push(`/admin/events?edition=${editionId}`)}>
          Annuler
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Enregistrement…' : (isEdit ? 'Enregistrer' : 'Créer')}
        </Button>
      </div>
    </form>
  );
};

/* Export EventForm component -------------------------- */
export default EventForm;
```

- [ ] **Step 2: Verify typecheck/lint**

```bash
pnpm tsc:ci && pnpm lint
```

Notes:
- `zodResolver(eventFormSchema)` — the resolver type should match `EventFormValues`. If a generic mismatch appears (the `.refine` can make the inferred input/output types differ), use `zodResolver(eventFormSchema) as never` like the editions form did, and report.
- The `shared as UpdateEventInput` / `as CreateEventInput` casts bridge the form value shape (with converted times spread in) to the API input type. Keep them localized.
- Category `Select`: shadcn `SelectItem` cannot have an empty-string value; the "—/clear" is represented by the `SelectValue placeholder` and the absence of selection. We never render a `SelectItem value=""`. To clear a chosen category, the user can't unset via this Select — acceptable for 3b (category is set-once-ish); if you want a clear option, add a `SelectItem value="__none__"` and map it to `undefined` in `onValueChange`. Implement the `__none__` clear option to be safe and report.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/events/EventForm.tsx
git commit -m "Added atomic EventForm (core + child sections)"
```

---

## Task 14: Form routes (new + edit)

**Files:** Create `src/app/admin/events/new/page.tsx`, `src/app/admin/events/[id]/page.tsx`, `src/app/admin/events/EventEditLoader.tsx`

- [ ] **Step 1: Write `src/app/admin/events/new/page.tsx`** (server: resolve edition + blank initial values)

```tsx
/* Framework imports ----------------------------------- */
import React from 'react';
import { notFound } from 'next/navigation';

/* Component imports ----------------------------------- */
import EventForm from '../EventForm';

/* Module imports (project) ---------------------------- */
import { requireRole } from 'auth/helpers';
import { db } from 'db';
import { editions } from 'db/schema';
import { eq } from 'drizzle-orm';

/* Type imports ---------------------------------------- */
import type { EventFormValues } from 'validation/event';

/* Blank form values ----------------------------------- */
const blankValues = (): EventFormValues => ({
  name: '',
  description: '',
  category: undefined,
  status: undefined,
  genres: [],
  artists: [],
  priceText: '',
  locationName: '',
  locationAddress: '',
  startTime: '',
  endTime: '',
  links: [],
  embedLinks: [],
  alerts: [],
});

/* NewEventPage component ------------------------------ */
const NewEventPage = async (
  { searchParams }: { searchParams: Promise<{ edition?: string }> },
): Promise<React.ReactElement> => {
  await requireRole('admin', 'editor');
  const { edition: editionId } = await searchParams;
  if(editionId === undefined) {
    notFound();
  }
  const rows = await db.select({ id: editions.id, year: editions.year }).from(editions).where(eq(editions.id, editionId)).limit(1);
  const ed = rows[0];
  if(ed === undefined) {
    notFound();
  }
  return <EventForm editionId={ed.id} editionYear={ed.year} initialValues={blankValues()} />;
};

/* Export NewEventPage component ----------------------- */
export default NewEventPage;
```

- [ ] **Step 2: Write `src/app/admin/events/EventEditLoader.tsx`** (client: fetch event → EventForm)

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import EventForm from './EventForm';

/* Module imports (project) ---------------------------- */
import { useEventQuery } from 'hooks/admin/useAdminEvents';
import { toParisInput } from 'lib/festivalTime';

/* Type imports ---------------------------------------- */
import type { EventFormValues } from 'validation/event';
import type { AdminEventDetail } from 'db/queries/admin/getEventForEdit';
import type { EventCategory } from 'types/eventCategories';

/* EventEditLoader component prop types ---------------- */
interface EventEditLoaderProps {
  eventId: string;
  editionYear: number;
}

/* Helpers --------------------------------------------- */
const toFormValues = (d: AdminEventDetail): EventFormValues => ({
  name: d.name ?? '',
  description: d.description ?? '',
  category: (d.category ?? undefined) as EventCategory | undefined,
  status: (d.status ?? undefined) as EventFormValues['status'],
  genres: d.genres,
  artists: d.artists,
  priceText: d.priceText ?? '',
  locationName: d.locationName,
  locationAddress: d.locationAddress ?? '',
  startTime: toParisInput(new Date(d.startTime)),
  endTime: d.endTime === null ? '' : toParisInput(new Date(d.endTime)),
  links: d.links,
  embedLinks: d.embedLinks,
  alerts: d.alerts.map((a) => ({ variant: a.variant, title: a.title ?? '', content: a.content })),
});

/* EventEditLoader component --------------------------- */
const EventEditLoader: React.FC<EventEditLoaderProps> = ({ eventId, editionYear }) => {
  const query = useEventQuery(eventId);

  if(query.isLoading) {
    return <p className="text-muted-foreground">Chargement…</p>;
  }
  if(query.isError || query.data === undefined) {
    return <p className="text-destructive">Impossible de charger l&apos;événement.</p>;
  }

  const detail = query.data;
  return (
    <EventForm
      editionId={detail.editionId}
      editionYear={editionYear}
      eventId={detail.id}
      initialValues={toFormValues(detail)}
    />
  );
};

/* Export EventEditLoader component -------------------- */
export default EventEditLoader;
```

- [ ] **Step 3: Write `src/app/admin/events/[id]/page.tsx`** (server: guard + resolve edition year)

```tsx
/* Framework imports ----------------------------------- */
import React from 'react';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';

/* Component imports ----------------------------------- */
import EventEditLoader from '../EventEditLoader';

/* Module imports (project) ---------------------------- */
import { requireRole } from 'auth/helpers';
import { db } from 'db';
import { events, editions } from 'db/schema';

/* EditEventPage component ----------------------------- */
const EditEventPage = async (
  { params }: { params: Promise<{ id: string }> },
): Promise<React.ReactElement> => {
  await requireRole('admin', 'editor');
  const { id } = await params;
  const rows = await db
    .select({ year: editions.year })
    .from(events)
    .innerJoin(editions, eq(events.editionId, editions.id))
    .where(eq(events.id, id))
    .limit(1);
  const row = rows[0];
  if(row === undefined) {
    notFound();
  }
  return <EventEditLoader eventId={id} editionYear={row.year} />;
};

/* Export EditEventPage component ---------------------- */
export default EditEventPage;
```

- [ ] **Step 4: Verify typecheck/lint**

```bash
pnpm tsc:ci && pnpm lint
```

Note: `requireRole('admin','editor')` redirects a viewer to `/admin` (per the Spec 2 helper). That's the intended gate for the form routes (only admin/editor can open the create/edit form). The list page (Task 15) remains viewable by any role.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/events/new/page.tsx src/app/admin/events/EventEditLoader.tsx "src/app/admin/events/[id]/page.tsx"
git commit -m "Added event form routes (new + edit)"
```

---

## Task 15: Events list page (picker + table) replacing the placeholder

**Files:** Modify `src/app/admin/events/page.tsx`; Create `src/app/admin/events/EventsManager.tsx`

Note: Task 14 created `src/app/admin/events/[id]/page.tsx` and `new/page.tsx`; this task replaces the existing placeholder `src/app/admin/events/page.tsx` from 3a.

- [ ] **Step 1: Write `src/app/admin/events/EventsManager.tsx`**

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

/* Component imports ----------------------------------- */
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'components/ui/select';
import { Button } from 'components/ui/button';
import { Input } from 'components/ui/input';
import { Badge } from 'components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from 'components/ui/table';
import ConfirmDialog from 'components/admin/ConfirmDialog';

/* Module imports (project) ---------------------------- */
import { useEditionsQuery } from 'hooks/admin/useEditions';
import { useEventsQuery, useDeleteEvent } from 'hooks/admin/useAdminEvents';
import { toParisInput } from 'lib/festivalTime';

/* Type imports ---------------------------------------- */
import type { AdminEventSummary } from 'db/queries/admin/listEditionEventsAdmin';

/* EventsManager component prop types ------------------ */
interface EventsManagerProps {
  canManage: boolean;
}

/* EventsManager component ----------------------------- */
const EventsManager: React.FC<EventsManagerProps> = ({ canManage }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlEdition = searchParams.get('edition');

  const editionsQuery = useEditionsQuery();
  const [editionId, setEditionId] = useState<string | null>(urlEdition);
  const [filter, setFilter] = useState<string>('');
  const [deleting, setDeleting] = useState<AdminEventSummary | undefined>(undefined);

  // Default to the latest edition once editions load and nothing is selected.
  useEffect(
    () => {
      if(editionId === null && editionsQuery.data !== undefined && editionsQuery.data.length > 0) {
        const latest = editionsQuery.data[0]; // listAllEditions is year DESC
        setEditionId(latest.id);
        router.replace(`/admin/events?edition=${latest.id}`);
      }
    },
    [editionId, editionsQuery.data, router],
  );

  const eventsQuery = useEventsQuery(editionId);
  const deleteMutation = useDeleteEvent();

  const onEditionChange = (value: string): void => {
    setEditionId(value);
    router.replace(`/admin/events?edition=${value}`);
  };

  const confirmDelete = (): void => {
    if(deleting === undefined) {
      return;
    }
    const target = deleting;
    deleteMutation.mutate(target.id, {
      onSuccess: (): void => { toast.success('Événement supprimé.'); setDeleting(undefined); },
      onError: (error): void => { toast.error(error.message); },
    });
  };

  const events: AdminEventSummary[] = eventsQuery.data ?? [];
  const filtered = filter.length > 0
    ? events.filter((e) => (e.name ?? '').toLowerCase().includes(filter.toLowerCase()))
    : events;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Événements</h1>
        {
          canManage && editionId !== null &&
            <Button asChild>
              <Link href={`/admin/events/new?edition=${editionId}`}>Nouvel événement</Link>
            </Button>
        }
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={editionId ?? undefined} onValueChange={onEditionChange}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Édition" /></SelectTrigger>
          <SelectContent>
            {(editionsQuery.data ?? []).map((ed) => (
              <SelectItem key={ed.id} value={ed.id}>{`${ed.year}${ed.isPublished ? '' : ' (brouillon)'}`}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={filter}
          onChange={(e): void => setFilter(e.target.value)}
          placeholder="Filtrer par nom…"
          className="w-64"
        />
      </div>

      {
        eventsQuery.isLoading
          ? <p className="text-muted-foreground">Chargement…</p>
          : eventsQuery.isError
            ? <p className="text-destructive">Impossible de charger les événements.</p>
            : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Début</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Liens</TableHead>
                    {canManage && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {
                    filtered.map((ev) => (
                      <TableRow key={ev.id}>
                        <TableCell className="font-medium">{ev.name ?? '(sans nom)'}</TableCell>
                        <TableCell>{toParisInput(new Date(ev.startTime)).replace('T', ' ')}</TableCell>
                        <TableCell>{ev.category ?? '—'}</TableCell>
                        <TableCell>{ev.status !== null ? <Badge variant="secondary">{ev.status}</Badge> : '—'}</TableCell>
                        <TableCell>{`${ev.linkCount}/${ev.embedCount}/${ev.alertCount}`}</TableCell>
                        {
                          canManage &&
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button asChild variant="outline" size="sm">
                                  <Link href={`/admin/events/${ev.id}`}>Modifier</Link>
                                </Button>
                                <Button variant="destructive" size="sm" onClick={(): void => setDeleting(ev)}>
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
            )
      }

      {
        canManage &&
          <ConfirmDialog
            open={deleting !== undefined}
            onOpenChange={(o): void => { if(!o) { setDeleting(undefined); } }}
            title={`Supprimer l'événement « ${deleting?.name ?? ''} » ?`}
            description={<span>Cette action est définitive et supprime aussi ses liens, embeds et alertes.</span>}
            confirmLabel="Supprimer"
            pending={deleteMutation.isPending}
            onConfirm={confirmDelete}
          />
      }
    </div>
  );
};

/* Export EventsManager component ---------------------- */
export default EventsManager;
```

(`confirmPhrase` is omitted → no-typing confirm mode from Task 9. The link/embed/alert counts render compactly as `L/E/A`.)

- [ ] **Step 2: Replace `src/app/admin/events/page.tsx`** (was the 3a placeholder)

```tsx
/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import EventsManager from './EventsManager';

/* Module imports (project) ---------------------------- */
import { requireSession } from 'auth/helpers';

/* EventsPage component -------------------------------- */
const EventsPage = async (): Promise<React.ReactElement> => {
  const session = await requireSession();
  const role: string = (session.user as { role?: string }).role ?? 'viewer';
  const canManage: boolean = role === 'admin' || role === 'editor';
  return <EventsManager canManage={canManage} />;
};

/* Export EventsPage component ------------------------- */
export default EventsPage;
```

- [ ] **Step 3: Verify typecheck/lint**

```bash
pnpm tsc:ci && pnpm lint
```

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/events/EventsManager.tsx src/app/admin/events/page.tsx
git commit -m "Added events list page (edition picker + table) replacing placeholder"
```

---

## Task 16: End-to-end verification + build

**Files:** none

- [ ] **Step 1: Build**

```bash
pnpm build
```
Expected: exit 0. Routes include `/admin/events`, `/admin/events/new`, `/admin/events/[id]`, `/api/admin/events`, `/api/admin/events/[id]`.

- [ ] **Step 2: Browser walk-through (manual)**

```bash
( BETTER_AUTH_URL=http://localhost:3000 pnpm dev --port 3000 > /tmp/3b-final.log 2>&1 & )
sleep 8
```
In a browser at `http://localhost:3000`, logged in as admin:
1. `/admin` → sidebar → Événements → lands on `/admin/events`, edition picker defaults to 2024, table lists 44 events with L/E/A counts.
2. Switch the picker to 2023 → table updates; URL shows `?edition=<2023 id>`.
3. "Nouvel événement" → form. Fill name, lieu, début (a datetime), add 2 genres (chips), add 2 links, drag to reorder them, add 1 alert. Save → toast, back to the list, new event present.
4. Open it (Modifier) → verify the links are in the reordered order, times show the Paris value you entered. Reorder again, remove one link, Save. Re-open → changes persisted.
5. Public check: open `/2024` in another tab — your new event appears (after ~60s edge cache; immediate on first dev compile) under its category, with links in order, and the start time matches the Paris time you entered.
6. Delete the test event from the list (plain confirm) → gone.

Kill the server:
```bash
pkill -f "next dev --port 3000" 2>/dev/null || true
```

- [ ] **Step 3: Lint/tsc final**

```bash
pnpm tsc:ci && pnpm lint
```
Expected 0 errors (1 pre-existing `<img>` warning OK).

- [ ] **Step 4: No commit** (verification only). Fix in the owning task's file if anything fails, then re-verify.

---

## Final verification checklist

- [ ] `pnpm tsc:ci` clean; `pnpm lint` clean (1 pre-existing warning); `pnpm build` exit 0
- [ ] `/api/admin/events` GET 401 unauth / 200 authed (44 for 2024) / 400 missing editionId; POST 201 / 400 invalid
- [ ] `/api/admin/events/[id]` GET 200/404; PATCH replaces children (count changes) / 404; DELETE 200 then 404
- [ ] Browser: create event with reordered children → edit shows persisted order → public `/2024` shows it with correct child order + Paris time → delete works
- [ ] DB restored to seed counts after verification (test events deleted)
- [ ] Editor write path is code-present (curl via admin proves the guard + happy path; full editor-user test is 3d)

---

## Spec coverage map

- §4 architecture/endpoints/files — Tasks 1, 6, 7, 8, and the UI tasks
- §5 validation + datetime — Tasks 2, 3
- §6 mutations (transaction, replace-children) — Task 5
- §7 admin read queries — Task 4
- §8 UI (list, form, sections, delete, TagsInput) — Tasks 9–15
- §9 rollout — Tasks 1–16
- §10 risks — Task 2/3 (tz), Task 5 (transaction), Task 11–13 (DnD+rhf), Task 7 (replace-children verified)
- §11 later sub-specs — out of scope
