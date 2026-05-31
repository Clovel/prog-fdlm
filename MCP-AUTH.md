# Authenticated MCP usage & OAuth flow

How the **admin write MCP** (`/api/mcp/admin/mcp`) authenticates agents, and how to use it. For the overview and read tools, see [MCP.md](MCP.md).

- **Reads** (`/api/mcp/mcp`) are public — no auth, skip this doc.
- **Writes** (`/api/mcp/admin/mcp`) require an OAuth 2.1 access token belonging to a user with role `admin` or `editor`.

There are **no API keys or personal access tokens** — agents authenticate via OAuth; the web UI uses its session cookie.

---

## What the agent does (you usually don't see this)

The app **is** the OAuth 2.1 authorization server — BetterAuth's `mcp()` plugin provides it. A compliant MCP client (Claude Code, ChatGPT, Claude.ai, Cursor, Cowork) runs the whole flow for you after you add the admin URL; you just log in once in a browser window.

```
Agent (MCP client)                      App (BetterAuth OAuth server)
      │                                              │
      │ 1. POST tools/call (no token)                │
      │ ───────────────────────────────────────────▶│
      │ 2. 401 + WWW-Authenticate: Bearer            │
      │    resource_metadata="…/oauth-protected-…"   │
      │ ◀───────────────────────────────────────────│
      │                                              │
      │ 3. GET /.well-known/oauth-protected-resource │
      │    GET /.well-known/oauth-authorization-server
      │ ───────────────────────────────────────────▶│  (discovers endpoints below)
      │                                              │
      │ 4. POST /api/auth/mcp/register  (DCR)        │  ← client registers itself
      │ ───────────────────────────────────────────▶│
      │                                              │
      │ 5. open /api/auth/mcp/authorize?…PKCE…       │  ← browser: you log in at /login
      │      → login at /login → consent             │     and approve
      │      → redirect back with ?code=…            │
      │                                              │
      │ 6. POST /api/auth/mcp/token  (code+verifier) │  ← exchanges code for token
      │ ◀────────────────── access_token ───────────│
      │                                              │
      │ 7. POST tools/call                           │
      │    Authorization: Bearer <access_token>      │
      │ ───────────────────────────────────────────▶│  → role checked → tool runs
```

### The endpoints (from discovery)

| Role | URL |
|---|---|
| Authorization-server metadata | `/.well-known/oauth-authorization-server` |
| Protected-resource metadata (RFC 9728) | `/.well-known/oauth-protected-resource` |
| Dynamic client registration | `/api/auth/mcp/register` |
| Authorize (PKCE) | `/api/auth/mcp/authorize` |
| Token | `/api/auth/mcp/token` |
| JWKS | `/api/auth/mcp/jwks` |
| Userinfo | `/api/auth/mcp/userinfo` |

Grant: **authorization code + PKCE**. Scopes advertised: `openid profile email offline_access`. Client registration is **dynamic** (CIMD/DCR), which is what lets ChatGPT and Claude.ai register without any manual client-id setup.

---

## Authorization model

Authorization is enforced **server-side, in the admin MCP route** — never client-trusted:

1. `withMcpAuth` rejects a missing/invalid bearer token → `401`.
2. The route then loads the token's user and checks **role ∈ {`admin`, `editor`}** → otherwise `403 forbidden`.
3. It also re-checks the token's **expiry** (`getMcpSession` resolves tokens by value and does not enforce expiry on its own), rejecting stale tokens.

Only after all three pass do the write tools run. A `viewer` account can complete the OAuth login but every write call returns `forbidden`.

| Role | Read tools | Write tools |
|---|---|---|
| `admin` | ✅ | ✅ |
| `editor` | ✅ | ✅ |
| `viewer` | ✅ (or just use the public endpoint) | ❌ `forbidden` |

Token lifetimes follow the BetterAuth OIDC defaults (access token short-lived; refresh via `offline_access`). The client refreshes automatically; you only re-authenticate if you revoke access or sign out everywhere.

---

## Connecting (admin)

**Claude Code**

```bash
claude mcp add --transport http fdlm-admin https://<origin>/api/mcp/admin/mcp
```

The first call opens a browser to `/login`. Sign in with an `admin`/`editor` account; the token is stored by the client and reused.

**ChatGPT / Claude.ai / Cowork** — add a custom connector with the admin URL; approve the OAuth prompt. **Cursor** — add a Streamable-HTTP MCP server with the admin URL.

> The agent host needs network access to your origin's `/login` and OAuth endpoints. For hosted agents (ChatGPT/Claude.ai), that means a **deployed** origin — localhost won't work for them. Claude Code can use localhost.

---

## Using the write tools

Once authenticated you get, in addition to the read tools: `create_event`, `create_events_batch`, `update_event`, `delete_event`. The headline workflow:

1. `list_editions` → copy the target `editionId`.
2. `create_events_batch` with `{ editionId, events: [ … up to 100 … ] }`.

The batch is **validated in full before any write**; if any event is invalid, nothing is written and the per-index issues come back. Exact field rules: `/api/docs` (generated from the validators).

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Client never prompts to log in | It hit the public URL. Use the **admin** URL (`/api/mcp/admin/mcp`). |
| `401` on every admin call | No/expired token, or the client didn't complete the OAuth flow. Re-add the server; ensure the browser login succeeded. |
| `403 forbidden` after login | The account's role is `viewer`. Promote it to `editor`/`admin` in `/admin/users`. |
| OAuth fails with `INVALID_REDIRECT_URL` / issuer mismatch | `BETTER_AUTH_URL` must equal the origin the agent is hitting (the dev port locally, the deployed origin in prod). |
| Token endpoints `500` | The OAuth tables aren't there — run `pnpm db:migrate` (migration `0007`). See below. |
| Hosted agent (ChatGPT) can't reach login | Localhost isn't reachable from a hosted client — use a deployed origin. |

---

## Prerequisites

The OAuth server needs three tables (`oauth_application`, `oauth_access_token`, `oauth_consent`):

```bash
pnpm db:migrate          # apply migration 0007 (additive) — required before deploying
```

`BETTER_AUTH_URL` must be the deployed origin in production. See [MCP.md → Deployment requirements](MCP.md#deployment-requirements).

---

## Security notes

- Authorization is enforced in the route transaction, not the client — a forged/edited tool list cannot bypass the role check.
- The public endpoint registers **only** read tools; write tools are never exposed unauthenticated.
- Tool handlers wrap execution so raw database errors are logged server-side and never returned to the client.
- The admin MCP surface should be excluded from crawlers — see `robots.txt` (it disallows `/admin`, `/api/admin`, and `/api/mcp/admin`).
