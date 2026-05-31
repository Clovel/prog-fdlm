# AI-Agent Access Layer (MCP + OAuth) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose the festival data to AI agents — a public unauthenticated MCP server for reads (visitors/scrapers) and an OAuth-gated MCP server for admin writes (batch event creation) — plus a discoverability layer (JSON-LD, llms.txt, robots, sitemap, OpenAPI).

**Architecture:** Two `mcp-handler` Streamable-HTTP MCP endpoints hosted as Next.js route handlers in the existing Vercel app. MCP tools call the existing `src/db/queries/*` and `src/db/mutations/*` functions directly (no HTTP hop). BetterAuth's `mcp()` plugin turns the app into an OAuth 2.1 provider so the admin endpoint authenticates via `withMcpAuth`. Reads reuse the published-only public queries.

**Tech Stack:** Next.js 16 App Router, TypeScript, Drizzle ORM, BetterAuth 1.6.12 (`mcp()` plugin), `mcp-handler` (Vercel MCP adapter), Zod v4.

**Verification note:** This repo has **no test framework** (per CLAUDE.md). "Verify" steps use `pnpm tsc:ci`, `pnpm lint`, `pnpm build`, the **MCP Inspector** (`npx @modelcontextprotocol/inspector`) against a running `pnpm dev`, and `curl`. A running dev server with `DATABASE_URL` set is assumed for runtime checks.

---

## File structure

| File | Responsibility |
|---|---|
| `src/validation/event.ts` (modify) | Add `createEventsBatchSchema` + `CreateEventsBatchInput` |
| `src/db/mutations/events.ts` (modify) | Add `createEventsBatch(editionId, items)` |
| `src/app/api/openapi.json/route.ts` (create) | Serve OpenAPI 3.1 doc generated from Zod schemas |
| `src/mcp/tools.ts` (create) | Shared tool registration helpers (read tools, write tools) used by both endpoints |
| `src/app/api/mcp/[transport]/route.ts` (create) | Public, unauthenticated, read-only MCP server |
| `src/app/api/mcp/admin/[transport]/route.ts` (create) | OAuth-gated admin MCP server (read + write tools) |
| `src/auth/config.ts` (modify) | Add `mcp()` plugin |
| `src/app/.well-known/oauth-authorization-server/route.ts` (create) | OAuth AS discovery metadata |
| `src/app/.well-known/oauth-protected-resource/route.ts` (create) | OAuth protected-resource metadata (RFC 9728) |
| `next.config.js` (modify) | Add `mcp-handler` to `serverExternalPackages` if needed |
| `src/app/(public)/[year]/page.tsx` (modify) | Inject Schema.org `Event` JSON-LD |
| `src/app/llms.txt/route.ts` (create) | Serve `llms.txt` |
| `src/app/robots.txt` (modify) | Disallow admin paths, link sitemap |
| `src/app/sitemap.ts` (create) | Next sitemap for published editions |
| `docs/agent-access.md` (create) | Connect-a-client usage docs |

---

## Phase 1 — Core (batch mutation + OpenAPI)

### Task 1: Batch-create validation schema

**Files:**
- Modify: `src/validation/event.ts` (after line 74, the `updateEventSchema` definition)

- [ ] **Step 1: Add the batch schema**

A batch item is structurally identical to `updateEventSchema` (the shared `apiCore` field set with the `endAfterStart` refinement, no `editionId`). The `editionId` is shared at the batch level. Reuse `updateEventSchema` for items.

Append to `src/validation/event.ts` (after the `export type UpdateEventInput` line):

