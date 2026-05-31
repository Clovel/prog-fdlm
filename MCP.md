# AI-agent access (MCP, OpenAPI, discoverability)

This app exposes its festival data to AI agents — **Claude Code, Cursor, ChatGPT, Claude.ai, Claude Cowork** — through the [Model Context Protocol (MCP)](https://modelcontextprotocol.io), plus machine-readable metadata for non-MCP scrapers.

- **Reads are public** (no auth) and return **published content only**.
- **Writes require an `admin`/`editor` login** over OAuth 2.1.

> **Why MCP** (and not a CLI or SDK): MCP is the only interface every target client speaks. A CLI only works for shell-capable agents (Claude Code, Cursor) and can't serve ChatGPT / Claude.ai / Cowork; an SDK isn't an agent interface at all. So MCP is the primary layer, with a documented REST API + OpenAPI underneath it. Full rationale: [`docs/superpowers/specs/2026-05-31-ai-agent-access-mcp-design.md`](docs/superpowers/specs/2026-05-31-ai-agent-access-mcp-design.md).

---

## Endpoints

`<origin>` = `http://localhost:3000` in dev, or the deployed origin (e.g. `https://prog-fdlm.vercel.app`).

| Purpose | URL | Auth |
|---|---|---|
| **Public read MCP** | `<origin>/api/mcp/mcp` | none |
| **Admin write MCP** | `<origin>/api/mcp/admin/mcp` | OAuth 2.1 (`admin`/`editor`) |
| OpenAPI 3.1 (generated from Zod) | `<origin>/api/openapi.json` | none |
| Interactive API docs (Scalar / Swagger) | `<origin>/api/docs` | none |
| OAuth authorization-server metadata | `<origin>/.well-known/oauth-authorization-server` | none |
| OAuth protected-resource metadata | `<origin>/.well-known/oauth-protected-resource` | none |
| Agent guide | `<origin>/llms.txt` | none |

Transport is **Streamable HTTP** (the current MCP default). The servers are stateless — no Redis required.

---

## Tools

### Public read MCP — `/api/mcp/mcp`

Published content only.

| Tool | Arguments | Returns |
|---|---|---|
| `list_editions` | — | All published editions (id, year, description) |
| `get_edition` | `year` | One edition + its published general alerts |
| `list_events` | `year`, optional `category` / `q` / `genre` / `status` / `cursor` / `limit` | `{ events, nextCursor }` — cursor-paginated summaries |
| `get_event` | `eventId` | Full detail: description, links, embeds, alerts |

### Admin write MCP — `/api/mcp/admin/mcp`

All read tools above **plus** (requires an `admin`/`editor` login):

| Tool | Arguments | Notes |
|---|---|---|
| `create_event` | `editionId` + event fields | Returns the new event id |
| `create_events_batch` | `{ editionId, events: [...] }` | **Atomic** — validates every event first; if any is invalid, **nothing is written** and the per-field issues are returned. Max 100 per call. |
| `update_event` | `{ id, ...fields }` | Replaces all fields of the event |
| `delete_event` | `{ id }` | — |

The event field set (names, types, what's required) is documented authoritatively in the OpenAPI doc — see **`/api/docs`**. It is generated from the same Zod validators the API uses, so it always matches what the tools accept.

---

## Connecting a client

### Claude Code

```bash
# Read-only (no auth)
claude mcp add --transport http fdlm https://<origin>/api/mcp/mcp

# Admin (opens an OAuth login in your browser)
claude mcp add --transport http fdlm-admin https://<origin>/api/mcp/admin/mcp
```

### ChatGPT / Claude.ai / Claude Cowork (custom connector)

Add a **custom connector** pointing at:
- the **public** URL for read-only access (no login), or
- the **admin** URL to also get write tools — the client runs the OAuth 2.1 flow automatically (dynamic client registration → login on `/login` → consent).

### Cursor

Add an MCP server (Streamable HTTP) with the public or admin URL; the admin URL triggers the OAuth login.

---

## The batch workflow (main admin use case)

1. Connect the **admin** MCP and complete the OAuth login.
2. Get the target edition's id from `list_editions` (a public read tool).
3. Ask your agent to call `create_events_batch` with that `editionId` and an array of events. Example intent:

   > "Add these 30 concerts to edition `<uuid>`: …"

The whole batch is validated up-front. On any invalid event the call returns the per-index validation issues and **writes nothing**, so you can fix and retry safely. On success it returns `{ count, ids }`.

---

## How authentication works

BetterAuth itself is the **OAuth 2.1 authorization server** (via its `mcp()` plugin):

- Discovery: `/.well-known/oauth-authorization-server` (+ `/.well-known/oauth-protected-resource`, RFC 9728).
- Flow: Authorization Code + PKCE, with **dynamic client registration** — so ChatGPT and Claude.ai can register themselves.
- The login/consent screen is the existing `/login` page; tokens map back to the existing `user` table and `role`.
- The admin MCP route validates the bearer token **and** enforces role (`admin`/`editor`) and token expiry before any tool runs. A `viewer` token is rejected with `forbidden`. Unauthenticated calls get `401` with a `WWW-Authenticate: Bearer resource_metadata=…` header that kicks off the OAuth flow.

No API keys / personal access tokens exist — auth is OAuth (for agents) or the session cookie (for the web UI).

---

## For non-MCP scrapers

- **`/llms.txt`** summarises the site and links the MCP endpoints, the OpenAPI spec, and the Swagger UI.
- **`/api/openapi.json`** documents the REST API the MCP tools wrap — generated at runtime from the Zod validators (so request schemas can't drift), rendered interactively at **`/api/docs`**.
- Public edition pages embed **Schema.org `Event` JSON-LD** (rendered client-side; JS-executing crawlers such as Googlebot pick it up). `robots.txt` allows the public site, disallows `/admin` and `/api/admin`, and links `/sitemap.xml`.

---

## Deployment requirements

The OAuth provider needs three tables (`oauth_application`, `oauth_access_token`, `oauth_consent`), created by migration `src/db/migrations/0007_fresh_power_man.sql`:

```bash
pnpm db:migrate     # apply the OAuth tables (additive)
```

> **Apply the migration before deploying.** Until the tables exist, the admin OAuth token endpoints return 500. The public read MCP, OpenAPI, Swagger UI, and the public site all work without them.

In production, `BETTER_AUTH_URL` must be the deployed origin (it anchors the OAuth issuer and redirect URLs).

---

## Local testing

With `pnpm dev` running and `DATABASE_URL` set:

```bash
# Headless end-to-end check of the public read MCP (lists tools, calls list_editions)
node scripts/verify-mcp.mjs http://localhost:3000/api/mcp/mcp

# Or the official interactive inspector (point it at either endpoint)
npx @modelcontextprotocol/inspector
#   transport: Streamable HTTP
#   public URL: http://localhost:3000/api/mcp/mcp
#   admin URL:  http://localhost:3000/api/mcp/admin/mcp   (will require the OAuth login)
```

Quick curl checks:

```bash
curl -s localhost:3000/api/openapi.json | head -c 120          # OpenAPI 3.1
curl -s localhost:3000/.well-known/oauth-authorization-server  # OAuth discovery
curl -s -o /dev/null -w '%{http_code}\n' -X POST \
  localhost:3000/api/mcp/admin/mcp -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'          # → 401 (auth required)
```

---

## Implementation map

| Concern | File(s) |
|---|---|
| Read/write tool registrations | `src/mcp/tools.ts` |
| Public read MCP route | `src/app/api/mcp/[transport]/route.ts` |
| Admin (OAuth-gated) MCP route | `src/app/api/mcp/admin/[transport]/route.ts` |
| OAuth provider config | `src/auth/config.ts` (`mcp()` plugin) |
| OAuth discovery routes | `src/app/.well-known/oauth-*/route.ts` |
| OAuth tables | `src/db/schema/oauthProvider.ts` |
| Batch mutation | `src/db/mutations/events.ts` (`createEventsBatch`) |
| OpenAPI document | `src/app/api/openapi.json/route.ts` |
| Swagger UI (Scalar) | `src/app/api/docs/route.ts` |
| Discoverability | `src/app/llms.txt/route.ts`, `src/app/robots.ts`, `src/app/sitemap.ts`, `src/app/(public)/[year]/page.tsx` (JSON-LD) |
