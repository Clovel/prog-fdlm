# Edition Social Embeds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two hardcoded `<InstagramEmbed>` posts on `/[year]` with an edition-scoped, admin-managed ordered list of social embeds (Instagram/Facebook), rendered in one "Sur les réseaux" section; seed the two existing URLs onto the 2024 edition.

**Architecture:** New `edition_embed_links` table (edition-scoped analog of `event_embed_links`), managed exactly like general alerts (Spec 3c): admin-only `/api/admin/embeds` REST routes (GET/POST/PATCH/DELETE + `/reorder` two-pass collision-safe), Zod validation, Drizzle mutations, a TanStack-Query `/admin/embeds` manager/table/dialog. The public read folds into the existing `getEdition` query (no new public route). The public page renders a new `<EditionEmbeds>` section.

**Tech Stack:** Next.js 16 App Router, React 19, TS, Drizzle + Supabase Postgres, @tanstack/react-query, react-hook-form, zod v4, shadcn/ui, sonner, pnpm 9.15.9.

**Spec source:** `docs/superpowers/specs/2026-05-31-edition-embeds-design.md`. Read it once before Task 1.

**Verification note:** No test framework (`CLAUDE.md`). "Verify" = `pnpm tsc:ci`, `pnpm lint`, `pnpm build`, `curl` with an admin cookie jar, browser. DB is Supabase; `db:migrate`/`db:seed` act on the real DB. Dev server runs with `BETTER_AUTH_URL=http://localhost:3000` on port 3000; admin creds in `.env.local` (`ADMIN_EMAIL`/`ADMIN_PASSWORD`), read at runtime, never hardcoded. **pnpm is pinned to 9.15.9 — do not change it.**

**Conventions** (`CLAUDE.md`): single quotes TS / double quotes JSX, semicolons, always-multiline trailing commas, **no space after `if`/`for`/`while`/`catch`** (`if(x)`), `strict-boolean-expressions`, `explicit-function-return-type`, comment-banner, `import type`, `React.FC<Props>` default-exported, react-hooks v7 (`set-state-in-effect`/`exhaustive-deps` need a per-line eslint-disable), `toast.*` returns a value → call in a block-body void arrow. Path alias `*`→`./src/*`. Run `pnpm lint-fix` after edits.

**Closest templates to mirror** (read them): `src/db/schema/generalAlerts.ts`, `src/validation/generalAlert.ts`, `src/db/mutations/generalAlerts.ts`, `src/db/queries/admin/listEditionAlerts.ts`, `src/app/api/admin/alerts/{route.ts,[id]/route.ts,reorder/route.ts}`, `src/hooks/admin/useAdminAlerts.ts`, `src/app/admin/alerts/{AlertFormDialog.tsx,AlertsManager.tsx,AlertsTable.tsx,page.tsx}`. Plus `src/db/seed/index.ts` `syncEmbedLinks` (seed template) and `src/components/embeds/{InstagramEmbed,FacebookEmbed}.tsx` (props: IG `{url, maxWidth?}`, FB `{url, type?, maxWidth?}`).

---

## Task 1: `edition_embed_links` schema + migration

**Files:** Create `src/db/schema/editionEmbedLinks.ts`; Modify `src/db/schema/index.ts`; generate + apply migration.

- [ ] **Step 1: Write `src/db/schema/editionEmbedLinks.ts`** (mirror `generalAlerts.ts`; reuse `embedPlatformEnum`)

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
import { embedPlatformEnum } from './enums';

/* Table definition ------------------------------------ */
export const editionEmbedLinks = pgTable(
  'edition_embed_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    editionId: uuid('edition_id').notNull().references(() => editions.id, { onDelete: 'cascade' }),
    platform: embedPlatformEnum('platform').notNull(),
    url: text('url').notNull(),
    isPublished: boolean('is_published').notNull().default(true),
    position: integer('position').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    editionPositionUq: uniqueIndex('edition_embed_links_edition_position_uq').on(table.editionId, table.position),
    positionCheck: check('edition_embed_links_position_check', sql`position >= 0`),
  }),
);

export type EditionEmbedLinkRow = typeof editionEmbedLinks.$inferSelect;
export type EditionEmbedLinkInsert = typeof editionEmbedLinks.$inferInsert;
```

- [ ] **Step 2: Export from `src/db/schema/index.ts`** — add after the `eventEmbedLinks` export line:
```ts
export * from './editionEmbedLinks';
```

- [ ] **Step 3: Generate + apply migration**
```bash
pnpm db:generate
pnpm db:migrate
```
Expected: a new `src/db/migrations/00NN_*.sql` creating `edition_embed_links` + the unique index + the position check; `db:migrate` applies it to Supabase (additive `CREATE TABLE`, safe). Confirm the SQL is additive (no drops). If `db:migrate` hits a pnpm/corepack issue, ensure pnpm 9.15.9 is active (`corepack prepare pnpm@9.15.9 --activate`).

- [ ] **Step 4: Verify + commit**
```bash
pnpm tsc:ci && pnpm lint
git add src/db/schema/editionEmbedLinks.ts src/db/schema/index.ts src/db/migrations
git commit -m "Added edition_embed_links table + migration"
```
No `--no-verify`. Both clean (pre-existing `<img>` warning in DescriptionRender.tsx OK).

---

## Task 2: Validation schemas

**Files:** Create `src/validation/editionEmbed.ts`

- [ ] **Step 1: Write `src/validation/editionEmbed.ts`**

```ts
/* Module imports -------------------------------------- */
import { z } from 'zod';

/* Schemas --------------------------------------------- */
const platformEnum = z.enum(['instagram', 'facebook']);

const coreShape = {
  platform: platformEnum,
  url: z.url('URL invalide'),
  isPublished: z.boolean(),
};

export const createEditionEmbedSchema = z.object({
  ...coreShape,
  editionId: z.uuid(),
});

export const updateEditionEmbedSchema = z.object(coreShape);

export const reorderEmbedsSchema = z.object({
  editionId: z.uuid(),
  orderedIds: z.array(z.uuid()).min(1),
});