```ts
/* Batch create (one edition, many events) ------------- */
export const createEventsBatchSchema = z.object({
  editionId: z.string().uuid(),
  events: z.array(updateEventSchema).min(1, 'Au moins un évènement requis').max(100, 'Maximum 100 évènements par lot'),
});

export type CreateEventsBatchInput = z.infer<typeof createEventsBatchSchema>;
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm tsc:ci`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/validation/event.ts
git commit -m "Add createEventsBatch validation schema"
```

### Task 2: `createEventsBatch` mutation

**Files:**
- Modify: `src/db/mutations/events.ts`

- [ ] **Step 1: Add the mutation**

`coreValues` and `insertChildren` already accept `CreateEventInput | UpdateEventInput`; a batch item is an `UpdateEventInput`. Insert all items inside one transaction (all-or-nothing). Validation is the caller's job (the tool/route runs `createEventsBatchSchema` first), so this function assumes already-valid input.

Add the import at the top of the type imports block:

```ts
import type { CreateEventInput, UpdateEventInput } from 'validation/event';
```

(already present — no change needed). Append this mutation after `createEventWithChildren`:

```ts
export const createEventsBatch = async (
  editionId: string,
  items: UpdateEventInput[],
): Promise<string[]> => {
  return db.transaction(async (tx) => {
    const ids: string[] = [];
    for(const item of items) {
      const rows = await tx
        .insert(events)
        .values({ editionId, ...coreValues(item) } as typeof events.$inferInsert)
        .returning({ id: events.id });
      const row = rows[0];
      if(row === undefined) {
        throw new Error('createEventsBatch: insert returned no row');
      }
      await insertChildren(tx, row.id, item);
      ids.push(row.id);
    }
    return ids;
  });
};
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm tsc:ci`
Expected: no errors.

- [ ] **Step 3: Verify lint**

Run: `pnpm exec eslint src/db/mutations/events.ts`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/db/mutations/events.ts
git commit -m "Add createEventsBatch transactional mutation"
```

### Task 3: OpenAPI 3.1 document route

**Files:**
- Create: `src/app/api/openapi.json/route.ts`

- [ ] **Step 1: Write the route**

Generate JSON Schemas from the existing Zod schemas with zod v4's `z.toJSONSchema`, embed them in a hand-written OpenAPI skeleton describing the public read routes and the admin write routes. This is a static GET; no auth.

```ts
/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';
import { z } from 'zod';

/* Module imports (project) ---------------------------- */
import { createEventSchema, updateEventSchema, createEventsBatchSchema } from 'validation/event';

/* GET — OpenAPI 3.1 document -------------------------- */
export const GET = (): NextResponse => {
  const doc = {
    openapi: '3.1.0',
    info: {
      title: 'Fête de la Musique Bordeaux API',
      version: '1.0.0',
      description: 'Public read API (published editions) + admin write API. See /api/mcp for the agent (MCP) interface.',
    },
    servers: [{ url: '/' }],
    paths: {
      '/api/editions': {
        get: { summary: 'List published editions', responses: { '200': { description: 'OK' } } },
      },
      '/api/editions/{year}': {
        get: {
          summary: 'Get one published edition',
          parameters: [{ name: 'year', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { '200': { description: 'OK' }, '404': { description: 'Not found' } },
        },
      },
      '/api/editions/{year}/events': {
        get: {
          summary: 'List events for a published edition (cursor paginated)',
          parameters: [
            { name: 'year', in: 'path', required: true, schema: { type: 'integer' } },
            { name: 'category', in: 'query', schema: { type: 'string' } },
            { name: 'q', in: 'query', schema: { type: 'string' } },
            { name: 'genre', in: 'query', schema: { type: 'string' } },
            { name: 'status', in: 'query', schema: { type: 'string' } },
            { name: 'cursor', in: 'query', schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'OK' } },
        },
      },
      '/api/events/{eventId}': {
        get: {
          summary: 'Get event detail',
          parameters: [{ name: 'eventId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '200': { description: 'OK' }, '404': { description: 'Not found' } },
        },
      },
      '/api/admin/events': {
        post: {
          summary: 'Create one event (admin/editor)',
          requestBody: { required: true, content: { 'application/json': { schema: z.toJSONSchema(createEventSchema) } } },
          responses: { '201': { description: 'Created' }, '401': { description: 'Unauthorized' }, '403': { description: 'Forbidden' } },
        },
      },
      '/api/admin/events/{id}': {
        patch: {
          summary: 'Update one event (admin/editor)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: { required: true, content: { 'application/json': { schema: z.toJSONSchema(updateEventSchema) } } },
          responses: { '200': { description: 'OK' } },
        },
        delete: {
          summary: 'Delete one event (admin/editor)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '200': { description: 'OK' } },
        },
      },
    },
    'x-mcp': {
      batchEventSchema: z.toJSONSchema(createEventsBatchSchema),
      publicMcpEndpoint: '/api/mcp/mcp',
      adminMcpEndpoint: '/api/mcp/admin/mcp',
    },
  };
  return NextResponse.json(doc);
};
```

