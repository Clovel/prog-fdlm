# AI-agent access layer (MCP + OAuth + discoverability) — design

**Date:** 2026-05-31
**Status:** Approved (architecture). Ready for implementation plan.

## 1. Goal

Give AI agents — Claude Code, Claude Cowork, ChatGPT, Cursor, Claude.ai — a first-class way to **read** the festival data (any agent, no setup) and **write** it (only when authenticated as `admin`/`editor`). The driving use cases:

1. **Admin batch-creates events** through an AI agent (the headline feature).
2. **A visitor asks an agent what's programmed** for an edition.
3. **Agents scrape the public site** for the agenda.

This document researches the MCP-vs-CLI-vs-SDK question, compares each to the app as it stands today, and fixes the course of action.

## 2. Research: MCP vs CLI vs SDK for agent access

The three are commonly framed as competing choices. They are not — they are **layers over one core** (the HTTP API / domain functions). What differs is *which agents each reaches* and *how much setup each needs*.

| Mechanism | What it is | Reaches which clients | Verdict for this app |
|---|---|---|---|
| **HTTP API + OpenAPI** | The REST routes + a machine-readable schema | Everything, indirectly | **Foundation.** Already mostly built (public reads). Every other layer sits on it. |
| **SDK** | A typed client library wrapping the API | A *human* writing code; agents don't "use" SDKs natively | Optional sugar. Not an agent interface. |
| **CLI** | A command the agent runs via shell | Only **shell-capable** agents (Claude Code, Cursor). **Not** ChatGPT / Claude.ai web / Cowork (no shell) | Insufficient alone — fails two named clients. Optional extra. |
| **MCP** | Model Context Protocol — a tool/resource protocol every major agent speaks | **All** named clients: Claude Code, Cursor, ChatGPT, Claude.ai, Cowork | **Primary agent interface.** The only mechanism that reaches every target client. |

Key findings from current (2025–2026) practice:

