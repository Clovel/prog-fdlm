# Connecting AI agents to prog-fdlm

This app exposes its festival data to AI agents (Claude Code, Cursor, ChatGPT, Claude.ai, Cowork) through the **Model Context Protocol (MCP)**, plus machine-readable metadata for scrapers.

## Endpoints

| Purpose | URL | Auth |
|---|---|---|
| **Public read MCP** | `https://<origin>/api/mcp/mcp` | none |
| **Admin write MCP** | `https://<origin>/api/mcp/admin/mcp` | OAuth 2.1 (admin/editor) |
| OAuth discovery | `https://<origin>/.well-known/oauth-authorization-server` | — |
| Protected-resource metadata | `https://<origin>/.well-known/oauth-protected-resource` | — |
| OpenAPI 3.1 (generated from Zod) | `https://<origin>/api/openapi.json` | none |
| Interactive API docs (Scalar) | `https://<origin>/api/docs` | none |
| Agent guide | `https://<origin>/llms.txt` | none |

`<origin>` is `http://localhost:3000` in dev or your deployed origin (e.g. `https://prog-fdlm.vercel.app`).

## Tools

**Public read MCP** (published content only):
- `list_editions` — all published editions (years)
- `get_edition(year)` — one edition + its published general alerts
- `list_events(year, { category?, q?, genre?, status?, cursor?, limit? })` — paginated events (returns `{ events, nextCursor }`)
- `get_event(eventId)` — full detail (description, links, embeds, alerts)

**Admin write MCP** (everything above, plus — requires an `admin`/`editor` login):
- `create_event(...)` — one event
- `create_events_batch({ editionId, events: [...] })` — many events, **atomic** (validates all first; if any is invalid, nothing is written)
- `update_event({ id, ... })`
- `delete_event({ id })`

## Connecting

### Claude Code

```bash
# Read-only (no auth)
claude mcp add --transport http fdlm https://<origin>/api/mcp/mcp

# Admin (prompts an OAuth login in the browser)
claude mcp add --transport http fdlm-admin https://<origin>/api/mcp/admin/mcp
```

### ChatGPT / Claude.ai / Cowork custom connector

Add a custom connector pointing at the admin URL. The client performs the OAuth 2.1
flow (dynamic client registration → login on `/login` → consent) automatically.
For read-only access, use the public URL — no login required.

## Batch-creating events (the main admin workflow)

Ask your agent to call `create_events_batch` with an `editionId` and an array of
events. Example intent: *"Add these 30 concerts to edition `<uuid>`."* The whole
batch is validated up-front; on any invalid event the call returns the per-index
validation issues and **writes nothing**, so you can fix and retry safely.

Get the `editionId` from `list_editions` (the public read tool).

## For non-MCP scrapers

- `llms.txt` summarises the site and points here.
- `/api/openapi.json` documents the REST API the MCP tools wrap. It is **generated at runtime from the Zod validators** (via `zod-openapi`), so request schemas always match what the API actually accepts.
- `/api/docs` renders that spec as an interactive Scalar (Swagger-style) reference.
- Public edition pages embed Schema.org `Event` JSON-LD (rendered client-side;
  JS-executing crawlers such as Googlebot pick it up).

## Notes

- Reads always return **published** editions/events only.
- Writes are gated server-side by BetterAuth role (`admin`/`editor`); a `viewer` token is rejected with `forbidden`.
- Transport is Streamable HTTP (the current MCP default). The endpoints are stateless (no Redis required).