- [ ] **Step 2: Verify it compiles and serves**

Run: `pnpm tsc:ci`
Then with `pnpm dev` running: `curl -s localhost:3000/api/openapi.json | head -c 200`
Expected: JSON beginning `{"openapi":"3.1.0"...`. If `z.toJSONSchema` is unavailable on the installed zod, replace those calls with `{}` and note it — zod v4.0+ ships `z.toJSONSchema`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/openapi.json/route.ts
git commit -m "Add OpenAPI 3.1 document route"
```

---

## Phase 2 — Public read MCP

### Task 4: Install `mcp-handler` and mark it server-external

**Files:**
- Modify: `package.json` (via pnpm), `next.config.js`

- [ ] **Step 1: Install**

Run: `pnpm add mcp-handler`
(Do not pass extra flags; respects the pinned pnpm 9.15.9.)

- [ ] **Step 2: Confirm the installed API**

Run: `node -e "console.log(Object.keys(require('mcp-handler')))"`
Expected: an array containing `createMcpHandler` (and possibly `withMcpAuth`). Note the exact exported names — Task 5/6 reference `createMcpHandler` from `mcp-handler` and `withMcpAuth` from `better-auth/plugins`. If `createMcpHandler` is named differently in the installed version, adjust the imports in Tasks 5–6 accordingly.

- [ ] **Step 3: Add to serverExternalPackages**

Edit `next.config.js`:

```js
  serverExternalPackages: ['better-auth', 'kysely', 'mcp-handler'],
```

- [ ] **Step 4: Verify build still works**

Run: `pnpm tsc:ci && pnpm build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml next.config.js
git commit -m "Add mcp-handler dependency"
```

### Task 5: Shared read-tool registration

**Files:**
- Create: `src/mcp/tools.ts`

- [ ] **Step 1: Write the shared tool registrations**

This module registers tools onto an `mcp-handler` server instance. Read tools use the **public, published-only** queries. The `server` argument is the builder passed by `createMcpHandler`. Tools return `{ content: [{ type: 'text', text }] }`; on failure set `isError: true`.

```ts
/* Module imports -------------------------------------- */
import { z } from 'zod';

/* Module imports (project) ---------------------------- */
import { listEditions } from 'db/queries/listEditions';
import { getEdition } from 'db/queries/getEdition';
import { listEditionEvents } from 'db/queries/listEditionEvents';
import { getEventDetail } from 'db/queries/getEventDetail';
import { createEventsBatch, createEventWithChildren, updateEventWithChildren, deleteEvent } from 'db/mutations/events';
import { createEventSchema, updateEventSchema, createEventsBatchSchema } from 'validation/event';

/* Types ----------------------------------------------- */
// Minimal structural type for the mcp-handler server builder's `tool` method.
interface ToolResult { content: Array<{ type: 'text'; text: string }>; isError?: boolean; }
interface McpServer {
  tool: (
    name: string,
    description: string,
    schema: Record<string, z.ZodTypeAny>,
    handler: (args: Record<string, unknown>) => Promise<ToolResult>,
  ) => void;
}