- **Streamable HTTP** is the recommended MCP transport since the March 2025 spec revision (replacing SSE); stateless Streamable HTTP needs no Redis and suits Vercel Fluid Compute. `mcp-handler` (Vercel's adapter) hosts an MCP server as a single Next.js route exporting `GET`/`POST`/`DELETE`.
- **Remote, *authenticated* MCP requires OAuth 2.1** (Authorization Code + PKCE, often with Dynamic Client Registration / Client ID Metadata Documents). ChatGPT and Claude.ai custom connectors drive this flow themselves; a pasted static bearer token is **not** a reliable substitute for those two clients. Unauthenticated read-only tools need no auth.
- **BetterAuth can act as the OAuth 2.1 provider** itself. The installed `better-auth@1.6.12` ships an `mcp()` plugin plus `withMcpAuth`, `oAuthDiscoveryMetadata`, and `oAuthProtectedResourceMetadata` helpers, and Protected Resource Metadata (RFC 9728) at `/.well-known/oauth-protected-resource`. So we do **not** hand-roll an OAuth server — we reuse the existing user table and `role` field. (Note: the `mcp()` plugin is slated to be superseded by the `oauth-provider` plugin; we use `mcp()` now and treat migration as future work.)
- **Discoverability ≠ API.** For "agents scrape the site," the cheapest high-value move is **Schema.org `Event` JSON-LD** embedded in the public pages plus an **`llms.txt`** — these make the existing site machine-readable with zero API integration.

## 3. Current implementation — gap analysis

| Capability | Today | Needed |
|---|---|---|
| Public read API | ✅ `/api/editions`, `/api/editions/[year]/events` (cursor paging, filters, 60s cache), `/api/events/[eventId]` — published-only | Reuse as the MCP read tools' backing |
| Admin write API | ✅ single-record `POST /api/admin/events`, PATCH/DELETE; Zod-validated; role-gated | Reuse; add batch |
| Batch create | ❌ none | **`createEventsBatch` mutation** |
| Non-cookie auth | ❌ cookie-session only (BetterAuth `nextCookies`); no API keys/bearer/PAT | **OAuth 2.1 via BetterAuth `mcp()` plugin** |
| Machine-readable schema | ❌ no OpenAPI, no `llms.txt`, no JSON-LD; robots is bare allow-all | **OpenAPI 3.1, llms.txt, JSON-LD, sitemap, robots tuning** |
| Agent protocol | ❌ none | **Two MCP endpoints** |

The domain layer (`src/db/queries/*` DTOs, `src/db/mutations/*`) is clean and reusable. The MCP server runs *inside* the same Next app, so tools call these functions **directly** — no HTTP hop, no duplicated logic.

## 4. Chosen architecture — "Approach B": fully remote, OAuth-authenticated

A single Vercel deployment exposing **two MCP endpoints** plus a discoverability layer, all backed by the existing domain core.

```
AI agent (CC / Cursor / ChatGPT / Claude.ai / Cowork)
   │
   ├── read (no auth) ──────────────► /api/mcp           (public read MCP)
   │                                      │
   └── write (OAuth 2.1 login) ──────► /api/mcp/admin     (admin MCP, withMcpAuth)
                                          │
   discovery: /.well-known/oauth-authorization-server
              /.well-known/oauth-protected-resource
                                          │
                              ┌───────────┴───────────┐
                              ▼                        ▼
                   src/db/queries/* (DTOs)   src/db/mutations/* (+ batch)
                              │                        │
                              └──────────► PostgreSQL ◄┘

scrape/SEO layer: JSON-LD on /[year] · llms.txt · robots.txt · sitemap.xml · OpenAPI
```

### Why two MCP endpoints

MCP clients treat a server as **wholly protected or wholly public** (the protected-resource metadata gates the whole connection). Reads must be anonymous (use cases 2 & 3); writes must be authenticated. Splitting into a public read endpoint and an OAuth-gated admin endpoint cleanly matches that boundary and the existing role model. The admin endpoint re-exposes the read tools too, so an authenticated agent has full context.

### Components

**L0 — Domain core (exists, reused unchanged).** `src/db/queries/*`, `src/db/mutations/*`. Single source of truth.

**L1 — `createEventsBatch(editionId, events[])` mutation.** Reuses the single-create path and the `eventSchema` Zod validation. **Two-phase, atomic:** (1) validate every row with `eventSchema` first — if *any* row fails, return a `{ ok: false, issues: [{ index, error }] }` result and write nothing; (2) only if all rows pass, insert them in a single `db.transaction` (all-or-nothing). On success, return `{ ok: true, ids: [{ index, id }] }`. Atomicity keeps a half-applied batch from ever existing; the per-index `issues`/`ids` arrays let the agent map results back to the input it sent.

**L2 — BetterAuth as OAuth 2.1 provider.**
- Add `mcp({ loginPage: '/login' })` to `src/auth/config.ts` (the existing `/login` page becomes the consent screen).
- `src/app/.well-known/oauth-authorization-server/route.ts` → `oAuthDiscoveryMetadata(auth)`.
- `src/app/.well-known/oauth-protected-resource/route.ts` → `oAuthProtectedResourceMetadata(auth)`.
- Reuses the existing `user` table + `role`. No new user model.

**L3 — Two MCP endpoints** (`mcp-handler` `createMcpHandler`, Streamable HTTP, stateless):
- **`/api/mcp/[transport]` — public, unauthenticated, read-only.**
  - `list_editions` → `listEditions` (published only)
  - `get_edition(year)` → `getEdition` (+ published general alerts)
  - `list_events(year, { category?, q?, genre?, status?, ids?, cursor? })` → `listEditionEvents`
  - `get_event(eventId)` → `getEventDetail`
- **`/api/mcp/admin/[transport]` — OAuth-gated** via `withMcpAuth(auth, …)`, role `admin`/`editor`.
  - All read tools above, **plus** `create_event`, `create_events_batch`, `update_event`, `delete_event`.
  - Edition/alert/user management stays in the web UI for v1 (YAGNI).

**L4 — Discoverability.**
- **JSON-LD `Schema.org/Event`** injected into `/[year]` (one `Event` node per event, with `name`, `startDate`, `endDate`, `location`, `offers`/free, `performer`). Highest bang-for-buck for "agents scrape."
- **`llms.txt`** (app route or `public/`) — site description, link to `/api/mcp`, OpenAPI, key URLs.
- **`robots.txt`** — keep public allow-all; explicitly `Disallow: /admin` and `/api/admin`; link the sitemap.
- **`sitemap.xml`** — published editions (per-event URLs optional).
- **OpenAPI 3.1** at `/api/openapi.json`, generated from the Zod schemas (zod v4 `z.toJSONSchema`). Source of truth for any future SDK/CLI and for human docs.

**L5 — Optional CLI (deferred).** A thin Node wrapper over the API for local shell agents. Not required — MCP already reaches every named client. Documented as future work.

### Data flow
- **Write:** Agent → OAuth login (BetterAuth) → access token → `/api/mcp/admin` → `withMcpAuth` validates token + role → tool → `createEventsBatch` → DB transaction → per-row results.
- **Read:** Agent/visitor → `/api/mcp` (no auth) → query function → DTOs.

### Error handling
MCP tools return structured `content` with `isError: true` on failure. The batch tool rejects atomically when any row is invalid, returning per-index validation issues (nothing is written). Mutation discriminated-results (not-found, last-admin protection, etc.) map to tool errors with machine-readable (English, non-UI) messages. Role failure → `withMcpAuth` rejects the call.

## 5. Verification (no test framework)

- `pnpm tsc:ci`, `pnpm lint`, `pnpm build` — gates.
- **MCP Inspector** (`npx @modelcontextprotocol/inspector`) against `pnpm dev` for both endpoints: list tools, call each read tool, call `create_events_batch` with a mixed valid/invalid batch.
- Connect a **real client** end-to-end: `claude mcp add` (public + admin), and a Claude.ai custom connector to confirm the OAuth flow; exercise read + batch-create.
- `curl` the two `.well-known` discovery documents and assert shape.
- Validate JSON-LD with Google Rich Results; lint the OpenAPI document.

## 6. Risks & gotchas

1. **kysely 0.28.17 pin** (CLAUDE.md, load-bearing) must keep working with the BetterAuth OAuth plugin — verify before building on it.
2. **OAuth across clients** — ChatGPT (CIMD) vs Claude (DCR) register clients differently; the BetterAuth discovery metadata must satisfy both. This is the main integration risk — test each client explicitly.
3. **`serverExternalPackages`** in `next.config` may need `mcp-handler` added alongside `better-auth`/`kysely`. Use **stateless** Streamable HTTP (no SSE) to avoid a Redis dependency on Vercel.
4. **pnpm 9 pin** (load-bearing) — adding `mcp-handler` must not perturb the lockfile `overrides`; install with the existing `--no-frozen-lockfile` path.
5. **Published-only invariant** — public MCP read tools must use the public queries (which gate on `isPublished`), never the admin queries.

## 7. Phased plan (each phase independently shippable & verifiable)

1. **Core** — `createEventsBatch` mutation + OpenAPI document.
2. **Public read MCP** — `/api/mcp`, four read tools. Simplest end-to-end win; verifiable with Inspector alone.
3. **OAuth provider + Admin write MCP** — `mcp()` plugin, `.well-known` routes, `/api/mcp/admin` with write tools. The heavy phase; verify each client.
4. **Discoverability** — JSON-LD on `/[year]`, `llms.txt`, `robots.txt`, `sitemap.xml`.
5. **Docs** — README/usage section (connect-a-client instructions) + optional CLI.

## 8. Out of scope (v1)

- Editions/alerts/users *write* tools (stay in the web UI).
- A published SDK package.
- The CLI (deferred to L5).
- Migration from the `mcp()` plugin to the `oauth-provider` plugin.
