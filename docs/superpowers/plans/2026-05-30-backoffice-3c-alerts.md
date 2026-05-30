# Backoffice 3c — General Alerts CRUD + Public Banner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin CRUD for edition-scoped general alerts (create/edit/publish/delete + drag-reorder, admin-only) at `/admin/alerts`, plus a public `<GeneralAlertsBanner>` on `/[year]` replacing the Spec-1 bullet-list placeholder.

**Architecture:** New `/api/admin/alerts` REST routes (GET/POST/PATCH/DELETE + a dedicated `/reorder`), guarded `admin`-only, zod-validated, backed by Drizzle mutations (reorder uses a collision-safe two-pass position update). Admin client uses TanStack Query + a per-row publish Switch + `@dnd-kit` row reordering (reusing 3b's `SortableList`) + a create/edit dialog. The public banner renders published alerts (already returned by `getEdition`) as shadcn `<Alert>` with markdown content via the existing `DescriptionRender`.

**Tech Stack:** Next.js 16, React 19, TS 6, Drizzle + Supabase, BetterAuth, @tanstack/react-query, @dnd-kit, react-hook-form, zod, shadcn/ui, sonner, react-markdown (via DescriptionRender), Tailwind v4, pnpm.

**Spec source:** `docs/superpowers/specs/2026-05-30-backoffice-3c-alerts-design.md`. Read it once before Task 1.

**Verification note:** No test framework (`CLAUDE.md`). "Verify" = `pnpm tsc:ci`, `pnpm lint`, `pnpm build`, `curl` with an admin cookie jar, browser checks. DB is Supabase; dev server must run with `BETTER_AUTH_URL=http://localhost:3000` on port 3000 (a seeded admin exists in `.env.local`).

**Conventions** (`CLAUDE.md`): 2-space indent, single quotes TS / double quotes JSX, semicolons, always-multiline trailing commas, **no space after `if`/`for`/`while`/`catch`** (`if(x)`), `strict-boolean-expressions`, `explicit-function-return-type`, comment-banner, `import type`, `React.FC<Props>` default-exported components, react-hooks v7, `toast.*` returns a value → discard in block-body. `general_alerts` table has `(edition_id, position)` UNIQUE + `position >= 0` CHECK. Path alias `*` → `./src/*`. Run `pnpm lint-fix` after edits.

**Reuse map:** `authorizeApi(['admin'])` from `auth/apiGuard`; `useEditionsQuery` from `hooks/admin/useEditions` (edition picker); `ConfirmDialog` (no-typing mode) from `components/admin/ConfirmDialog`; `SortableList`/`SortableRow` from `src/app/admin/events/`; `DescriptionRender` (prop `markdown: string`) from `components/DescriptionRender/DescriptionRender`; shadcn `Alert`/`AlertTitle`/`AlertDescription` (variants `default|destructive|warning|success`). The editions hooks/route/table/dialog and the events list/manager are the closest templates.

---

## Task 1: Shared general-alert validation schemas

**Files:** Create `src/validation/generalAlert.ts`

- [ ] **Step 1: Write `src/validation/generalAlert.ts`**

```ts
/* Module imports -------------------------------------- */
import { z } from 'zod';

/* Schemas --------------------------------------------- */
const variantEnum = z.enum(['default', 'destructive', 'warning', 'success']);

const coreShape = {
  variant: variantEnum,
  title: z.string().trim().max(200).optional(),
  content: z.string().trim().min(1, 'Contenu requis').max(2000),
  isPublished: z.boolean(),
};

export const createGeneralAlertSchema = z.object({
  ...coreShape,
  editionId: z.uuid(),
});

export const updateGeneralAlertSchema = z.object(coreShape);

export const reorderAlertsSchema = z.object({
  editionId: z.uuid(),
  orderedIds: z.array(z.uuid()).min(1),
});

/* Inferred types -------------------------------------- */
export type CreateGeneralAlertInput = z.infer<typeof createGeneralAlertSchema>;
export type UpdateGeneralAlertInput = z.infer<typeof updateGeneralAlertSchema>;
export type ReorderAlertsInput = z.infer<typeof reorderAlertsSchema>;
```

- [ ] **Step 2: Verify + commit**

```bash
pnpm tsc:ci && pnpm lint
git add src/validation/generalAlert.ts
git commit -m "Added shared general-alert validation schemas"
```
`git commit` without `--no-verify`. Both clean (one pre-existing `<img>` warning in `DescriptionRender.tsx` acceptable throughout). `z.uuid()` is the zod-v4 form already used in `validation/event.ts`; if it doesn't typecheck, use whatever that file uses and report.

---

## Task 2: General-alert mutations (incl. two-pass reorder)

**Files:** Create `src/db/mutations/generalAlerts.ts`

- [ ] **Step 1: Write `src/db/mutations/generalAlerts.ts`**

```ts
/* Module imports -------------------------------------- */
import { and, asc, eq, sql } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../index';
import { generalAlerts } from '../schema';

/* Type imports ---------------------------------------- */
import type { CreateGeneralAlertInput, UpdateGeneralAlertInput } from 'validation/generalAlert';
import type { GeneralAlertRow } from '../schema';

/* Helpers --------------------------------------------- */
const emptyToNull = (value: string | undefined): string | null => {
  if(value === undefined || value.length === 0) {
    return null;
  }
  return value;
};

/* Mutations ------------------------------------------- */
export const createGeneralAlert = async (input: CreateGeneralAlertInput): Promise<GeneralAlertRow> => {
  return db.transaction(async (tx) => {
    const maxRows = await tx
      .select({ max: sql<number>`COALESCE(MAX(${generalAlerts.position}), -1)::int` })
      .from(generalAlerts)
      .where(eq(generalAlerts.editionId, input.editionId));
    const nextPosition: number = (maxRows[0]?.max ?? -1) + 1;

    const rows = await tx
      .insert(generalAlerts)
      .values({
        editionId: input.editionId,
        variant: input.variant,
        title: emptyToNull(input.title),
        content: input.content,
        isPublished: input.isPublished,
        position: nextPosition,
      })
      .returning();
    const row = rows[0];
    if(row === undefined) {
      throw new Error('createGeneralAlert: insert returned no row');
    }
    return row;
  });
};

export const updateGeneralAlert = async (id: string, input: UpdateGeneralAlertInput): Promise<GeneralAlertRow | null> => {
  const rows = await db
    .update(generalAlerts)
    .set({
      variant: input.variant,
      title: emptyToNull(input.title),
      content: input.content,
      isPublished: input.isPublished,
      updatedAt: sql`NOW()`,
    })
    .where(eq(generalAlerts.id, id))
    .returning();
  return rows[0] ?? null;
};

export const deleteGeneralAlert = async (id: string): Promise<boolean> => {
  const rows = await db.delete(generalAlerts).where(eq(generalAlerts.id, id)).returning({ id: generalAlerts.id });
  return rows.length > 0;
};

/**
 * Reorder an edition's alerts to match `orderedIds`. Validates the id set
 * matches the edition's alerts exactly, then reassigns positions in two passes
 * inside one transaction (the (edition_id, position) UNIQUE + position>=0 CHECK
 * forbid negative temporaries): first into a fresh band above the old max, then
 * down to 0..n-1. Returns false on id-set mismatch (-> 400) or missing edition.
 */
export const reorderGeneralAlerts = async (editionId: string, orderedIds: string[]): Promise<boolean> => {
  return db.transaction(async (tx) => {
    const current = await tx
      .select({ id: generalAlerts.id, position: generalAlerts.position })
      .from(generalAlerts)
      .where(eq(generalAlerts.editionId, editionId))
      .orderBy(asc(generalAlerts.position));

    const currentIds = new Set(current.map((r) => r.id));
    if(current.length !== orderedIds.length || !orderedIds.every((id) => currentIds.has(id))) {
      return false;
    }

    const base: number = current.reduce((m, r) => (r.position > m ? r.position : m), -1) + 1;

    // Pass 1: shift everyone into a fresh band [base, base+n) — unique, above old max.
    for(let i = 0; i < orderedIds.length; i++) {
      await tx
        .update(generalAlerts)
        .set({ position: base + i })
        .where(and(eq(generalAlerts.id, orderedIds[i]!), eq(generalAlerts.editionId, editionId)));
    }
    // Pass 2: set final positions 0..n-1 (targets below the band → no collision).
    for(let i = 0; i < orderedIds.length; i++) {
      await tx
        .update(generalAlerts)
        .set({ position: i })
        .where(and(eq(generalAlerts.id, orderedIds[i]!), eq(generalAlerts.editionId, editionId)));
    }
    return true;
  });
};
```

- [ ] **Step 2: Verify + commit**

```bash
pnpm tsc:ci && pnpm lint
git add src/db/mutations/generalAlerts.ts
git commit -m "Added general-alert mutations (create/update/delete + two-pass reorder)"
```
`git commit` without `--no-verify`. Both clean. Notes (adjust + report):
- `orderedIds[i]!` non-null assertion is bounded by the loop; if the linter forbids `!`, capture `const id = orderedIds[i]; if(id === undefined) continue;`.
- If `set({ title: emptyToNull(...) })` or the `GeneralAlertRow` import path complains, mirror `src/db/mutations/events.ts` (which imports row types from `../schema`).

---

## Task 3: Admin alerts read query

**Files:** Create `src/db/queries/admin/listEditionAlerts.ts`

- [ ] **Step 1: Write `src/db/queries/admin/listEditionAlerts.ts`**

```ts
/* Module imports -------------------------------------- */
import { asc, eq } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../../index';
import { generalAlerts } from '../../schema';

/* Types ----------------------------------------------- */
export interface AdminAlertDto {
  id: string;
  variant: 'default' | 'destructive' | 'warning' | 'success';
  title: string | null;
  content: string;
  isPublished: boolean;
  position: number;
}

/* Query ----------------------------------------------- */
export const listEditionAlerts = async (editionId: string): Promise<AdminAlertDto[]> => {
  const rows = await db
    .select({
      id: generalAlerts.id,
      variant: generalAlerts.variant,
      title: generalAlerts.title,
      content: generalAlerts.content,
      isPublished: generalAlerts.isPublished,
      position: generalAlerts.position,
    })
    .from(generalAlerts)
    .where(eq(generalAlerts.editionId, editionId))
    .orderBy(asc(generalAlerts.position));
  return rows;
};
```

- [ ] **Step 2: Verify + commit**

```bash
pnpm tsc:ci && pnpm lint
git add src/db/queries/admin/listEditionAlerts.ts
git commit -m "Added admin listEditionAlerts query"
```
If `generalAlerts.variant` is typed as a string-backed enum (it is — the pgEnum cast makes it `string`), the DTO's literal union may need no cast; if tsc complains drop the literal union to match (report).

---

## Task 4: `GET`/`POST /api/admin/alerts`

**Files:** Create `src/app/api/admin/alerts/route.ts`

- [ ] **Step 1: Write `src/app/api/admin/alerts/route.ts`**

```ts
/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';
import { z } from 'zod';

/* Module imports (project) ---------------------------- */
import { authorizeApi } from 'auth/apiGuard';
import { listEditionAlerts } from 'db/queries/admin/listEditionAlerts';
import { createGeneralAlert } from 'db/mutations/generalAlerts';
import { createGeneralAlertSchema } from 'validation/generalAlert';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* Schema ---------------------------------------------- */
const editionIdSchema = z.uuid();

/* GET — list one edition's alerts (any auth role) ----- */
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
    const alerts = await listEditionAlerts(editionId);
    return NextResponse.json({ alerts });
  } catch(error) {
    console.error('[api/admin/alerts GET] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};

/* POST — create an alert (admin only) ----------------- */
export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const { response } = await authorizeApi(['admin']);
  if(response !== null) {
    return response;
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch(error) {
    console.error('[api/admin/alerts POST] bad json:', error);
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  const parsed = createGeneralAlertSchema.safeParse(body);
  if(!parsed.success) {
    return NextResponse.json({ error: 'invalid_request', issues: parsed.error.issues }, { status: 400 });
  }
  try {
    const alert = await createGeneralAlert(parsed.data);
    return NextResponse.json({ alert }, { status: 201 });
  } catch(error) {
    console.error('[api/admin/alerts POST] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
```

- [ ] **Step 2: Verify typecheck/lint**

```bash
pnpm tsc:ci && pnpm lint
```

- [ ] **Step 3: Curl-verify**

```bash
( BETTER_AUTH_URL=http://localhost:3000 timeout 80 pnpm dev --port 3000 > /tmp/3c-t4.log 2>&1 & )
sleep 24
P=3000; JAR=/tmp/3c-t4.txt; rm -f $JAR
EMAIL=$(grep -E '^ADMIN_EMAIL=' .env.local | cut -d= -f2-)
PASS=$(grep -E '^ADMIN_PASSWORD=' .env.local | cut -d= -f2-)
curl -s -m10 -c $JAR -o /dev/null -X POST "http://localhost:$P/api/auth/sign-in/email" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}"
EDID=$(curl -s -m10 -b $JAR "http://localhost:$P/api/admin/editions" | python3 -c "import sys,json;print(next(e['id'] for e in json.load(sys.stdin)['editions'] if e['year']==2024))")
echo "2024 id: $EDID"
echo -n "GET unauth -> "; curl -s -m10 -o /dev/null -w "%{http_code}\n" "http://localhost:$P/api/admin/alerts?editionId=$EDID"
echo -n "GET authed count -> "; curl -s -m10 -b $JAR "http://localhost:$P/api/admin/alerts?editionId=$EDID" | python3 -c "import sys,json;print(len(json.load(sys.stdin)['alerts']))"
echo -n "GET missing editionId -> "; curl -s -m10 -b $JAR -o /dev/null -w "%{http_code}\n" "http://localhost:$P/api/admin/alerts"
echo -n "POST create published -> "; curl -s -m10 -b $JAR -H "Origin: http://localhost:$P" -X POST "http://localhost:$P/api/admin/alerts" -H "Content-Type: application/json" -d "{\"editionId\":\"$EDID\",\"variant\":\"warning\",\"title\":\"Météo\",\"content\":\"Orages prévus — [infos](https://x.com)\",\"isPublished\":true}" -o /tmp/3c-a1.json -w "%{http_code}\n"
echo -n "POST create draft -> "; curl -s -m10 -b $JAR -H "Origin: http://localhost:$P" -X POST "http://localhost:$P/api/admin/alerts" -H "Content-Type: application/json" -d "{\"editionId\":\"$EDID\",\"variant\":\"default\",\"content\":\"Brouillon\",\"isPublished\":false}" -o /tmp/3c-a2.json -w "%{http_code}\n"
echo -n "POST invalid (empty content) -> "; curl -s -m10 -b $JAR -H "Origin: http://localhost:$P" -X POST "http://localhost:$P/api/admin/alerts" -H "Content-Type: application/json" -d "{\"editionId\":\"$EDID\",\"variant\":\"default\",\"content\":\"\",\"isPublished\":false}" -o /dev/null -w "%{http_code}\n"
echo "created positions:"; cat /tmp/3c-a1.json | python3 -c "import sys,json;print('a1 pos',json.load(sys.stdin)['alert']['position'])"; cat /tmp/3c-a2.json | python3 -c "import sys,json;print('a2 pos',json.load(sys.stdin)['alert']['position'])"
sleep 14
```
Expected: GET unauth → 401; GET authed → 0 (no alerts yet); missing editionId → 400; create published → 201 (position 0); create draft → 201 (position 1); invalid → 400. The two created alerts (positions 0,1) stay for Tasks 5/6. Paste outputs.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/alerts/route.ts
git commit -m "Added GET/POST /api/admin/alerts"
```

---

## Task 5: `PATCH`/`DELETE /api/admin/alerts/[id]`

**Files:** Create `src/app/api/admin/alerts/[id]/route.ts`

- [ ] **Step 1: Write `src/app/api/admin/alerts/[id]/route.ts`**

```ts
/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';
import { z } from 'zod';

/* Module imports (project) ---------------------------- */
import { authorizeApi } from 'auth/apiGuard';
import { updateGeneralAlert, deleteGeneralAlert } from 'db/mutations/generalAlerts';
import { updateGeneralAlertSchema } from 'validation/generalAlert';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* Schema ---------------------------------------------- */
const idSchema = z.uuid();

/* PATCH — update an alert (admin only) ---------------- */
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
    console.error('[api/admin/alerts PATCH] bad json:', error);
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  const parsed = updateGeneralAlertSchema.safeParse(body);
  if(!parsed.success) {
    return NextResponse.json({ error: 'invalid_request', issues: parsed.error.issues }, { status: 400 });
  }
  try {
    const alert = await updateGeneralAlert(id, parsed.data);
    if(alert === null) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ alert });
  } catch(error) {
    console.error('[api/admin/alerts PATCH] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};

/* DELETE — delete an alert (admin only) --------------- */
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
    const deleted = await deleteGeneralAlert(id);
    if(!deleted) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch(error) {
    console.error('[api/admin/alerts DELETE] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
```

- [ ] **Step 2: Verify + curl**

```bash
pnpm tsc:ci && pnpm lint
( BETTER_AUTH_URL=http://localhost:3000 timeout 80 pnpm dev --port 3000 > /tmp/3c-t5.log 2>&1 & )
sleep 24
P=3000; JAR=/tmp/3c-t5.txt; rm -f $JAR
EMAIL=$(grep -E '^ADMIN_EMAIL=' .env.local | cut -d= -f2-)
PASS=$(grep -E '^ADMIN_PASSWORD=' .env.local | cut -d= -f2-)
curl -s -m10 -c $JAR -o /dev/null -X POST "http://localhost:$P/api/auth/sign-in/email" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}"
EDID=$(curl -s -m10 -b $JAR "http://localhost:$P/api/admin/editions" | python3 -c "import sys,json;print(next(e['id'] for e in json.load(sys.stdin)['editions'] if e['year']==2024))")
DRAFT=$(curl -s -m10 -b $JAR "http://localhost:$P/api/admin/alerts?editionId=$EDID" | python3 -c "import sys,json;print(next(a['id'] for a in json.load(sys.stdin)['alerts'] if a['title'] is None))")
echo "draft id: $DRAFT"
echo -n "PATCH publish the draft -> "; curl -s -m10 -b $JAR -H "Origin: http://localhost:$P" -X PATCH "http://localhost:$P/api/admin/alerts/$DRAFT" -H "Content-Type: application/json" -d '{"variant":"default","content":"Brouillon publié","isPublished":true}' -o /dev/null -w "%{http_code}\n"
echo -n "PATCH bad uuid -> "; curl -s -m10 -b $JAR -H "Origin: http://localhost:$P" -X PATCH "http://localhost:$P/api/admin/alerts/not-a-uuid" -H "Content-Type: application/json" -d '{"variant":"default","content":"x","isPublished":true}' -o /dev/null -w "%{http_code}\n"
echo -n "DELETE the draft -> "; curl -s -m10 -b $JAR -H "Origin: http://localhost:$P" -X DELETE "http://localhost:$P/api/admin/alerts/$DRAFT" -o /dev/null -w "%{http_code}\n"
echo -n "DELETE again -> "; curl -s -m10 -b $JAR -H "Origin: http://localhost:$P" -X DELETE "http://localhost:$P/api/admin/alerts/$DRAFT" -o /dev/null -w "%{http_code}\n"
echo -n "remaining alert count (expect 1) -> "; curl -s -m10 -b $JAR "http://localhost:$P/api/admin/alerts?editionId=$EDID" | python3 -c "import sys,json;print(len(json.load(sys.stdin)['alerts']))"
sleep 14
```
Expected: PATCH publish → 200; bad uuid → 400; DELETE → 200; DELETE again → 404; remaining count 1 (the "Météo" published alert at position 0 stays for Task 6/12). Paste outputs.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/admin/alerts/[id]/route.ts"
git commit -m "Added PATCH/DELETE /api/admin/alerts/[id]"
```

---

## Task 6: `POST /api/admin/alerts/reorder`

**Files:** Create `src/app/api/admin/alerts/reorder/route.ts`

- [ ] **Step 1: Write `src/app/api/admin/alerts/reorder/route.ts`**

```ts
/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';

/* Module imports (project) ---------------------------- */
import { authorizeApi } from 'auth/apiGuard';
import { reorderGeneralAlerts } from 'db/mutations/generalAlerts';
import { reorderAlertsSchema } from 'validation/generalAlert';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* POST — reorder an edition's alerts (admin only) ----- */
export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const { response } = await authorizeApi(['admin']);
  if(response !== null) {
    return response;
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch(error) {
    console.error('[api/admin/alerts/reorder POST] bad json:', error);
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  const parsed = reorderAlertsSchema.safeParse(body);
  if(!parsed.success) {
    return NextResponse.json({ error: 'invalid_request', issues: parsed.error.issues }, { status: 400 });
  }
  try {
    const ok = await reorderGeneralAlerts(parsed.data.editionId, parsed.data.orderedIds);
    if(!ok) {
      return NextResponse.json({ error: 'invalid_request', message: 'orderedIds ne correspond pas aux alertes de cette édition' }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch(error) {
    console.error('[api/admin/alerts/reorder POST] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
```

- [ ] **Step 2: Verify + curl (reorder + re-read positions)**

First seed a second alert so there are two to reorder, then reorder and confirm positions swap with no collision.

```bash
pnpm tsc:ci && pnpm lint
( BETTER_AUTH_URL=http://localhost:3000 timeout 85 pnpm dev --port 3000 > /tmp/3c-t6.log 2>&1 & )
sleep 24
P=3000; JAR=/tmp/3c-t6.txt; rm -f $JAR
EMAIL=$(grep -E '^ADMIN_EMAIL=' .env.local | cut -d= -f2-)
PASS=$(grep -E '^ADMIN_PASSWORD=' .env.local | cut -d= -f2-)
curl -s -m10 -c $JAR -o /dev/null -X POST "http://localhost:$P/api/auth/sign-in/email" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}"
EDID=$(curl -s -m10 -b $JAR "http://localhost:$P/api/admin/editions" | python3 -c "import sys,json;print(next(e['id'] for e in json.load(sys.stdin)['editions'] if e['year']==2024))")
# ensure a second alert exists
curl -s -m10 -b $JAR -H "Origin: http://localhost:$P" -X POST "http://localhost:$P/api/admin/alerts" -H "Content-Type: application/json" -d "{\"editionId\":\"$EDID\",\"variant\":\"success\",\"content\":\"Deuxieme\",\"isPublished\":true}" -o /dev/null -w "create2 %{http_code}\n"
echo "before:"; curl -s -m10 -b $JAR "http://localhost:$P/api/admin/alerts?editionId=$EDID" | python3 -c "import sys,json;d=json.load(sys.stdin)['alerts'];print([(a['position'],a['content'][:8]) for a in d])"
IDS=$(curl -s -m10 -b $JAR "http://localhost:$P/api/admin/alerts?editionId=$EDID" | python3 -c "import sys,json;d=json.load(sys.stdin)['alerts'];ids=[a['id'] for a in d];ids.reverse();import json as j;print(j.dumps(ids))")
echo -n "reorder (reversed) -> "; curl -s -m10 -b $JAR -H "Origin: http://localhost:$P" -X POST "http://localhost:$P/api/admin/alerts/reorder" -H "Content-Type: application/json" -d "{\"editionId\":\"$EDID\",\"orderedIds\":$IDS}" -o /dev/null -w "%{http_code}\n"
echo "after:"; curl -s -m10 -b $JAR "http://localhost:$P/api/admin/alerts?editionId=$EDID" | python3 -c "import sys,json;d=json.load(sys.stdin)['alerts'];print([(a['position'],a['content'][:8]) for a in d])"
echo -n "reorder bad set -> "; curl -s -m10 -b $JAR -H "Origin: http://localhost:$P" -X POST "http://localhost:$P/api/admin/alerts/reorder" -H "Content-Type: application/json" -d "{\"editionId\":\"$EDID\",\"orderedIds\":[\"11111111-1111-1111-1111-111111111111\"]}" -o /dev/null -w "%{http_code}\n"
sleep 14
```
Expected: create2 201; "before" shows positions [0,1]; reorder → 200; "after" shows the order reversed (content swapped, positions still 0,1 contiguous, no collision error); bad set → 400. Paste outputs.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/alerts/reorder/route.ts
git commit -m "Added POST /api/admin/alerts/reorder"
```

---

## Task 7: Admin alerts React Query hooks

**Files:** Create `src/hooks/admin/useAdminAlerts.ts`

- [ ] **Step 1: Write `src/hooks/admin/useAdminAlerts.ts`**

```ts
'use client';

/* Module imports -------------------------------------- */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/* Type imports ---------------------------------------- */
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import type { AdminAlertDto } from 'db/queries/admin/listEditionAlerts';
import type { CreateGeneralAlertInput, UpdateGeneralAlertInput } from 'validation/generalAlert';

/* Fetchers -------------------------------------------- */
const fetchAlerts = async (editionId: string): Promise<AdminAlertDto[]> => {
  const res = await fetch(`/api/admin/alerts?editionId=${editionId}`, { cache: 'no-store' });
  if(!res.ok) {
    throw new Error(`Failed to load alerts: ${res.status}`);
  }
  const body = await res.json() as { alerts: AdminAlertDto[] };
  return body.alerts;
};

const postAlert = async (input: CreateGeneralAlertInput): Promise<void> => {
  const res = await fetch('/api/admin/alerts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if(!res.ok) {
    throw new Error(`Création échouée (${res.status})`);
  }
};

const patchAlert = async (vars: { id: string; input: UpdateGeneralAlertInput }): Promise<void> => {
  const res = await fetch(`/api/admin/alerts/${vars.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vars.input),
  });
  if(!res.ok) {
    throw new Error(`Mise à jour échouée (${res.status})`);
  }
};

const deleteAlertRequest = async (id: string): Promise<void> => {
  const res = await fetch(`/api/admin/alerts/${id}`, { method: 'DELETE' });
  if(!res.ok) {
    throw new Error(`Suppression échouée (${res.status})`);
  }
};

const reorderAlertsRequest = async (vars: { editionId: string; orderedIds: string[] }): Promise<void> => {
  const res = await fetch('/api/admin/alerts/reorder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vars),
  });
  if(!res.ok) {
    throw new Error(`Réordonnancement échoué (${res.status})`);
  }
};

/* Hooks ----------------------------------------------- */
export const useAlertsQuery = (editionId: string | null): UseQueryResult<AdminAlertDto[], Error> => {
  return useQuery({
    queryKey: ['admin', 'alerts', editionId],
    queryFn: (): Promise<AdminAlertDto[]> => {
      if(editionId === null) {
        throw new Error('no edition');
      }
      return fetchAlerts(editionId);
    },
    enabled: editionId !== null,
  });
};

export const useCreateAlert = (): UseMutationResult<void, Error, CreateGeneralAlertInput> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postAlert,
    onSuccess: (): void => { void qc.invalidateQueries({ queryKey: ['admin', 'alerts'] }); },
  });
};

export const useUpdateAlert = (): UseMutationResult<void, Error, { id: string; input: UpdateGeneralAlertInput }> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: patchAlert,
    onSuccess: (): void => { void qc.invalidateQueries({ queryKey: ['admin', 'alerts'] }); },
  });
};

export const useDeleteAlert = (): UseMutationResult<void, Error, string> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteAlertRequest,
    onSuccess: (): void => { void qc.invalidateQueries({ queryKey: ['admin', 'alerts'] }); },
  });
};

export const useReorderAlerts = (): UseMutationResult<void, Error, { editionId: string; orderedIds: string[] }> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reorderAlertsRequest,
    onSuccess: (): void => { void qc.invalidateQueries({ queryKey: ['admin', 'alerts'] }); },
  });
};
```

- [ ] **Step 2: Verify + commit**

```bash
pnpm tsc:ci && pnpm lint
git add src/hooks/admin/useAdminAlerts.ts
git commit -m "Added TanStack Query hooks for admin alerts"
```

---

## Task 8: AlertFormDialog (create/edit)

**Files:** Create `src/app/admin/alerts/AlertFormDialog.tsx`

- [ ] **Step 1: Write `src/app/admin/alerts/AlertFormDialog.tsx`**

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'components/ui/select';

/* Module imports (project) ---------------------------- */
import { updateGeneralAlertSchema } from 'validation/generalAlert';
import { useCreateAlert, useUpdateAlert } from 'hooks/admin/useAdminAlerts';

/* Type imports ---------------------------------------- */
import type { AdminAlertDto } from 'db/queries/admin/listEditionAlerts';

/* AlertFormDialog component prop types ---------------- */
interface AlertFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editionId: string;
  /** Present = edit mode. */
  alert?: AdminAlertDto;
}

interface AlertFormValues {
  variant: 'default' | 'destructive' | 'warning' | 'success';
  title: string;
  content: string;
  isPublished: boolean;
}

/* AlertFormDialog component --------------------------- */
const AlertFormDialog: React.FC<AlertFormDialogProps> = (
  {
    open,
    onOpenChange,
    editionId,
    alert,
  },
) => {
  const isEdit: boolean = alert !== undefined;
  const createMutation = useCreateAlert();
  const updateMutation = useUpdateAlert();

  const form = useForm<AlertFormValues>({
    resolver: zodResolver(updateGeneralAlertSchema) as never,
    defaultValues: {
      variant: alert?.variant ?? 'warning',
      title: alert?.title ?? '',
      content: alert?.content ?? '',
      isPublished: alert?.isPublished ?? false,
    },
  });

  useEffect(
    () => {
      if(open) {
        form.reset({
          variant: alert?.variant ?? 'warning',
          title: alert?.title ?? '',
          content: alert?.content ?? '',
          isPublished: alert?.isPublished ?? false,
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, alert],
  );

  const onSubmit = (values: AlertFormValues): void => {
    const input = {
      variant: values.variant,
      title: values.title.length > 0 ? values.title : undefined,
      content: values.content,
      isPublished: values.isPublished,
    };
    if(isEdit && alert !== undefined) {
      updateMutation.mutate(
        { id: alert.id, input },
        {
          onSuccess: (): void => { toast.success('Alerte mise à jour.'); onOpenChange(false); },
          onError: (error): void => { toast.error(error.message); },
        },
      );
      return;
    }
    createMutation.mutate(
      { ...input, editionId },
      {
        onSuccess: (): void => { toast.success('Alerte créée.'); onOpenChange(false); },
        onError: (error): void => { toast.error(error.message); },
      },
    );
  };

  const pending: boolean = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier l\'alerte' : 'Nouvelle alerte'}</DialogTitle>
          <DialogDescription>Le contenu accepte le Markdown (liens, gras…).</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e): void => { void form.handleSubmit(onSubmit)(e); }} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label>Type</Label>
            <Controller
              control={form.control}
              name="variant"
              render={({ field }): React.ReactElement => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
          <div className="flex flex-col gap-1">
            <Label htmlFor="title">Titre (optionnel)</Label>
            <Input id="title" {...form.register('title')} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="content">Contenu (Markdown)</Label>
            <Textarea id="content" rows={4} {...form.register('content')} />
            {
              form.formState.errors.content !== undefined &&
                <p className="text-sm text-destructive">Contenu requis.</p>
            }
          </div>
          <div className="flex items-center gap-3">
            <Controller
              control={form.control}
              name="isPublished"
              render={({ field }): React.ReactElement => (
                <Switch id="isPublished" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label htmlFor="isPublished">Publiée (visible sur le site public)</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={(): void => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Enregistrement…' : (isEdit ? 'Enregistrer' : 'Créer')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

/* Export AlertFormDialog component -------------------- */
export default AlertFormDialog;
```

- [ ] **Step 2: Verify + commit**

```bash
pnpm tsc:ci && pnpm lint
git add src/app/admin/alerts/AlertFormDialog.tsx
git commit -m "Added alert create/edit form dialog"
```
Notes: `zodResolver(updateGeneralAlertSchema) as never` — the create payload adds `editionId` in `onSubmit`, so the form validates the core (update) shape; the `as never` bridges resolver typing (same pattern as EventForm). If `Switch onCheckedChange` value isn't `boolean`, adjust. Report any change.

---

## Task 9: AlertsTable (DnD rows + publish switch + delete)

**Files:** Create `src/app/admin/alerts/AlertsTable.tsx`

A drag-reorderable list (admin) / static list (others) — uses `SortableList` (div-row based, like the event sections), not an HTML `<table>` (DnD rows in a table are finicky).

- [ ] **Step 1: Write `src/app/admin/alerts/AlertsTable.tsx`**

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React, { useState } from 'react';
import { toast } from 'sonner';

/* Component imports ----------------------------------- */
import { Badge } from 'components/ui/badge';
import { Button } from 'components/ui/button';
import { Switch } from 'components/ui/switch';
import ConfirmDialog from 'components/admin/ConfirmDialog';
import SortableList from 'app/admin/events/SortableList';
import AlertFormDialog from './AlertFormDialog';

/* Module imports (project) ---------------------------- */
import { useAlertsQuery, useUpdateAlert, useDeleteAlert, useReorderAlerts } from 'hooks/admin/useAdminAlerts';

/* Type imports ---------------------------------------- */
import type { AdminAlertDto } from 'db/queries/admin/listEditionAlerts';

/* AlertsTable component prop types -------------------- */
interface AlertsTableProps {
  editionId: string;
  canManage: boolean;
}

/* Helpers --------------------------------------------- */
const variantLabel = (v: AdminAlertDto['variant']): string => {
  if(v === 'destructive') { return 'Erreur'; }
  if(v === 'warning') { return 'Avertissement'; }
  if(v === 'success') { return 'Succès'; }
  return 'Info';
};

const arrayMove = <T,>(items: T[], from: number, to: number): T[] => {
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  if(moved !== undefined) {
    next.splice(to, 0, moved);
  }
  return next;
};

/* AlertsTable component ------------------------------- */
const AlertsTable: React.FC<AlertsTableProps> = ({ editionId, canManage }) => {
  const alertsQuery = useAlertsQuery(editionId);
  const updateMutation = useUpdateAlert();
  const deleteMutation = useDeleteAlert();
  const reorderMutation = useReorderAlerts();

  const [editing, setEditing] = useState<AdminAlertDto | undefined>(undefined);
  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<AdminAlertDto | undefined>(undefined);

  const togglePublish = (alert: AdminAlertDto, next: boolean): void => {
    updateMutation.mutate(
      {
        id: alert.id,
        input: {
          variant: alert.variant,
          title: alert.title ?? undefined,
          content: alert.content,
          isPublished: next,
        },
      },
      {
        onSuccess: (): void => { toast.success(next ? 'Alerte publiée.' : 'Alerte dépubliée.'); },
        onError: (error): void => { toast.error(error.message); },
      },
    );
  };

  const onReorder = (from: number, to: number): void => {
    const reordered = arrayMove(alerts, from, to);
    reorderMutation.mutate(
      { editionId, orderedIds: reordered.map((a) => a.id) },
      { onError: (error): void => { toast.error(error.message); } },
    );
  };

  const confirmDelete = (): void => {
    if(deleting === undefined) {
      return;
    }
    const target = deleting;
    deleteMutation.mutate(target.id, {
      onSuccess: (): void => { toast.success('Alerte supprimée.'); setDeleting(undefined); },
      onError: (error): void => { toast.error(error.message); },
    });
  };

  if(alertsQuery.isLoading) {
    return <p className="text-muted-foreground">Chargement…</p>;
  }
  if(alertsQuery.isError) {
    return <p className="text-destructive">Impossible de charger les alertes.</p>;
  }

  const alerts: AdminAlertDto[] = alertsQuery.data ?? [];
  if(alerts.length === 0) {
    return <p className="text-muted-foreground">Aucune alerte pour cette édition.</p>;
  }

  const renderRowContent = (alert: AdminAlertDto): React.ReactNode => (
    <div className="flex flex-wrap items-center gap-3">
      <Badge variant="secondary">{variantLabel(alert.variant)}</Badge>
      <div className="flex-1 min-w-0">
        {
          alert.title !== null &&
            <span className="font-medium">{alert.title} </span>
        }
        <span className="text-sm text-muted-foreground">
          {alert.content.length > 80 ? `${alert.content.slice(0, 80)}…` : alert.content}
        </span>
      </div>
      {
        canManage
          ? (
            <div className="flex items-center gap-2">
              <Switch
                checked={alert.isPublished}
                onCheckedChange={(v): void => togglePublish(alert, v)}
                aria-label="Publier"
              />
              <Button variant="outline" size="sm" onClick={(): void => { setEditing(alert); setEditOpen(true); }}>
                Modifier
              </Button>
              <Button variant="destructive" size="sm" onClick={(): void => setDeleting(alert)}>
                Supprimer
              </Button>
            </div>
          )
          : <Badge variant={alert.isPublished ? 'default' : 'secondary'}>{alert.isPublished ? 'Publiée' : 'Brouillon'}</Badge>
      }
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {
        canManage
          ? (
            <SortableList
              ids={alerts.map((a) => a.id)}
              onReorder={onReorder}
              renderRow={(index): React.ReactNode => renderRowContent(alerts[index]!)}
            />
          )
          : (
            <div className="flex flex-col gap-2">
              {alerts.map((alert) => (
                <div key={alert.id} className="rounded-md border border-border p-3">
                  {renderRowContent(alert)}
                </div>
              ))}
            </div>
          )
      }

      {
        canManage &&
          <AlertFormDialog
            open={editOpen}
            onOpenChange={(o): void => { setEditOpen(o); if(!o) { setEditing(undefined); } }}
            editionId={editionId}
            alert={editing}
          />
      }

      {
        canManage &&
          <ConfirmDialog
            open={deleting !== undefined}
            onOpenChange={(o): void => { if(!o) { setDeleting(undefined); } }}
            title="Supprimer cette alerte ?"
            description={<span>Cette action est définitive.</span>}
            confirmLabel="Supprimer"
            pending={deleteMutation.isPending}
            onConfirm={confirmDelete}
          />
      }
    </div>
  );
};

/* Export AlertsTable component ------------------------ */
export default AlertsTable;
```

- [ ] **Step 2: Verify + commit**

```bash
pnpm tsc:ci && pnpm lint
git add src/app/admin/alerts/AlertsTable.tsx
git commit -m "Added AlertsTable (DnD reorder + publish switch + delete)"
```
Notes:
- `SortableList` import path: it's at `src/app/admin/events/SortableList.tsx` → alias `app/admin/events/SortableList`. If that alias form fails, use a relative path `../events/SortableList` and report.
- `alerts[index]!` / `arrayMove` non-null assertions are bounded; if the linter forbids `!`, guard with an `=== undefined` check returning null.
- The generic `arrayMove<T,>` arrow needs the trailing comma in `.tsx` to disambiguate from JSX — keep it.

---

## Task 10: AlertsManager + list page (replace placeholder)

**Files:** Create `src/app/admin/alerts/AlertsManager.tsx`; Modify `src/app/admin/alerts/page.tsx`

- [ ] **Step 1: Write `src/app/admin/alerts/AlertsManager.tsx`**

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/* Component imports ----------------------------------- */
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'components/ui/select';
import { Button } from 'components/ui/button';
import AlertsTable from './AlertsTable';
import AlertFormDialog from './AlertFormDialog';

/* Module imports (project) ---------------------------- */
import { useEditionsQuery } from 'hooks/admin/useEditions';

/* AlertsManager component prop types ------------------ */
interface AlertsManagerProps {
  canManage: boolean;
}

/* AlertsManager component ----------------------------- */
const AlertsManager: React.FC<AlertsManagerProps> = ({ canManage }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlEdition = searchParams.get('edition');

  const editionsQuery = useEditionsQuery();
  const [editionId, setEditionId] = useState<string | null>(urlEdition);
  const [createOpen, setCreateOpen] = useState<boolean>(false);

  useEffect(
    () => {
      if(editionId === null && editionsQuery.data !== undefined && editionsQuery.data.length > 0) {
        const latest = editionsQuery.data[0];
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setEditionId(latest.id);
        router.replace(`/admin/alerts?edition=${latest.id}`);
      }
    },
    [editionId, editionsQuery.data, router],
  );

  const onEditionChange = (value: string): void => {
    setEditionId(value);
    router.replace(`/admin/alerts?edition=${value}`);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Alertes</h1>
        {
          canManage && editionId !== null &&
            <Button onClick={(): void => setCreateOpen(true)}>Nouvelle alerte</Button>
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
      </div>

      {
        editionId !== null
          ? <AlertsTable editionId={editionId} canManage={canManage} />
          : <p className="text-muted-foreground">Sélectionnez une édition.</p>
      }

      {
        canManage && editionId !== null &&
          <AlertFormDialog open={createOpen} onOpenChange={setCreateOpen} editionId={editionId} />
      }
    </div>
  );
};

/* Export AlertsManager component ---------------------- */
export default AlertsManager;
```

- [ ] **Step 2: Replace `src/app/admin/alerts/page.tsx`** (the 3a placeholder)

```tsx
/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import AlertsManager from './AlertsManager';

/* Module imports (project) ---------------------------- */
import { requireSession } from 'auth/helpers';

/* AlertsPage component -------------------------------- */
const AlertsPage = async (): Promise<React.ReactElement> => {
  const session = await requireSession();
  const role: string = (session.user as { role?: string }).role ?? 'viewer';
  const canManage: boolean = role === 'admin';
  return <AlertsManager canManage={canManage} />;
};

/* Export AlertsPage component ------------------------- */
export default AlertsPage;
```

- [ ] **Step 3: Verify + commit**

```bash
pnpm tsc:ci && pnpm lint
git add src/app/admin/alerts/AlertsManager.tsx src/app/admin/alerts/page.tsx
git commit -m "Added alerts list page (edition picker) replacing placeholder"
```

---

## Task 11: Public GeneralAlertsBanner + wiring

**Files:** Create `src/components/GeneralAlertsBanner/GeneralAlertsBanner.tsx`; Modify `src/app/(public)/[year]/page.tsx`

- [ ] **Step 1: Write `src/components/GeneralAlertsBanner/GeneralAlertsBanner.tsx`**

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React from 'react';
import { Info, TriangleAlert, CircleAlert, CircleCheck } from 'lucide-react';

/* Component imports ----------------------------------- */
import { Alert, AlertTitle, AlertDescription } from 'components/ui/alert';
import DescriptionRender from 'components/DescriptionRender/DescriptionRender';

/* Type imports ---------------------------------------- */
import type { GeneralAlertView } from 'app/(public)/[year]/types';

/* GeneralAlertsBanner component prop types ------------ */
interface GeneralAlertsBannerProps {
  alerts: GeneralAlertView[];
}

/* Helpers --------------------------------------------- */
const iconFor = (variant: GeneralAlertView['variant']): React.ReactNode => {
  if(variant === 'destructive') { return <CircleAlert className="h-4 w-4" />; }
  if(variant === 'warning') { return <TriangleAlert className="h-4 w-4" />; }
  if(variant === 'success') { return <CircleCheck className="h-4 w-4" />; }
  return <Info className="h-4 w-4" />;
};

/* GeneralAlertsBanner component ----------------------- */
const GeneralAlertsBanner: React.FC<GeneralAlertsBannerProps> = ({ alerts }) => {
  if(alerts.length === 0) {
    return null;
  }
  return (
    <div className="w-full max-w-5xl px-4 mx-auto flex flex-col gap-3 pb-4">
      {
        alerts.map((alert) => (
          <Alert key={alert.id} variant={alert.variant}>
            {iconFor(alert.variant)}
            {
              alert.title !== null &&
                <AlertTitle>{alert.title}</AlertTitle>
            }
            <AlertDescription>
              <DescriptionRender markdown={alert.content} />
            </AlertDescription>
          </Alert>
        ))
      }
    </div>
  );
};

/* Export GeneralAlertsBanner component ---------------- */
export default GeneralAlertsBanner;
```

- [ ] **Step 2: Wire into `src/app/(public)/[year]/page.tsx`**

Add the import (with the other component imports):
```tsx
import GeneralAlertsBanner from 'components/GeneralAlertsBanner/GeneralAlertsBanner';
```
Then replace the placeholder block:
```tsx
      {
        generalAlerts.length > 0 &&
          <div className="w-full max-w-5xl px-4 mx-auto pb-4">
            <ul className="text-sm text-muted-foreground list-disc pl-4">
              {generalAlerts.map((alert) => (
                <li key={alert.id}>
                  {alert.title !== null ? `${alert.title}: ` : ''}{alert.content}
                </li>
              ))}
            </ul>
          </div>
      }
```
with:
```tsx
      <GeneralAlertsBanner alerts={generalAlerts} />
```
(The banner renders nothing when empty, so the `generalAlerts.length > 0` guard is no longer needed.)

- [ ] **Step 3: Verify typecheck/lint**

```bash
pnpm tsc:ci && pnpm lint
```
Notes:
- Confirm the lucide icon names (`Info`, `TriangleAlert`, `CircleAlert`, `CircleCheck`) exist in the installed lucide-react: `node -e "const l=require('lucide-react'); console.log(['Info','TriangleAlert','CircleAlert','CircleCheck'].map(n=>n+':'+(n in l)))"`. If any is absent, substitute a present icon (e.g. `AlertTriangle`/`AlertCircle`/`CheckCircle` in older lucide) and report.
- The `GeneralAlertView` import path uses the `(public)` route group; the alias `app/(public)/[year]/types` should resolve. If the parens/brackets break the alias, import the type via a relative path from the banner or re-declare a local `BannerAlert` interface and report.
- shadcn `Alert` renders icon + title + description via CSS grid expecting an SVG first child — placing the icon as the first child is correct.

- [ ] **Step 4: Commit**

```bash
git add src/components/GeneralAlertsBanner/GeneralAlertsBanner.tsx "src/app/(public)/[year]/page.tsx"
git commit -m "Added public GeneralAlertsBanner replacing the bullet-list placeholder"
```

---

## Task 12: End-to-end verification + build

**Files:** none

- [ ] **Step 1: Build**

```bash
pnpm build
```
Expected: exit 0. Routes include `/admin/alerts`, `/api/admin/alerts`, `/api/admin/alerts/[id]`, `/api/admin/alerts/reorder`.

- [ ] **Step 2: Automated admin→public flow (curl)**

```bash
( BETTER_AUTH_URL=http://localhost:3000 timeout 95 pnpm dev --port 3000 > /tmp/3c-final.log 2>&1 & )
sleep 24
P=3000; JAR=/tmp/3c-final.txt; rm -f $JAR
EMAIL=$(grep -E '^ADMIN_EMAIL=' .env.local | cut -d= -f2-)
PASS=$(grep -E '^ADMIN_PASSWORD=' .env.local | cut -d= -f2-)
curl -s -m10 -c $JAR -o /dev/null -X POST "http://localhost:$P/api/auth/sign-in/email" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}"
EDID=$(curl -s -m10 -b $JAR "http://localhost:$P/api/admin/editions" | python3 -c "import sys,json;print(next(e['id'] for e in json.load(sys.stdin)['editions'] if e['year']==2024))")
# clean slate: delete any leftover test alerts from earlier tasks
for AID in $(curl -s -m10 -b $JAR "http://localhost:$P/api/admin/alerts?editionId=$EDID" | python3 -c "import sys,json;[print(a['id']) for a in json.load(sys.stdin)['alerts']]"); do curl -s -m10 -b $JAR -H "Origin: http://localhost:$P" -X DELETE "http://localhost:$P/api/admin/alerts/$AID" -o /dev/null; done
echo "=== create 1 published + 1 draft ==="
curl -s -m10 -b $JAR -H "Origin: http://localhost:$P" -X POST "http://localhost:$P/api/admin/alerts" -H "Content-Type: application/json" -d "{\"editionId\":\"$EDID\",\"variant\":\"warning\",\"title\":\"Météo\",\"content\":\"Orages — [infos](https://x.com)\",\"isPublished\":true}" -o /dev/null -w "pub %{http_code}\n"
curl -s -m10 -b $JAR -H "Origin: http://localhost:$P" -X POST "http://localhost:$P/api/admin/alerts" -H "Content-Type: application/json" -d "{\"editionId\":\"$EDID\",\"variant\":\"default\",\"content\":\"Brouillon\",\"isPublished\":false}" -o /dev/null -w "draft %{http_code}\n"
echo -n "public getEdition shows only published (expect 1) -> "
curl -s -m10 "http://localhost:$P/api/editions/2024" | python3 -c "import sys,json;d=json.load(sys.stdin)['generalAlerts'];print(len(d),'|',[a['title'] for a in d])"
echo "=== cleanup ==="
for AID in $(curl -s -m10 -b $JAR "http://localhost:$P/api/admin/alerts?editionId=$EDID" | python3 -c "import sys,json;[print(a['id']) for a in json.load(sys.stdin)['alerts']]"); do curl -s -m10 -b $JAR -H "Origin: http://localhost:$P" -X DELETE "http://localhost:$P/api/admin/alerts/$AID" -o /dev/null -w "del %{http_code} "; done; echo
echo -n "final alert count (expect 0) -> "; curl -s -m10 -b $JAR "http://localhost:$P/api/admin/alerts?editionId=$EDID" | python3 -c "import sys,json;print(len(json.load(sys.stdin)['alerts']))"
sleep 12
```
Expected: pub 201; draft 201; public `/api/editions/2024` `generalAlerts` length **1** (only the published "Météo" — the public `getEdition` filters `isPublished`); cleanup deletes both; final count 0. Paste outputs.

- [ ] **Step 3: Browser walk-through (manual)**

```bash
( BETTER_AUTH_URL=http://localhost:3000 pnpm dev --port 3000 > /tmp/3c-browser.log 2>&1 & )
sleep 8
```
As admin at `http://localhost:3000`:
1. `/admin` → Alertes → `/admin/alerts`, edition picker defaults to 2024.
2. "Nouvelle alerte" → create a `warning` alert with title + markdown content (a link) → published. Create a second `default` alert → draft (publish off).
3. Drag to reorder the two rows → order persists (refetch shows new order).
4. Toggle the draft's publish Switch on/off.
5. Open `/2024` (public) in another tab → published alerts render as styled `<Alert>` banners at the top, title bold, the markdown link clickable; the draft is absent. (After ~60s edge cache; immediate on first dev compile.)
6. Delete an alert (plain confirm) → gone.

```bash
pkill -f "next dev --port 3000" 2>/dev/null || true
```

- [ ] **Step 4: Lint/tsc final**

```bash
pnpm tsc:ci && pnpm lint
```
Expected 0 errors (1 pre-existing `<img>` warning OK).

- [ ] **Step 5: No commit** (verification only).

---

## Final verification checklist

- [ ] `pnpm tsc:ci` clean; `pnpm lint` clean (1 pre-existing warning); `pnpm build` exit 0
- [ ] `/api/admin/alerts` GET 401 unauth / 200 authed / 400 missing editionId; POST 201 (appended position) / 400 invalid
- [ ] `/api/admin/alerts/[id]` PATCH 200/404; DELETE 200 then 404
- [ ] `/api/admin/alerts/reorder` 200 with positions persisted (no collision); 400 on mismatched id set
- [ ] Public `/api/editions/2024` returns only **published** alerts (admin-created draft hidden)
- [ ] Browser: create/publish/reorder/delete alerts; public `/2024` shows published alerts as styled banners with markdown; draft hidden
- [ ] DB restored (test alerts deleted) after verification

---

## Spec coverage map

- §4 endpoints/files/permission (admin-only) — Tasks 4–6 (routes), 1–3 (server), 7–10 (admin UI)
- §5 validation + mutations (two-pass reorder) — Tasks 1, 2
- §6 admin read query — Task 3
- §7 admin UI (manager/table/dialog/delete/reorder) — Tasks 7–10
- §8 public banner + wiring — Task 11
- §9 rollout — Tasks 1–12
- §10 risks — Task 2/6 (reorder collision), Task 11 (public regression), Tasks 4-6 (admin-only guard)
- §11 3d — out of scope