/* Helpers --------------------------------------------- */
const ok = (data: unknown): ToolResult => ({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] });
const fail = (message: string): ToolResult => ({ content: [{ type: 'text', text: message }], isError: true });

/* Read tools (public, published-only) ----------------- */
export const registerReadTools = (server: McpServer): void => {
  server.tool('list_editions', 'List all published festival editions (years).', {}, async (): Promise<ToolResult> => {
    return ok(await listEditions());
  });

  server.tool(
    'get_edition',
    'Get one published edition by year, including its published general alerts.',
    { year: z.number().int() },
    async (args): Promise<ToolResult> => {
      const result = await getEdition(args.year as number);
      return result === null ? fail(`No published edition for year ${String(args.year)}`) : ok(result);
    },
  );

  server.tool(
    'list_events',
    'List events for a published edition. Supports filters and cursor pagination. Returns { events, nextCursor }.',
    {
      year: z.number().int(),
      category: z.string().optional(),
      q: z.string().optional(),
      genre: z.string().optional(),
      status: z.enum(['canceled', 'postponed', 'rescheduled']).optional(),
      cursor: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional(),
    },
    async (args): Promise<ToolResult> => {
      const result = await listEditionEvents({
        year: args.year as number,
        category: args.category as never,
        q: args.q as string | undefined,
        genre: args.genre as string | undefined,
        status: args.status as never,
        cursor: args.cursor as string | undefined,
        limit: (args.limit as number | undefined) ?? 50,
      });
      return result === null ? fail(`No published edition for year ${String(args.year)}`) : ok(result);
    },
  );

  server.tool(
    'get_event',
    'Get full detail for one event (description, links, embeds, alerts) by id.',
    { eventId: z.string().uuid() },
    async (args): Promise<ToolResult> => {
      const result = await getEventDetail(args.eventId as string);
      return result === null ? fail(`No event ${String(args.eventId)}`) : ok(result);
    },
  );
};

/* Write tools (admin/editor only — gated by the route) */
export const registerWriteTools = (server: McpServer): void => {
  server.tool(
    'create_event',
    'Create one event. Provide editionId and event fields. Returns the new event id.',
    createEventSchema.shape,
    async (args): Promise<ToolResult> => {
      const parsed = createEventSchema.safeParse(args);
      if(!parsed.success) {
        return fail(`Validation failed: ${JSON.stringify(parsed.error.issues)}`);
      }
      const id = await createEventWithChildren(parsed.data);
      return ok({ id });
    },
  );

  server.tool(
    'create_events_batch',
    'Create many events in one edition atomically. Validates every event first; if any is invalid, nothing is written. Returns { ids }.',
    createEventsBatchSchema.shape,
    async (args): Promise<ToolResult> => {
      const parsed = createEventsBatchSchema.safeParse(args);
      if(!parsed.success) {
        return fail(`Validation failed: ${JSON.stringify(parsed.error.issues)}`);
      }
      const ids = await createEventsBatch(parsed.data.editionId, parsed.data.events);
      return ok({ count: ids.length, ids });
    },
  );

  server.tool(
    'update_event',
    'Update one event by id (replaces all fields). Returns the event id.',
    { id: z.string().uuid(), ...updateEventSchema.shape },
    async (args): Promise<ToolResult> => {
      const { id, ...rest } = args;
      const parsed = updateEventSchema.safeParse(rest);
      if(!parsed.success) {
        return fail(`Validation failed: ${JSON.stringify(parsed.error.issues)}`);
      }
      const updated = await updateEventWithChildren(id as string, parsed.data);
      return updated === null ? fail(`No event ${String(id)}`) : ok({ id: updated });
    },
  );

  server.tool(
    'delete_event',
    'Delete one event by id. Returns { deleted: true }.',
    { id: z.string().uuid() },
    async (args): Promise<ToolResult> => {
      const deleted = await deleteEvent(args.id as string);
      return deleted ? ok({ deleted: true }) : fail(`No event ${String(args.id)}`);
    },
  );
};
```

> Note: `createEventSchema.shape` includes the `endAfterStart` refinement only at parse time, not in `.shape`; passing `.shape` to `server.tool` gives the client the field types, and the `safeParse` inside the handler enforces the refinement. This is intentional and correct.

- [ ] **Step 2: Verify it compiles**

Run: `pnpm tsc:ci`
Expected: no errors. If the `ListEditionEventsInput` cast types (`as never`) trip `strict-boolean-expressions` or `no-unnecessary-type-assertion`, narrow them to the real union types from `db/queries/types` instead.

- [ ] **Step 3: Commit**

```bash
git add src/mcp/tools.ts
git commit -m "Add shared MCP read/write tool registrations"
```

### Task 6: Public read MCP endpoint

**Files:**
- Create: `src/app/api/mcp/[transport]/route.ts`

- [ ] **Step 1: Write the public MCP route**

Public, unauthenticated, read-only. Stateless Streamable HTTP (no Redis). `basePath: '/api/mcp'` → the client connection URL is `/api/mcp/mcp`.

```ts
/* Framework imports ----------------------------------- */
import { createMcpHandler } from 'mcp-handler';