/* Inferred types -------------------------------------- */
export type CreateEditionEmbedInput = z.infer<typeof createEditionEmbedSchema>;
export type UpdateEditionEmbedInput = z.infer<typeof updateEditionEmbedSchema>;
export type ReorderEmbedsInput = z.infer<typeof reorderEmbedsSchema>;
```

- [ ] **Step 2: Verify + commit**
```bash
pnpm tsc:ci && pnpm lint
git add src/validation/editionEmbed.ts
git commit -m "Added edition-embed validation schemas"
```

---

## Task 3: Mutations (create / update / delete / two-pass reorder)

**Files:** Create `src/db/mutations/editionEmbeds.ts` (mirror `src/db/mutations/generalAlerts.ts`)

- [ ] **Step 1: Write `src/db/mutations/editionEmbeds.ts`**

```ts
/* Module imports -------------------------------------- */
import { and, asc, eq, sql } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../index';
import { editionEmbedLinks } from '../schema';

/* Type imports ---------------------------------------- */
import type { CreateEditionEmbedInput, UpdateEditionEmbedInput } from 'validation/editionEmbed';
import type { EditionEmbedLinkRow } from '../schema';

/* Mutations ------------------------------------------- */
export const createEditionEmbed = async (input: CreateEditionEmbedInput): Promise<EditionEmbedLinkRow> => {
  return db.transaction(async (tx): Promise<EditionEmbedLinkRow> => {
    const maxRows = await tx
      .select({ max: sql<number>`COALESCE(MAX(${editionEmbedLinks.position}), -1)::int` })
      .from(editionEmbedLinks)
      .where(eq(editionEmbedLinks.editionId, input.editionId));
    const nextPosition: number = (maxRows[0]?.max ?? -1) + 1;

    const rows = await tx
      .insert(editionEmbedLinks)
      .values({
        editionId: input.editionId,
        platform: input.platform,
        url: input.url,
        isPublished: input.isPublished,
        position: nextPosition,
      })
      .returning();
    const row = rows[0];
    if(row === undefined) {
      throw new Error('createEditionEmbed: insert returned no row');
    }
    return row;
  });
};

export const updateEditionEmbed = async (id: string, input: UpdateEditionEmbedInput): Promise<EditionEmbedLinkRow | null> => {
  const rows = await db
    .update(editionEmbedLinks)
    .set({
      platform: input.platform,
      url: input.url,
      isPublished: input.isPublished,
      updatedAt: sql`NOW()`,
    })
    .where(eq(editionEmbedLinks.id, id))
    .returning();
  return rows[0] ?? null;
};

export const deleteEditionEmbed = async (id: string): Promise<boolean> => {
  const rows = await db.delete(editionEmbedLinks).where(eq(editionEmbedLinks.id, id)).returning({ id: editionEmbedLinks.id });
  return rows.length > 0;
};

/**
 * Reorder one edition's embeds to match `orderedIds`. Validates the id set
 * matches the edition's embeds exactly, then reassigns positions in two passes
 * in one transaction (the (edition_id, position) UNIQUE + position>=0 CHECK
 * forbid negative temporaries): first into a fresh band above the old max, then
 * down to 0..n-1. Returns false on id-set mismatch (-> 400) or missing edition.
 */
export const reorderEditionEmbeds = async (editionId: string, orderedIds: string[]): Promise<boolean> => {
  return db.transaction(async (tx): Promise<boolean> => {
    const current = await tx
      .select({ id: editionEmbedLinks.id, position: editionEmbedLinks.position })
      .from(editionEmbedLinks)
      .where(eq(editionEmbedLinks.editionId, editionId))
      .orderBy(asc(editionEmbedLinks.position));

    const currentIds = new Set(current.map((r) => r.id));
    if(current.length !== orderedIds.length || !orderedIds.every((id) => currentIds.has(id))) {
      return false;
    }

    const base: number = current.reduce((m, r) => (r.position > m ? r.position : m), -1) + 1;

    for(let i = 0; i < orderedIds.length; i++) {
      const id = orderedIds[i];
      if(id === undefined) { continue; }
      await tx.update(editionEmbedLinks).set({ position: base + i }).where(and(eq(editionEmbedLinks.id, id), eq(editionEmbedLinks.editionId, editionId)));
    }
    for(let i = 0; i < orderedIds.length; i++) {
      const id = orderedIds[i];
      if(id === undefined) { continue; }
      await tx.update(editionEmbedLinks).set({ position: i }).where(and(eq(editionEmbedLinks.id, id), eq(editionEmbedLinks.editionId, editionId)));
    }
    return true;
  });
};
```

- [ ] **Step 2: Verify + commit**
```bash
pnpm tsc:ci && pnpm lint
git add src/db/mutations/editionEmbeds.ts
git commit -m "Added edition-embed mutations (create/update/delete + two-pass reorder)"
```

---

## Task 4: Admin list query + public read (extend getEdition)

**Files:** Create `src/db/queries/admin/listEditionEmbeds.ts`; Modify `src/db/queries/types.ts`; Modify `src/db/queries/getEdition.ts`

- [ ] **Step 1: Write `src/db/queries/admin/listEditionEmbeds.ts`** (mirror `listEditionAlerts.ts`)

```ts
/* Module imports -------------------------------------- */
import { asc, eq } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../../index';
import { editionEmbedLinks } from '../../schema';

/* Types ----------------------------------------------- */
export interface AdminEditionEmbedDto {
  id: string;
  platform: 'instagram' | 'facebook';
  url: string;
  isPublished: boolean;
  position: number;
}

/* Query ----------------------------------------------- */
export const listEditionEmbeds = async (editionId: string): Promise<AdminEditionEmbedDto[]> => {
  const rows = await db
    .select({
      id: editionEmbedLinks.id,
      platform: editionEmbedLinks.platform,
      url: editionEmbedLinks.url,
      isPublished: editionEmbedLinks.isPublished,
      position: editionEmbedLinks.position,
    })
    .from(editionEmbedLinks)
    .where(eq(editionEmbedLinks.editionId, editionId))
    .orderBy(asc(editionEmbedLinks.position));
  return rows;
};
```
Note: `platform` is a pgEnum and infers as the literal union, so no cast is needed (check how `listEditionAlerts.ts` types `variant`). If tsc requires it, add `platform: row.platform as AdminEditionEmbedDto['platform']` via a `.map`; report which.

- [ ] **Step 2: Add `EmbedLinkDto` to `src/db/queries/types.ts`** — append:
```ts
export interface EmbedLinkDto {
  id: string;
  platform: 'instagram' | 'facebook';
  url: string;
}
```
(If `types.ts` already defines a shared `EmbedPlatform`/`AlertVariant` union, reuse that union for `platform` instead of the inline literal; match the file's existing style. Report if you reuse an existing type.)

- [ ] **Step 3: Extend `src/db/queries/getEdition.ts`** to also return published, ordered embed links.

Add to the imports: `editionEmbedLinks` to the `from '../schema'` import, and `EmbedLinkDto` to the `from './types'` type import. Add `embedLinks: EmbedLinkDto[]` to `GetEditionResult`. After the `alertRows` query, add:
```ts
  const embedRows = await db
    .select({
      id: editionEmbedLinks.id,
      platform: editionEmbedLinks.platform,
      url: editionEmbedLinks.url,
    })
    .from(editionEmbedLinks)
    .where(
      and(
        eq(editionEmbedLinks.editionId, edition.id),
        eq(editionEmbedLinks.isPublished, true),
      ),
    )
    .orderBy(asc(editionEmbedLinks.position));
