# Decouple base URL from `BETTER_AUTH_URL`

**Date:** 2026-06-10

## Problem

`BETTER_AUTH_URL` is overloaded. It is read directly in four places:

| File | Usage |
| --- | --- |
| `src/auth/config.ts` | BetterAuth uses it as `baseURL`, which seeds the default (single-origin) `trustedOrigins` allowlist. |
| `src/app/layout.tsx` | `metadataBase` for resolving relative Open Graph image URLs. |
| `src/app/sitemap.ts` | Absolute per-edition URLs. |
| `src/app/robots.ts` | Absolute `sitemap.xml` URL. |

Two consequences:

1. **Login breaks from any origin other than `BETTER_AUTH_URL`.** BetterAuth's CSRF
   origin check only trusts `baseURL`, so a request served from a custom domain,
   a Vercel preview URL, or `localhost` (when `BETTER_AUTH_URL` points at prod) is
   rejected.
2. **robots/sitemap/metadata emit the wrong host** whenever the app is served from
   a host other than `BETTER_AUTH_URL`.

## Goals

- Auth trusts a configurable list of origins, not just one.
- `robots.txt` / `sitemap.xml` are built from the **incoming request** host.
- Nothing outside auth reads `BETTER_AUTH_URL`.

Deploy target is Vercel, which exposes `VERCEL_PROJECT_PRODUCTION_URL`
automatically — used as the canonical fallback so no new manual env var is needed
for the site URL.

## Design

### 1. `src/lib/baseUrl.ts` (new)

- `getCanonicalBaseUrl(): string` — env-only, no `headers()`. Resolution order:
  `VERCEL_PROJECT_PRODUCTION_URL` (https-prefixed) → `https://prog-fdlm.vercel.app`.
  Safe in static contexts.
- `getRequestBaseUrl(): Promise<string>` — reads `headers()` (`x-forwarded-proto`,
  defaulting to `https`, + `host`) to build the URL from the actual request. Falls
  back to `getCanonicalBaseUrl()` when the `host` header is absent.

### 2. `robots.ts` + `sitemap.ts`

Replace the `BETTER_AUTH_URL` literal with `await getRequestBaseUrl()`. Both are
already dynamic (DB-backed via `listEditions`), so reading headers adds no
static-generation cost. A crawl at `https://custom-domain/robots.txt` now emits
`custom-domain` URLs.

### 3. `layout.tsx` `metadataBase`

Swap `BETTER_AUTH_URL` → `getCanonicalBaseUrl()`. Deliberately **not** per-request:
`metadataBase` lives in the root layout's metadata, and reading `headers()` there
would force every page to render dynamically, defeating static generation / ISR.
Canonical og:image and canonical URLs should point at the stable production domain
regardless of which host served the request, so the canonical value is correct here.

### 4. `src/auth/config.ts`

Add `trustedOrigins`, parsed from a new comma-separated `TRUSTED_ORIGINS` env var
(trimmed, empties dropped). BetterAuth already trusts its own `baseURL`; this adds
the extra origins (custom domain, previews, localhost). `BETTER_AUTH_URL` stays as
the canonical base for emailed password-reset links.

### 5. `.env.example`

Document `TRUSTED_ORIGINS` (comma-separated origins, e.g.
`http://localhost:3000,https://prog-fdlm.vercel.app`).

## Out of scope

- Per-request `metadataBase` (intentional — see §3).
- Auto-trusting `*.vercel.app` previews via a function (explicit allowlist chosen).