/* Module imports (project) ---------------------------- */
import { registerReadTools } from 'mcp/tools';

/* Public read-only MCP server ------------------------- */
const handler = createMcpHandler(
  (server) => {
    registerReadTools(server);
  },
  {},
  { basePath: '/api/mcp' },
);

export { handler as GET, handler as POST, handler as DELETE };
```

- [ ] **Step 2: Verify with the MCP Inspector**

With `pnpm dev` running:
Run: `npx @modelcontextprotocol/inspector`
In the Inspector UI: transport = Streamable HTTP, URL = `http://localhost:3000/api/mcp/mcp`. Connect, list tools (expect `list_editions`, `get_edition`, `list_events`, `get_event`), call `list_editions`.
Expected: returns the published editions JSON.

- [ ] **Step 3: Verify tsc/lint**

Run: `pnpm tsc:ci && pnpm exec eslint src/app/api/mcp/[transport]/route.ts src/mcp/tools.ts`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/mcp src/mcp
git commit -m "Add public read-only MCP endpoint"
```

---

## Phase 3 — OAuth provider + admin write MCP

### Task 7: BetterAuth as OAuth provider

**Files:**
- Modify: `src/auth/config.ts`
- Create: `src/app/.well-known/oauth-authorization-server/route.ts`
- Create: `src/app/.well-known/oauth-protected-resource/route.ts`

- [ ] **Step 1: Add the `mcp()` plugin**

Edit `src/auth/config.ts` — add the import and the plugin. The existing `/login` page is the consent/login screen.

```ts
import { mcp } from 'better-auth/plugins';
```

In the `plugins` array (keep `nextCookies()` **last**, as BetterAuth requires):

```ts
  plugins: [
    mcp({ loginPage: '/login' }),
    nextCookies(),
  ],
```

- [ ] **Step 2: Add the discovery metadata routes**

`src/app/.well-known/oauth-authorization-server/route.ts`:

```ts
/* Module imports (project) ---------------------------- */
import { oAuthDiscoveryMetadata } from 'better-auth/plugins';
import { auth } from 'auth/config';

export const GET = oAuthDiscoveryMetadata(auth);
```

`src/app/.well-known/oauth-protected-resource/route.ts`:

```ts
/* Module imports (project) ---------------------------- */
import { oAuthProtectedResourceMetadata } from 'better-auth/plugins';
import { auth } from 'auth/config';