```
and add `embedLinks: embedRows,` to the returned object (alongside `generalAlerts: alertRows`). The `and`/`asc`/`eq` imports already exist in the file.

- [ ] **Step 4: Verify + commit**
```bash
pnpm tsc:ci && pnpm lint
git add src/db/queries/admin/listEditionEmbeds.ts src/db/queries/types.ts src/db/queries/getEdition.ts
git commit -m "Added admin listEditionEmbeds query + published embeds in getEdition"
```
This makes `/api/editions/[year]` return `embedLinks` automatically (the route returns the whole `getEdition` result).

---

## Task 5: Admin routes (GET/POST + [id] PATCH/DELETE + reorder)

**Files:** Create `src/app/api/admin/embeds/route.ts`, `src/app/api/admin/embeds/[id]/route.ts`, `src/app/api/admin/embeds/reorder/route.ts` (mirror the alerts routes; **all methods admin-only**).

- [ ] **Step 1: Write `src/app/api/admin/embeds/route.ts`**

```ts
/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';
import { z } from 'zod';

/* Module imports (project) ---------------------------- */
import { authorizeApi } from 'auth/apiGuard';
import { listEditionEmbeds } from 'db/queries/admin/listEditionEmbeds';
import { createEditionEmbed } from 'db/mutations/editionEmbeds';
import { createEditionEmbedSchema } from 'validation/editionEmbed';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* Schema ---------------------------------------------- */
const editionIdSchema = z.uuid();