export const GET = oAuthProtectedResourceMetadata(auth);
```

- [ ] **Step 3: Generate and apply the OAuth tables migration**

The `mcp()` plugin adds OAuth application/token tables. Generate the schema diff and apply it.

Run: `pnpm db:generate`
Expected: a new `src/db/migrations/NNNN_*.sql` creating the oauth tables (e.g. `oauthApplication`, `oauthAccessToken`, `oauthConsent`). Review the SQL.
Then: `pnpm db:migrate`
Expected: applies cleanly to the database `DATABASE_URL` points at.

> If `pnpm db:generate` does not pick up the plugin tables (BetterAuth plugins are not always Drizzle-schema-visible), generate the SQL with BetterAuth's own CLI instead: `pnpm exec @better-auth/cli generate` / `migrate`, then reconcile. Confirm the tables exist with `pnpm db:studio`.

- [ ] **Step 4: Verify kysely pin still works + discovery serves**

Run: `pnpm tsc:ci && pnpm build`
Expected: build succeeds (confirms the OAuth plugin runs on the pinned kysely 0.28.17 — the key risk from the spec).
With `pnpm dev`: `curl -s localhost:3000/.well-known/oauth-authorization-server | head -c 200`
Expected: JSON with `issuer`, `authorization_endpoint`, `token_endpoint`, `registration_endpoint`.

- [ ] **Step 5: Commit**

```bash
git add src/auth/config.ts src/app/.well-known src/db/migrations
git commit -m "Enable BetterAuth OAuth provider for MCP (mcp plugin + discovery)"
```

### Task 8: Admin (OAuth-gated) MCP endpoint

**Files:**
- Create: `src/app/api/mcp/admin/[transport]/route.ts`

- [ ] **Step 1: Write the admin MCP route**

Wrap `createMcpHandler` with `withMcpAuth`. Register **read and write** tools. Enforce role inside the auth callback: only `admin`/`editor` may proceed; otherwise return the handler with no write tools is insufficient — instead reject. `withMcpAuth(auth, (req, session) => handler(req))` provides the validated `session`; check `session.user.role` (the access-token record carries the user). `basePath: '/api/mcp/admin'` → client URL `/api/mcp/admin/mcp`.

```ts
/* Framework imports ----------------------------------- */
import { createMcpHandler } from 'mcp-handler';
import { withMcpAuth } from 'better-auth/plugins';

/* Module imports (project) ---------------------------- */
import { auth } from 'auth/config';
import { registerReadTools, registerWriteTools } from 'mcp/tools';

/* Admin MCP server (OAuth-gated, admin/editor) -------- */
const handler = withMcpAuth(auth, (req, _session) => {
  return createMcpHandler(
    (server) => {
      registerReadTools(server);
      registerWriteTools(server);
    },
    {},
    { basePath: '/api/mcp/admin' },
  )(req);
});

export { handler as GET, handler as POST, handler as DELETE };
```

> Role enforcement: `withMcpAuth` rejects unauthenticated requests (no/invalid token). To additionally restrict by role, configure the scope on the `mcp()` plugin or check `session.role`/`session.user.role` inside the callback and return a 403 `Response` when the role is not `admin`/`editor`. Confirm the exact `session` shape from the `withMcpAuth` callback against the installed better-auth types (`node -e` or hover) before finalizing; adjust the guard to the real field path.

- [ ] **Step 2: Add the explicit role guard**

Refine Step 1 once the session shape is confirmed. Replace the callback body with:

```ts
const handler = withMcpAuth(auth, (req, session) => {
  const role = (session as { user?: { role?: string } } | null)?.user?.role;
  if(role !== 'admin' && role !== 'editor') {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { 'content-type': 'application/json' } });
  }
  return createMcpHandler(
    (server) => {
      registerReadTools(server);
      registerWriteTools(server);
    },
    {},
    { basePath: '/api/mcp/admin' },
  )(req);
});
```

- [ ] **Step 3: Verify tsc/lint/build**

Run: `pnpm tsc:ci && pnpm exec eslint "src/app/api/mcp/admin/[transport]/route.ts" && pnpm build`
Expected: no errors, build succeeds.

- [ ] **Step 4: Verify the OAuth flow end-to-end with a real client**

With the app deployed to a preview/prod URL (OAuth redirect needs a reachable origin; localhost works for Claude Code):
Run: `claude mcp add --transport http fdlm-admin https://<your-origin>/api/mcp/admin/mcp`
Then in a Claude Code session: it should prompt to authenticate (OAuth), open `/login`, and after login list the write tools. Call `list_editions` (read) and `create_events_batch` with a 2-event payload against a test edition.
Expected: events created; verify in `/admin/events`.
Also verify rejection: a `viewer`-role account must get `forbidden`.

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/mcp/admin"
git commit -m "Add OAuth-gated admin MCP endpoint with batch event creation"
```

---

## Phase 4 — Discoverability

### Task 9: Schema.org Event JSON-LD on the public edition page

**Files:**
- Modify: `src/app/(public)/[year]/page.tsx`

- [ ] **Step 1: Inject a JSON-LD script**

The page already fetches the edition + events (mapped via `summaryToEvent`). Add a `<script type="application/ld+json">` emitting one `Event` node per event. Build the array from the already-fetched events; only include fields that exist. Place near the top of the rendered tree.

```tsx
{events.length > 0 && (
  <script
    type="application/ld+json"
    // eslint-disable-next-line react/no-danger
    dangerouslySetInnerHTML={{
      __html: JSON.stringify(
        events.map((e) => ({
          '@context': 'https://schema.org',
          '@type': 'Event',
          name: e.title,
          startDate: e.startTime,
          ...(e.endTime !== undefined && e.endTime !== null ? { endDate: e.endTime } : {}),
          eventStatus: 'https://schema.org/EventScheduled',
          location: {
            '@type': 'Place',
            name: e.locationName,
            ...(e.locationAddress !== undefined && e.locationAddress !== null && e.locationAddress.length > 0
              ? { address: e.locationAddress }
              : {}),
          },
        })),
      ),
    }}
  />
)}
```

> Adapt the property names (`e.title`, `e.startTime`, `e.locationName`, …) to the actual `Event` render-type fields in `src/types/Event.ts` and the mapped shape used in this page. Read the file first and map 1:1.

- [ ] **Step 2: Verify it renders**

Run: `pnpm tsc:ci`
With `pnpm dev`: `curl -s localhost:3000/2024 | grep -o 'application/ld+json'`
Expected: matches. Optionally paste the JSON into Google's Rich Results Test.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(public)/[year]/page.tsx"
git commit -m "Add Schema.org Event JSON-LD to public edition page"
```

### Task 10: llms.txt, robots.txt, sitemap

**Files:**
- Create: `src/app/llms.txt/route.ts`
- Modify: `src/app/robots.txt`
- Create: `src/app/sitemap.ts`

- [ ] **Step 1: Add `llms.txt`**

`src/app/llms.txt/route.ts` (served at `/llms.txt`):

```ts
/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';

/* Module imports (project) ---------------------------- */
import { listEditions } from 'db/queries/listEditions';

export const GET = async (): Promise<NextResponse> => {
  const editions = await listEditions();
  const years = editions.map((e) => `- /${e.year} : programme de l'édition ${e.year}`).join('\n');
  const body = `# Fête de la Musique — Bordeaux

Agenda des concerts et évènements de la Fête de la Musique à Bordeaux.

## Données pour agents IA
- Interface MCP publique (lecture, sans authentification) : /api/mcp/mcp
- Interface MCP admin (écriture, OAuth) : /api/mcp/admin/mcp
- Schéma OpenAPI : /api/openapi.json

## Éditions publiées
${years}
`;
  return new NextResponse(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
```

- [ ] **Step 2: Update `robots.txt`**

Read the current `src/app/robots.txt` first. Replace its contents with:

```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/admin

Sitemap: /sitemap.xml
```

- [ ] **Step 3: Add the sitemap**

`src/app/sitemap.ts`:

```ts
/* Framework imports ----------------------------------- */
import type { MetadataRoute } from 'next';

/* Module imports (project) ---------------------------- */
import { listEditions } from 'db/queries/listEditions';

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const editions = await listEditions();
  const base = process.env.BETTER_AUTH_URL ?? 'https://prog-fdlm.vercel.app';
  return editions.map((e) => ({
    url: `${base}/${e.year}`,
    changeFrequency: 'daily',
    priority: 0.8,
  }));
};