/* GET — list one edition's embeds (admin only) -------- */
export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const { response } = await authorizeApi(['admin']);
  if(response !== null) {
    return response;
  }
  const editionId = new URL(request.url).searchParams.get('editionId');
  if(editionId === null || !editionIdSchema.safeParse(editionId).success) {
    return NextResponse.json({ error: 'invalid_request', message: 'editionId requis' }, { status: 400 });
  }
  try {
    const embeds = await listEditionEmbeds(editionId);
    return NextResponse.json({ embeds });
  } catch(error) {
    console.error('[api/admin/embeds GET] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};

/* POST — create an embed (admin only) ----------------- */
export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const { response } = await authorizeApi(['admin']);
  if(response !== null) {
    return response;
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch(error) {
    console.error('[api/admin/embeds POST] bad json:', error);
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  const parsed = createEditionEmbedSchema.safeParse(body);
  if(!parsed.success) {
    return NextResponse.json({ error: 'invalid_request', issues: parsed.error.issues }, { status: 400 });
  }
  try {
    const embed = await createEditionEmbed(parsed.data);
    return NextResponse.json({ embed }, { status: 201 });
  } catch(error) {
    console.error('[api/admin/embeds POST] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
```

- [ ] **Step 2: Write `src/app/api/admin/embeds/[id]/route.ts`**

```ts
/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';
import { z } from 'zod';

/* Module imports (project) ---------------------------- */
import { authorizeApi } from 'auth/apiGuard';
import { updateEditionEmbed, deleteEditionEmbed } from 'db/mutations/editionEmbeds';
import { updateEditionEmbedSchema } from 'validation/editionEmbed';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* Schema ---------------------------------------------- */
const idSchema = z.string().uuid();

/* PATCH — update an embed (admin only) ---------------- */
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
    console.error('[api/admin/embeds PATCH] bad json:', error);
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  const parsed = updateEditionEmbedSchema.safeParse(body);
  if(!parsed.success) {
    return NextResponse.json({ error: 'invalid_request', issues: parsed.error.issues }, { status: 400 });
  }
  try {
    const embed = await updateEditionEmbed(id, parsed.data);
    if(embed === null) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ embed });
  } catch(error) {
    console.error('[api/admin/embeds PATCH] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};

/* DELETE — delete an embed (admin only) --------------- */
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
    const deleted = await deleteEditionEmbed(id);
    if(!deleted) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch(error) {
    console.error('[api/admin/embeds DELETE] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
```

- [ ] **Step 3: Write `src/app/api/admin/embeds/reorder/route.ts`**

```ts
/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';

/* Module imports (project) ---------------------------- */
import { authorizeApi } from 'auth/apiGuard';
import { reorderEditionEmbeds } from 'db/mutations/editionEmbeds';
import { reorderEmbedsSchema } from 'validation/editionEmbed';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* POST — reorder an edition's embeds (admin only) ----- */
export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const { response } = await authorizeApi(['admin']);
  if(response !== null) {
    return response;
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch(error) {
    console.error('[api/admin/embeds/reorder POST] bad json:', error);
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  const parsed = reorderEmbedsSchema.safeParse(body);
  if(!parsed.success) {
    return NextResponse.json({ error: 'invalid_request', issues: parsed.error.issues }, { status: 400 });
  }
  try {
    const ok = await reorderEditionEmbeds(parsed.data.editionId, parsed.data.orderedIds);
    if(!ok) {
      return NextResponse.json({ error: 'invalid_request', message: 'orderedIds ne correspond pas aux embeds de cette édition' }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch(error) {
    console.error('[api/admin/embeds/reorder POST] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
```

- [ ] **Step 4: Verify + commit**
```bash
pnpm tsc:ci && pnpm lint
git add src/app/api/admin/embeds
git commit -m "Added admin edition-embed routes (GET/POST/PATCH/DELETE/reorder)"
```

---

## Task 6: Route curl verification

**Files:** none (verification only)

- [ ] **Step 1: One dev-server spin, full admin lifecycle + public read**

```bash
( BETTER_AUTH_URL=http://localhost:3000 timeout 130 pnpm dev --port 3000 > /tmp/emb-routes.log 2>&1 & )
sleep 27
P=3000; JAR=/tmp/emb.txt; rm -f $JAR
EMAIL=$(grep -E '^ADMIN_EMAIL=' .env.local | cut -d= -f2-)
PASS=$(grep -E '^ADMIN_PASSWORD=' .env.local | cut -d= -f2-)
curl -s -m10 -c $JAR -o /dev/null -X POST "http://localhost:$P/api/auth/sign-in/email" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}"
EDID=$(curl -s -m10 -b $JAR "http://localhost:$P/api/admin/editions" | python3 -c "import sys,json;print(next(e['id'] for e in json.load(sys.stdin)['editions'] if e['year']==2024))")
echo "2024 id: $EDID"
echo -n "GET unauth -> "; curl -s -m10 -o /dev/null -w "%{http_code}\n" "http://localhost:$P/api/admin/embeds?editionId=$EDID"
echo -n "GET authed initial count -> "; curl -s -m10 -b $JAR "http://localhost:$P/api/admin/embeds?editionId=$EDID" | python3 -c "import sys,json;print(len(json.load(sys.stdin)['embeds']))"
echo -n "POST published IG -> "; curl -s -m10 -b $JAR -H "Origin: http://localhost:$P" -X POST "http://localhost:$P/api/admin/embeds" -H "Content-Type: application/json" -d "{\"editionId\":\"$EDID\",\"platform\":\"instagram\",\"url\":\"https://www.instagram.com/p/TESTAAA/\",\"isPublished\":true}" -o /tmp/emb-a.json -w "%{http_code}\n"
echo -n "POST draft FB -> "; curl -s -m10 -b $JAR -H "Origin: http://localhost:$P" -X POST "http://localhost:$P/api/admin/embeds" -H "Content-Type: application/json" -d "{\"editionId\":\"$EDID\",\"platform\":\"facebook\",\"url\":\"https://www.facebook.com/x/posts/TESTBBB\",\"isPublished\":false}" -o /tmp/emb-b.json -w "%{http_code}\n"
echo -n "POST invalid url (400) -> "; curl -s -m10 -b $JAR -H "Origin: http://localhost:$P" -X POST "http://localhost:$P/api/admin/embeds" -H "Content-Type: application/json" -d "{\"editionId\":\"$EDID\",\"platform\":\"instagram\",\"url\":\"not-a-url\",\"isPublished\":true}" -o /dev/null -w "%{http_code}\n"
AID=$(python3 -c "import json;print(json.load(open('/tmp/emb-a.json'))['embed']['id'])")
echo "positions:"; python3 -c "import json;print('a pos',json.load(open('/tmp/emb-a.json'))['embed']['position'])"; python3 -c "import json;print('b pos',json.load(open('/tmp/emb-b.json'))['embed']['position'])"
echo -n "PATCH toggle a -> draft -> "; curl -s -m10 -b $JAR -H "Origin: http://localhost:$P" -X PATCH "http://localhost:$P/api/admin/embeds/$AID" -H "Content-Type: application/json" -d '{"platform":"instagram","url":"https://www.instagram.com/p/TESTAAA/","isPublished":false}' -o /dev/null -w "%{http_code}\n"
echo -n "PATCH bad uuid (400) -> "; curl -s -m10 -b $JAR -H "Origin: http://localhost:$P" -X PATCH "http://localhost:$P/api/admin/embeds/not-a-uuid" -H "Content-Type: application/json" -d '{"platform":"instagram","url":"https://x.com/p/1/","isPublished":true}' -o /dev/null -w "%{http_code}\n"
echo "before reorder:"; curl -s -m10 -b $JAR "http://localhost:$P/api/admin/embeds?editionId=$EDID" | python3 -c "import sys,json;d=json.load(sys.stdin)['embeds'];print([(e['position'],e['platform']) for e in d])"
IDS=$(curl -s -m10 -b $JAR "http://localhost:$P/api/admin/embeds?editionId=$EDID" | python3 -c "import sys,json,json as j;d=json.load(sys.stdin)['embeds'];ids=[e['id'] for e in d];ids.reverse();print(j.dumps(ids))")
echo -n "reorder reversed (200) -> "; curl -s -m10 -b $JAR -H "Origin: http://localhost:$P" -X POST "http://localhost:$P/api/admin/embeds/reorder" -H "Content-Type: application/json" -d "{\"editionId\":\"$EDID\",\"orderedIds\":$IDS}" -o /dev/null -w "%{http_code}\n"
echo "after reorder:"; curl -s -m10 -b $JAR "http://localhost:$P/api/admin/embeds?editionId=$EDID" | python3 -c "import sys,json;d=json.load(sys.stdin)['embeds'];print([(e['position'],e['platform']) for e in d])"
echo -n "reorder bad set (400) -> "; curl -s -m10 -b $JAR -H "Origin: http://localhost:$P" -X POST "http://localhost:$P/api/admin/embeds/reorder" -H "Content-Type: application/json" -d "{\"editionId\":\"$EDID\",\"orderedIds\":[\"11111111-1111-1111-1111-111111111111\"]}" -o /dev/null -w "%{http_code}\n"
echo "PUBLIC /api/editions/2024 embedLinks (only published, ordered):"; curl -s -m10 "http://localhost:$P/api/editions/2024" | python3 -c "import sys,json;d=json.load(sys.stdin).get('embedLinks',[]);print(len(d),[e['platform'] for e in d])"
echo "=== cleanup test rows ==="; for ID in $(curl -s -m10 -b $JAR "http://localhost:$P/api/admin/embeds?editionId=$EDID" | python3 -c "import sys,json;[print(e['id']) for e in json.load(sys.stdin)['embeds']]"); do curl -s -m10 -b $JAR -H "Origin: http://localhost:$P" -X DELETE "http://localhost:$P/api/admin/embeds/$ID" -o /dev/null -w "del %{http_code} "; done; echo
echo -n "final count (expect 0; seed runs in Task 12) -> "; curl -s -m10 -b $JAR "http://localhost:$P/api/admin/embeds?editionId=$EDID" | python3 -c "import sys,json;print(len(json.load(sys.stdin)['embeds']))"
sleep 14
```
Expected: GET unauth 401; create published 201; create draft 201; invalid url 400; positions 0 then 1; PATCH 200; bad uuid 400; reorder 200 (positions stay 0,1 contiguous, platforms reversed); bad set 400; **public `/api/editions/2024` `embedLinks` shows only the `isPublished:true` rows in order** (the draft FB hidden — and after the PATCH-to-draft above, expect 0 published just before cleanup). Cleanup deletes all test rows. Paste outputs. (Do NOT rely on a clean DB — if earlier tasks left rows, judge by relative behavior.)

- [ ] **Step 2: No commit** (verification only).

---

## Task 7: Admin React Query hooks

**Files:** Create `src/hooks/admin/useAdminEmbeds.ts` (mirror `useAdminAlerts.ts`)

- [ ] **Step 1: Write `src/hooks/admin/useAdminEmbeds.ts`**

```ts
'use client';

/* Module imports -------------------------------------- */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/* Type imports ---------------------------------------- */
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import type { AdminEditionEmbedDto } from 'db/queries/admin/listEditionEmbeds';
import type { CreateEditionEmbedInput, UpdateEditionEmbedInput } from 'validation/editionEmbed';

/* Fetchers -------------------------------------------- */
const fetchEmbeds = async (editionId: string): Promise<AdminEditionEmbedDto[]> => {
  const res = await fetch(`/api/admin/embeds?editionId=${editionId}`, { cache: 'no-store' });
  if(!res.ok) {
    throw new Error(`Failed to load embeds: ${res.status}`);
  }
  const body = await res.json() as { embeds: AdminEditionEmbedDto[] };
  return body.embeds;
};

const postEmbed = async (input: CreateEditionEmbedInput): Promise<void> => {
  const res = await fetch('/api/admin/embeds', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if(!res.ok) {
    throw new Error(`Création échouée (${res.status})`);
  }
};

const patchEmbed = async (vars: { id: string; input: UpdateEditionEmbedInput }): Promise<void> => {
  const res = await fetch(`/api/admin/embeds/${vars.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vars.input),
  });
  if(!res.ok) {
    throw new Error(`Mise à jour échouée (${res.status})`);
  }
};

const deleteEmbedRequest = async (id: string): Promise<void> => {
  const res = await fetch(`/api/admin/embeds/${id}`, { method: 'DELETE' });
  if(!res.ok) {
    throw new Error(`Suppression échouée (${res.status})`);
  }
};

const reorderEmbedsRequest = async (vars: { editionId: string; orderedIds: string[] }): Promise<void> => {
  const res = await fetch('/api/admin/embeds/reorder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vars),
  });
  if(!res.ok) {
    throw new Error(`Réordonnancement échoué (${res.status})`);
  }
};

/* Hooks ----------------------------------------------- */
export const useEmbedsQuery = (editionId: string | null): UseQueryResult<AdminEditionEmbedDto[], Error> => {
  return useQuery({
    queryKey: ['admin', 'embeds', editionId],
    queryFn: (): Promise<AdminEditionEmbedDto[]> => {
      if(editionId === null) {
        throw new Error('no edition');
      }
      return fetchEmbeds(editionId);
    },
    enabled: editionId !== null,
  });
};

export const useCreateEmbed = (): UseMutationResult<void, Error, CreateEditionEmbedInput> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postEmbed,
    onSuccess: (): void => { void qc.invalidateQueries({ queryKey: ['admin', 'embeds'] }); },
  });
};

export const useUpdateEmbed = (): UseMutationResult<void, Error, { id: string; input: UpdateEditionEmbedInput }> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: patchEmbed,
    onSuccess: (): void => { void qc.invalidateQueries({ queryKey: ['admin', 'embeds'] }); },
  });
};

export const useDeleteEmbed = (): UseMutationResult<void, Error, string> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteEmbedRequest,
    onSuccess: (): void => { void qc.invalidateQueries({ queryKey: ['admin', 'embeds'] }); },
  });
};

export const useReorderEmbeds = (): UseMutationResult<void, Error, { editionId: string; orderedIds: string[] }> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reorderEmbedsRequest,
    onSuccess: (): void => { void qc.invalidateQueries({ queryKey: ['admin', 'embeds'] }); },
  });
};
```

- [ ] **Step 2: Verify + commit**
```bash
pnpm tsc:ci && pnpm lint
git add src/hooks/admin/useAdminEmbeds.ts
git commit -m "Added TanStack Query hooks for admin edition embeds"
```

---

## Task 8: EmbedFormDialog (create/edit)

**Files:** Create `src/app/admin/embeds/EmbedFormDialog.tsx` (mirror `AlertFormDialog.tsx`)

- [ ] **Step 1: Write `src/app/admin/embeds/EmbedFormDialog.tsx`**

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
import { Switch } from 'components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'components/ui/select';

/* Module imports (project) ---------------------------- */
import { updateEditionEmbedSchema } from 'validation/editionEmbed';
import { useCreateEmbed, useUpdateEmbed } from 'hooks/admin/useAdminEmbeds';

/* Type imports ---------------------------------------- */
import type { AdminEditionEmbedDto } from 'db/queries/admin/listEditionEmbeds';

/* EmbedFormDialog component prop types ---------------- */
interface EmbedFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editionId: string;
  /** Present = edit mode. */
  embed?: AdminEditionEmbedDto;
}

interface EmbedFormValues {
  platform: 'instagram' | 'facebook';
  url: string;
  isPublished: boolean;
}

/* EmbedFormDialog component --------------------------- */
const EmbedFormDialog: React.FC<EmbedFormDialogProps> = (
  {
    open,
    onOpenChange,
    editionId,
    embed,
  },
) => {
  const isEdit: boolean = embed !== undefined;
  const createMutation = useCreateEmbed();
  const updateMutation = useUpdateEmbed();

  const form = useForm<EmbedFormValues>({
    resolver: zodResolver(updateEditionEmbedSchema) as never,
    defaultValues: {
      platform: embed?.platform ?? 'instagram',
      url: embed?.url ?? '',
      isPublished: embed?.isPublished ?? true,
    },
  });

  useEffect(
    () => {
      if(open) {
        form.reset({
          platform: embed?.platform ?? 'instagram',
          url: embed?.url ?? '',
          isPublished: embed?.isPublished ?? true,
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, embed],
  );

  const onSubmit = (values: EmbedFormValues): void => {
    if(isEdit && embed !== undefined) {
      updateMutation.mutate(
        { id: embed.id, input: values },
        {
          onSuccess: (): void => { toast.success('Embed mis à jour.'); onOpenChange(false); },
          onError: (error): void => { toast.error(error.message); },
        },
      );
      return;
    }
    createMutation.mutate(
      { ...values, editionId },
      {
        onSuccess: (): void => { toast.success('Embed créé.'); onOpenChange(false); },
        onError: (error): void => { toast.error(error.message); },
      },
    );
  };

  const pending: boolean = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier l\'embed' : 'Nouvel embed'}</DialogTitle>
          <DialogDescription>Collez l\'URL d\'une publication Instagram ou Facebook.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e): void => { void form.handleSubmit(onSubmit)(e); }} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label>Plateforme</Label>
            <Controller
              control={form.control}
              name="platform"
              render={({ field }): React.ReactElement => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="url">URL</Label>
            <Input id="url" {...form.register('url')} />
            {
              form.formState.errors.url !== undefined &&
                <p className="text-sm text-destructive">URL invalide.</p>
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
            <Label htmlFor="isPublished">Publié (visible sur le site public)</Label>
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

/* Export EmbedFormDialog component -------------------- */
export default EmbedFormDialog;
```
Note: `zodResolver(updateEditionEmbedSchema) as never` — create adds `editionId` in `onSubmit`, so the form validates the core (update) shape; the `as never` bridges resolver typing, same as `AlertFormDialog`. If the `Switch onCheckedChange` value isn't `boolean`, adjust (mirror `AlertFormDialog`).

- [ ] **Step 2: Verify + commit**
```bash
pnpm tsc:ci && pnpm lint
git add src/app/admin/embeds/EmbedFormDialog.tsx
git commit -m "Added edition-embed create/edit form dialog"
```

---

## Task 9: EmbedsTable (DnD rows + publish switch + delete)

**Files:** Create `src/app/admin/embeds/EmbedsTable.tsx` (mirror `AlertsTable.tsx`; admin always manages, so no `canManage` prop)

- [ ] **Step 1: Write `src/app/admin/embeds/EmbedsTable.tsx`**

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
import EmbedFormDialog from './EmbedFormDialog';

/* Module imports (project) ---------------------------- */
import { useEmbedsQuery, useUpdateEmbed, useDeleteEmbed, useReorderEmbeds } from 'hooks/admin/useAdminEmbeds';

/* Type imports ---------------------------------------- */
import type { AdminEditionEmbedDto } from 'db/queries/admin/listEditionEmbeds';

/* EmbedsTable component prop types -------------------- */
interface EmbedsTableProps {
  editionId: string;
}

/* Helpers --------------------------------------------- */
const platformLabel = (p: AdminEditionEmbedDto['platform']): string => (p === 'facebook' ? 'Facebook' : 'Instagram');

const arrayMove = <T,>(items: T[], from: number, to: number): T[] => {
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  if(moved !== undefined) {
    next.splice(to, 0, moved);
  }
  return next;
};

/* EmbedsTable component ------------------------------- */
const EmbedsTable: React.FC<EmbedsTableProps> = ({ editionId }) => {
  const embedsQuery = useEmbedsQuery(editionId);
  const updateMutation = useUpdateEmbed();
  const deleteMutation = useDeleteEmbed();
  const reorderMutation = useReorderEmbeds();

  const [editing, setEditing] = useState<AdminEditionEmbedDto | undefined>(undefined);
  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<AdminEditionEmbedDto | undefined>(undefined);

  const togglePublish = (embed: AdminEditionEmbedDto, next: boolean): void => {
    updateMutation.mutate(
      { id: embed.id, input: { platform: embed.platform, url: embed.url, isPublished: next } },
      {
        onSuccess: (): void => { toast.success(next ? 'Embed publié.' : 'Embed dépublié.'); },
        onError: (error): void => { toast.error(error.message); },
      },
    );
  };

  const onReorder = (from: number, to: number): void => {
    const reordered = arrayMove(embeds, from, to);
    reorderMutation.mutate(
      { editionId, orderedIds: reordered.map((e) => e.id) },
      { onError: (error): void => { toast.error(error.message); } },
    );
  };

  const confirmDelete = (): void => {
    if(deleting === undefined) {
      return;
    }
    const target = deleting;
    deleteMutation.mutate(target.id, {
      onSuccess: (): void => { toast.success('Embed supprimé.'); setDeleting(undefined); },
      onError: (error): void => { toast.error(error.message); setDeleting(undefined); },
    });
  };

  if(embedsQuery.isLoading) {
    return <p className="text-muted-foreground">Chargement…</p>;
  }
  if(embedsQuery.isError) {
    return <p className="text-destructive">Impossible de charger les embeds.</p>;
  }

  const embeds: AdminEditionEmbedDto[] = embedsQuery.data ?? [];
  if(embeds.length === 0) {
    return <p className="text-muted-foreground">Aucun embed pour cette édition.</p>;
  }

  const renderRowContent = (embed: AdminEditionEmbedDto): React.ReactNode => (
    <div className="flex flex-wrap items-center gap-3">
      <Badge variant="secondary">{platformLabel(embed.platform)}</Badge>
      <a
        href={embed.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 min-w-0 truncate text-sm text-blue-600 dark:text-blue-400 underline-offset-4 hover:underline"
      >
        {embed.url}
      </a>
      <div className="flex items-center gap-2">
        <Switch
          checked={embed.isPublished}
          onCheckedChange={(v): void => togglePublish(embed, v)}
          aria-label="Publier"
        />
        <Button variant="outline" size="sm" onClick={(): void => { setEditing(embed); setEditOpen(true); }}>
          Modifier
        </Button>
        <Button variant="destructive" size="sm" onClick={(): void => setDeleting(embed)}>
          Supprimer
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <SortableList
        ids={embeds.map((e) => e.id)}
        onReorder={onReorder}
        renderRow={(index): React.ReactNode => {
          const e = embeds[index];
          if(e === undefined) { return null; }
          return renderRowContent(e);
        }}
      />

      <EmbedFormDialog
        open={editOpen}
        onOpenChange={(o): void => { setEditOpen(o); if(!o) { setEditing(undefined); } }}
        editionId={editionId}
        embed={editing}
      />

      <ConfirmDialog
        open={deleting !== undefined}
        onOpenChange={(o): void => { if(!o) { setDeleting(undefined); } }}
        title="Supprimer cet embed ?"
        description={<span>Cette action est définitive.</span>}
        confirmLabel="Supprimer"
        pending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

/* Export EmbedsTable component ------------------------ */
export default EmbedsTable;
```
Notes: `SortableList` import alias `app/admin/events/SortableList` (mirror `AlertsTable`); if it fails use a relative path and report. Match `ConfirmDialog` props to `AlertsTable.tsx`'s usage.

- [ ] **Step 2: Verify + commit**
```bash
pnpm lint-fix
pnpm tsc:ci && pnpm lint
git add src/app/admin/embeds/EmbedsTable.tsx
git commit -m "Added EmbedsTable (DnD reorder + publish switch + delete)"
```

---

## Task 10: EmbedsManager + page + nav item

**Files:** Create `src/app/admin/embeds/EmbedsManager.tsx`, `src/app/admin/embeds/page.tsx`; Modify `src/app/admin/AdminShell/navItems.ts`

- [ ] **Step 1: Write `src/app/admin/embeds/EmbedsManager.tsx`** (mirror `AlertsManager.tsx`, minus the `canManage` prop — admin-only)

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
import EmbedsTable from './EmbedsTable';
import EmbedFormDialog from './EmbedFormDialog';

/* Module imports (project) ---------------------------- */
import { useEditionsQuery } from 'hooks/admin/useEditions';

/* EmbedsManager component ----------------------------- */
const EmbedsManager: React.FC = () => {
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
        if(latest !== undefined) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setEditionId(latest.id);
          router.replace(`/admin/embeds?edition=${latest.id}`);
        }
      }
    },
    [editionId, editionsQuery.data, router],
  );

  const onEditionChange = (value: string): void => {
    setEditionId(value);
    router.replace(`/admin/embeds?edition=${value}`);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Réseaux</h1>
        {
          editionId !== null &&
            <Button onClick={(): void => setCreateOpen(true)}>Nouvel embed</Button>
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
          ? <EmbedsTable editionId={editionId} />
          : <p className="text-muted-foreground">Sélectionnez une édition.</p>
      }

      {
        editionId !== null &&
          <EmbedFormDialog open={createOpen} onOpenChange={setCreateOpen} editionId={editionId} />
      }
    </div>
  );
};

/* Export EmbedsManager component ---------------------- */
export default EmbedsManager;
```

- [ ] **Step 2: Write `src/app/admin/embeds/page.tsx`**
```tsx
/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import EmbedsManager from './EmbedsManager';

/* Module imports (project) ---------------------------- */
import { requireRole } from 'auth/helpers';

/* EmbedsPage component -------------------------------- */
const EmbedsPage = async (): Promise<React.ReactElement> => {
  await requireRole('admin');
  return <EmbedsManager />;
};

/* Export EmbedsPage component ------------------------- */
export default EmbedsPage;
```
(Match the `requireRole('admin')` usage in `src/app/admin/users/page.tsx`.)

- [ ] **Step 3: Add the nav item** in `src/app/admin/AdminShell/navItems.ts`: add `Share2` to the lucide import, and a new entry (admin-only, after Alertes):
```ts
  { href: '/admin/embeds', label: 'Réseaux', icon: Share2, roles: ['admin'] },
```

- [ ] **Step 4: Verify + commit**
```bash
pnpm lint-fix
pnpm tsc:ci && pnpm lint
git add src/app/admin/embeds/EmbedsManager.tsx src/app/admin/embeds/page.tsx src/app/admin/AdminShell/navItems.ts
git commit -m "Added /admin/embeds manager page + nav item"
```

---

## Task 11: Public EditionEmbeds component + wire `[year]` page

**Files:** Create `src/components/EditionEmbeds/EditionEmbeds.tsx`; Modify `src/app/(public)/[year]/types.ts`, `src/app/(public)/[year]/page.tsx`

- [ ] **Step 1: Add `EmbedLinkView` to `src/app/(public)/[year]/types.ts`** — append:
```ts
export interface EmbedLinkView {
  id: string;
  platform: 'instagram' | 'facebook';
  url: string;
}
```

- [ ] **Step 2: Write `src/components/EditionEmbeds/EditionEmbeds.tsx`**
```tsx
'use client';

/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import { InstagramEmbed, FacebookEmbed } from 'components/embeds';

/* Type imports ---------------------------------------- */
import type { EmbedLinkView } from 'app/(public)/[year]/types';

/* EditionEmbeds component prop types ------------------ */
interface EditionEmbedsProps {
  embeds: EmbedLinkView[];
}

/* EditionEmbeds component ----------------------------- */
const EditionEmbeds: React.FC<EditionEmbedsProps> = ({ embeds }) => {
  if(embeds.length === 0) {
    return null;
  }
  return (
    <section className="w-full max-w-5xl px-4 lg:py-8 mx-auto lg:px-0">
      <h4 className="text-2xl font-semibold tracking-tight pb-4">
        Sur les réseaux
      </h4>
      <div className="flex flex-col items-center gap-6">
        {
          embeds.map((embed) => (
            embed.platform === 'facebook'
              ? <FacebookEmbed key={embed.id} url={embed.url} />
              : <InstagramEmbed key={embed.id} url={embed.url} />
          ))
        }
      </div>
    </section>
  );
};

/* Export EditionEmbeds component ---------------------- */
export default EditionEmbeds;
```
If the `app/(public)/[year]/types` alias path fails to resolve (parens/brackets), import the type with a relative path and report.

- [ ] **Step 3: Wire `src/app/(public)/[year]/page.tsx`**

(a) Replace the embeds import line `import { InstagramEmbed } from 'components/embeds';` with:
```tsx
import EditionEmbeds from 'components/EditionEmbeds/EditionEmbeds';
```
(b) Add `EmbedLinkView` to the type import from `'./types'`:
```tsx
import type { EditionView, EventSummaryView, GeneralAlertView, EmbedLinkView } from './types';
```
(c) Update `fetchEdition`'s return type + body to include `embedLinks`:
```tsx
const fetchEdition = async (year: string): Promise<{ edition: EditionView; generalAlerts: GeneralAlertView[]; embedLinks: EmbedLinkView[] }> => {
```
and the final `return await response.json() as { edition: EditionView; generalAlerts: GeneralAlertView[]; embedLinks: EmbedLinkView[] };`
(d) Add state `const [embedLinks, setEmbedLinks] = useState<EmbedLinkView[]>([]);` (next to `generalAlerts` state) and set it in the `.then`: `setEmbedLinks(editionPayload.embedLinks);`
(e) Remove BOTH hardcoded `<InstagramEmbed ... />` blocks. Replace the first standalone `<section>...<InstagramEmbed.../></section>` (after `<EventsRecap>`) with:
```tsx
        <EditionEmbeds embeds={embedLinks} />
```
and in the map `<section>`, delete the trailing `<InstagramEmbed url="https://www.instagram.com/p/C8bz_zPIUdX/" />` line (keep the heading + `<EventsMap>`).

- [ ] **Step 4: Verify + commit**
```bash
pnpm tsc:ci && pnpm lint
git add "src/app/(public)/[year]/types.ts" "src/app/(public)/[year]/page.tsx" src/components/EditionEmbeds/EditionEmbeds.tsx
git commit -m "Render edition embeds on the public page; drop hardcoded Instagram posts"
```

---

## Task 12: Seed fixture + Supabase apply + E2E + build

**Files:** Modify `src/db/seed/index.ts`

- [ ] **Step 1: Add edition embeds to the seed** in `src/db/seed/index.ts`:

(a) Add `editionEmbedLinks` to the schema import (the `from '../schema'` import that already brings `eventEmbedLinks`).
(b) Extend the `EditionSeed` interface with `embedLinks?: { platform: 'instagram' | 'facebook'; url: string; isPublished?: boolean }[];`.
(c) Add the embeds to the **2024** entry in `EDITIONS`:
```ts
    embedLinks: [
      { platform: 'instagram', url: 'https://www.instagram.com/p/C8bvNYJI_BV/?img_index=1' },
      { platform: 'instagram', url: 'https://www.instagram.com/p/C8bz_zPIUdX/' },
    ],
```
(d) Add a `syncEditionEmbeds` helper (mirror `syncEmbedLinks`):
```ts
const syncEditionEmbeds = async (
  tx: Tx,
  editionId: string,
  embeds: { platform: 'instagram' | 'facebook'; url: string; isPublished?: boolean }[] | undefined,
): Promise<void> => {
  const list = embeds ?? [];
  for(let i = 0; i < list.length; i++) {
    const embed = list[i];
    if(embed === undefined) continue;
    await tx
      .insert(editionEmbedLinks)
      .values({ editionId, platform: embed.platform, url: embed.url, isPublished: embed.isPublished ?? true, position: i })
      .onConflictDoUpdate({
        target: [editionEmbedLinks.editionId, editionEmbedLinks.position],
        set: { platform: embed.platform, url: embed.url, isPublished: embed.isPublished ?? true },
      });
  }
  await tx.execute(
    sql`DELETE FROM edition_embed_links WHERE edition_id = ${editionId} AND position >= ${list.length}`,
  );
};
```
(e) In `main()`, after `const editionId: string = await upsertEdition(edition);`, wrap an embeds sync in a transaction:
```ts
    await db.transaction(async (tx) => {
      await syncEditionEmbeds(tx, editionId, edition.embedLinks);
    });
```
and include the embed count in the per-edition `console.log` (optional; add `+ (edition.embedLinks?.length ?? 0)` style count or a separate log line).

- [ ] **Step 2: Apply to Supabase + reseed**
```bash
pnpm db:seed
```
Expected: the 2024 edition gets 2 `edition_embed_links` rows (positions 0,1, published). Idempotent — safe to re-run. (`db:migrate` already ran in Task 1.)

- [ ] **Step 3: Build + final checks**
```bash
pnpm tsc:ci && pnpm lint
pnpm build
```
Expected: build exit 0; routes include `/admin/embeds`, `/api/admin/embeds`, `/api/admin/embeds/[id]`, `/api/admin/embeds/reorder`. (Clear `.next` first if a stale dev-types artifact causes a phantom tsc error: `rm -rf .next`.)

- [ ] **Step 4: E2E — public shows the seeded embeds**
```bash
( BETTER_AUTH_URL=http://localhost:3000 timeout 80 pnpm dev --port 3000 > /tmp/emb-e2e.log 2>&1 & )
sleep 26
P=3000
echo -n "public /api/editions/2024 embedLinks -> "; curl -s -m10 "http://localhost:$P/api/editions/2024" | python3 -c "import sys,json;d=json.load(sys.stdin).get('embedLinks',[]);print(len(d),[e['platform'] for e in d])"
echo -n "/2024 page renders -> "; curl -s -o /dev/null -w "%{http_code}\n" -m 15 "http://localhost:$P/2024"
sleep 10
```
Expected: `embedLinks` length 2, both `instagram`; `/2024` → 200.

- [ ] **Step 5: Browser walk-through (manual)**: `/admin/embeds` → pick 2024 → see 2 embeds → add a Facebook one / reorder / toggle publish / delete; open `/2024` → published embeds render in one "Sur les réseaux" section in order; toggle one to draft → it disappears from `/2024`; the "Cartes des événements" map section still renders (no inline embed).

- [ ] **Step 6: Commit**
```bash
git add src/db/seed/index.ts
git commit -m "Seeded 2024 edition embeds from the former hardcoded Instagram posts"
```

---

## Final verification checklist

- [ ] `pnpm tsc:ci` clean; `pnpm lint` clean (1 pre-existing warning); `pnpm build` exit 0
- [ ] migration creates `edition_embed_links` (+ position unique index + check); applied to Supabase
- [ ] `/api/admin/embeds` GET 401 unauth / 200 admin / 400 missing editionId; POST 201 / 400 invalid url
- [ ] `/api/admin/embeds/[id]` PATCH 200/404/400; DELETE 200/404
- [ ] `/api/admin/embeds/reorder` 200 (positions contiguous, no collision) / 400 mismatch
- [ ] public `/api/editions/2024` returns only **published** embeds in order; draft hidden
- [ ] `/2024` renders one "Sur les réseaux" section; both hardcoded `<InstagramEmbed>` removed; map section intact
- [ ] seed upserts the 2 Instagram posts onto 2024 (idempotent); 2023 unchanged
- [ ] `/admin/embeds` nav item visible to admin only

## Spec coverage map

- §1 scope (edition-scoped ordered embeds, /admin/embeds, one public section, seed 2024) — Tasks 1,5,10,11,12
- §2 reuse (embedPlatformEnum, eventEmbedLinks template, alerts pattern, getEdition, embed components) — Tasks 1,3,4,5,7–11
- §3 data model (table, default-true isPublished, position unique + check, no url unique) — Task 1
- §4 validation — Task 2
- §5 server (mutations, admin query, getEdition extension) — Tasks 3,4
- §6 admin routes (admin-only) — Task 5
- §7 admin UI (manager/table/dialog/nav/hooks) — Tasks 7–10
- §8 public render (EditionEmbeds + page wiring + types) — Task 11
- §9 seed fixture — Task 12
- §10 verification (Supabase apply + curl + browser) — Tasks 1,6,12
- §11 rollout / §12 risks — covered across tasks (public-read regression check in Tasks 6/12; seed idempotency in Task 12)