export default sitemap;
```

- [ ] **Step 4: Verify**

Run: `pnpm tsc:ci`
With `pnpm dev`:
`curl -s localhost:3000/llms.txt | head -5` → expect the markdown header.
`curl -s localhost:3000/robots.txt` → expect the Disallow lines.
`curl -s localhost:3000/sitemap.xml | head -c 120` → expect `<?xml ...><urlset`.

- [ ] **Step 5: Commit**

```bash
git add src/app/llms.txt src/app/robots.txt src/app/sitemap.ts
git commit -m "Add llms.txt, robots disallow for admin, and sitemap"
```

---

## Phase 5 — Docs

### Task 11: Connect-a-client usage docs

**Files:**
- Create: `docs/agent-access.md`

- [ ] **Step 1: Write the docs**

```markdown
# Connecting AI agents to prog-fdlm

This app exposes two Model Context Protocol (MCP) endpoints plus machine-readable metadata.

## Endpoints
- **Public read (no auth):** `https://<origin>/api/mcp/mcp`
  Tools: `list_editions`, `get_edition`, `list_events`, `get_event`. Published content only.
- **Admin write (OAuth):** `https://<origin>/api/mcp/admin/mcp`
  Adds `create_event`, `create_events_batch`, `update_event`, `delete_event`. Requires an `admin`/`editor` login.
- **OpenAPI:** `https://<origin>/api/openapi.json`
- **llms.txt:** `https://<origin>/llms.txt`

## Claude Code
- Read: `claude mcp add --transport http fdlm https://<origin>/api/mcp/mcp`
- Write: `claude mcp add --transport http fdlm-admin https://<origin>/api/mcp/admin/mcp` (prompts OAuth login)

## ChatGPT / Claude.ai custom connector
Add a custom connector with the admin URL; complete the OAuth login when prompted.

## Batch-creating events
Ask the agent to call `create_events_batch` with `{ editionId, events: [...] }`. The whole batch is validated first; if any event is invalid, nothing is written and the validation issues are returned.
```

- [ ] **Step 2: Commit**

```bash
git add docs/agent-access.md
git commit -m "Document AI-agent (MCP) access"
```

---

## Self-review notes (addressed)

- **Spec coverage:** L1 batch → Tasks 1–2; OpenAPI → Task 3; mcp-handler infra → Task 4; read tools → Tasks 5–6; OAuth provider → Task 7; admin write MCP → Task 8; JSON-LD → Task 9; llms.txt/robots/sitemap → Task 10; docs → Task 11. CLI is explicitly out of scope (spec L5/§8).
- **Known verification-time confirmations** (flagged inline, not placeholders): exact `mcp-handler` export name (Task 4 Step 2), `z.toJSONSchema` availability (Task 3), the `withMcpAuth` callback `session` shape (Task 8 Step 1–2), and the `Event` render-type field names (Task 9 Step 1). Each has a concrete fallback.
- **Type consistency:** `registerReadTools`/`registerWriteTools` defined in Task 5 are the exact symbols imported in Tasks 6 and 8. `createEventsBatch(editionId, items)` defined in Task 2 matches its call in Task 5.
```
