# Eager event descriptions / public read-path revamp — design

**Date:** 2026-05-31
**Branch context:** built on the current DB/auth/admin/editions architecture (post edition-embeds + MCP line).

## Goal

Eliminate the **"Chargement des détails…"** flash that appears every time a visitor expands an event on the public `/[year]` page. Today the description (and links/embeds/alerts) is fetched **per-event, on expand**, via a second network round-trip — so the primary content of every event is gated behind a spinner.

Secondary goal stated by the maintainer: **adopt TanStack Query (`useQuery`) on the public read path.** TanStack Query is already a dependency but is currently wired only into the admin layout; the public page hand-rolls `useEffect` + `fetch` + `useState`.

## Current mechanism (what we're replacing)

Two-tier, lazy-by-design fetch:

1. **Tier 1 — summaries.** `/[year]/page.tsx` (`'use client'`) fetches `/api/editions/[year]/events?limit=200` → `listEditionEvents()`. The summary returns everything *except* the description text: it ships a `hasDescription: boolean` plus `linkCount`/`embedCount`/`alertCount` (correlated `$count` subqueries). Mapped via `summaryToEvent` into the render `Event` type.
2. **Tier 2 — detail, on expand.** `EventListItem` holds `detailLoaded`/`detailLoading`/`detailError`/`enrichedEvent` state. On first expand it `fetch`es `/api/events/[eventId]` → `getEventDetail()`, which returns `description` + `links` + `embedLinks` + `alerts`. `<EventRender>` is gated on `detailLoaded`, so the user sees the loading line first.

Consequence: every expand costs a round-trip, even for an event whose only content is a description. There is no client cache/dedup (plain `fetch`, no QueryProvider in the public tree).

Other event-data fetchers (out of scope, must stay working): `FavoritesProvider` (`/api/favorites`, IDs only); MCP `list_events` → `listEditionEvents` (the summary query, called **directly**, not via HTTP); MCP `get_event` → `getEventDetail`; the admin stack (`/api/admin/*` via `src/hooks/admin/*`).

## Approach decision

**Approach A — one consolidated, React-Query'd list request.** Make `/api/editions/[year]/events` return the **full** detail for every event (description + links + embeds + alerts) in a single response, and drop the per-event public fetch entirely. Expanding a row reveals already-present data → no flash, by construction (no prefetch race to lose).

### Data-size validation (why A is safe at this scale)

Measured against the live DB (`SUM(length(...))` per edition):

| Edition | Events | Descriptions | + Links | + Embeds | + Alerts | Added text |
|---|---|---|---|---|---|---|
| 2023 | 40 | 23.5 KB | 3.6 KB (47 rows) | 0.4 KB (10) | 0.4 KB (5) | **~28 KB** |
| 2024 | 44 | 23.2 KB | 5.8 KB (76 rows) | 1.5 KB (34) | 0.02 KB (1) | **~30 KB** |
| 2026 | 16 | 2.4 KB | 1.5 KB | 0 | 1.0 KB | ~5 KB |

Largest historical edition (2024) adds ~30 KB of text (+ JSON structure → ~40 KB raw → **~12–15 KB gzipped over the wire**). Largest single description: 3.3 KB. All editions are far below the 200-event cap (max 44). On a **mobile-first** app, trading ~44 round-trips for one slightly-larger, edge-cached payload is an unambiguous win.

### Rejected alternatives

- **B — viewport-triggered detail prefetch.** Keep two tiers, React-Query the detail, and prefetch each row's detail when it scrolls into view (`useInViewport`). Keeps the payload lean but costs N requests (worse on flaky mobile), can still flash on a fast scroll-then-tap, and adds per-row observer machinery. Worth revisiting **only** if an edition ever grows large enough that the consolidated payload becomes a real cost.
- **C — inline description only, prefetch the rest (hybrid).** Description ships in the list; links/embeds/alerts viewport-prefetched. Most moving parts (a payload change *and* prefetch infra, two code paths for "where detail comes from") for little gain over A at this scale.

## 1. Server — new consolidated query + route response

**New query** `src/db/queries/listEditionEventsWithDetail.ts` → `listEditionEventsWithDetail(year): Promise<EventWithDetailDto[] | null>`:

- Publish-gate the edition (same as `listEditionEvents`; `null` when missing/unpublished).
- Query the edition's events selecting the existing summary columns **plus `description`** (drop the 3 `$count` subqueries).
- Then **3 bulk queries** — `eventLinks`, `eventEmbedLinks`, `eventAlerts` — each `WHERE event_id IN (<event ids>)`, ordered by their existing `position`, grouped into the right event in JS. ~4 queries total per edition load (cheaper than today's 1 list + N detail calls).
- Order events by `startTime, id` (matches the page's expectation). Internal safety cap (e.g. `LIMIT 300`) with a code comment noting current max is 44 and to revisit / paginate beyond the cap.

**New DTO** `EventWithDetailDto` in `src/db/queries/types.ts` = the summary fields (minus the counts/`hasDescription`) **plus**:
```
description: string | null
links: Array<{ url: string; label: string }>
embedLinks: Array<{ platform: 'instagram' | 'facebook'; url: string }>
alerts: Array<{ variant: AlertVariant; title: string | null; content: string }>
```

**Route (DEVIATION from initial design — see note).** A **new, dedicated** route `GET /api/editions/[year]/events/full` (`src/app/api/editions/[year]/events/full/route.ts`):
- Validates `year`, calls `listEditionEventsWithDetail(year)`, returns `{ events: EventWithDetailDto[] }`.
- `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`.

> **Why a new route instead of changing `/events`:** the existing `GET /api/editions/[year]/events` response shape is a **documented OpenAPI contract** (`eventListDto = { events: EventSummary[], nextCursor }`, advertised as "cursor paginated" and reachable by external agents via MCP-over-HTTP). Repurposing it would break that contract and drop the documented pagination. A dedicated `/full` route keeps the summary route (and its OpenAPI contract) untouched and gives the SPA its own single-responsibility resource. The summary route, `listEditionEvents`, `getEventDetail`, and `/api/events/[eventId]` are all left unchanged.

**Untouched (important):**
- `listEditionEvents` (summary query) — still used by MCP `list_events`. **No change.**
- `getEventDetail` + `/api/events/[eventId]` — still used by MCP `get_event`. **No change.** (The public client simply stops calling the route.)

## 2. Client — TanStack Query on the public path

- **Promote `QueryProvider`.** Move `src/app/admin/QueryProvider.tsx` → a shared module `src/components/QueryProvider/QueryProvider.tsx`; update the admin layout import; mount it in `src/app/(public)/layout.tsx`. Set a `staleTime` (~60s) aligned with the edge cache.
- **New public hooks** under `src/hooks/public/`:
  - `useEdition(year)` → `GET /api/editions/[year]`, key `['public','edition',year]`.
  - `useEditionEvents(year)` → the consolidated endpoint, key `['public','edition-events',year]`.
  - Both `useQuery`; the fetchers reuse the existing `EditionNotFoundError` mapping (404/400 → not-found).
- **`(public)/[year]/page.tsx`:** replace the `useEffect` + `Promise.all` + the six `useState`s with the two hooks. Derive `loading`/`error` from query state. Preserve the 404 → render-flag → `notFound()` pattern (calling `notFound()` from an async callback never reaches Next's boundary — see the project's known gotcha). `summaryToEvent` → `dtoToEvent`, now also mapping `description`/`links`/`embedLinks`/`alerts` The DTO→render-type field renames currently in `EventListItem`'s fetch handler (embed `platform` → `type`, alert `variant` → `type`, `null` → `undefined`) move into `dtoToEvent`.
- The `setHeaderState({ year, eventsCount })` side-effect moves into an effect keyed on the query result.

## 3. Client — EventListItem simplification

`src/components/EventList/EventListItem.tsx`:
- Remove `detailLoaded`/`detailLoading`/`detailError`/`enrichedEvent` state, the `fetch('/api/events/...')` call, the fetch branch of `handleOpenChange`, and the `DetailPayload` type.
- `event` (from the consolidated list) already carries `description`/`links`/`embedLinks`/`alerts`; `<EventRender event={event} />` renders immediately on expand — **no flash, no "Chargement des détails…"**.
- `handleOpenChange` collapses to `setOpen(next)`.
- `collapsiblePresent` / `summaryHasContent` derive purely from the real arrays (`description`, `links`, `embedLinks`, `alerts`); the count-field fallbacks are removed.

## 4. Cleanup of the count fields

`linkCount`/`embedCount`/`alertCount`/`hasDescription` were proxies for "is there content to fetch". With the arrays present they're redundant on the public path and are confirmed unused by `EventsRecap`/`EventTitleBlock`.

- Stop populating them in the public DTO / view type / `Event` mapping.
- Leave the optional fields on the `Event` **type** (`src/types/Event.ts`) to avoid unrelated churn; just don't set them. (The render `Event` type already declares `description`/`links`/`embedLinks`/`alerts` as optional.)

## 5. Error handling & edge cases

- **Missing / unpublished edition:** query returns `null` → route 404 → `EditionNotFoundError` → render-time `notFound()` (unchanged behavior).
- **Empty edition:** `events: []` → existing `EmptyEditionView` path.
- **Favorites:** `FavoritesProvider` (IDs) and `FavoritesSection`/`EventsRecap`/`EventsMap` (props) untouched.
- **MCP:** `list_events` and `get_event` responses byte-for-byte unchanged (they bypass the HTTP route).
- **Payload growth:** internal cap + comment; if an edition approaches it, revisit (pagination, or fall back to Approach B's prefetch).

## 6. Verification

No test framework in the repo. Verify via:
- `pnpm tsc:ci`, `pnpm lint` (`pnpm lint-fix` to match style), `pnpm build`.
- `curl` the events endpoint against a running dev server: confirm the response includes `description`/`links`/`embedLinks`/`alerts`, and measure the real gzipped size (`curl --compressed -s … | wc -c` vs raw).
- Visual: expand several rows (one description-only, one with embeds/links/alerts) → content appears instantly, no loading line. Verify category grouping, Favoris section, recap, and map still render.
- Confirm MCP `list_events` output is unchanged (e.g. via the admin-MCP smoke script / `mcp__fdlm__list_events`).

## File summary

**New:**
- `src/db/queries/listEditionEventsWithDetail.ts`
- `src/app/api/editions/[year]/events/full/route.ts` (consolidated endpoint)
- `src/hooks/public/editionNotFound.ts`, `src/hooks/public/useEdition.ts`, `src/hooks/public/useEditionEvents.ts`
- `src/components/QueryProvider/QueryProvider.tsx` (moved from `app/admin/`)

**Modified:**
- `src/db/queries/types.ts` (add `EventWithDetailDto`)
- `src/db/queries/index.ts` (export the new query)
- `src/app/(public)/layout.tsx` (mount `QueryProvider`)
- `src/app/(public)/[year]/page.tsx` (React-Query hooks; `dtoToEvent`)
- `src/app/(public)/[year]/types.ts` (add `EventWithDetailView`; `EventSummaryView` kept for the summary route)
- `src/app/admin/layout.tsx` (update `QueryProvider` import path)
- `src/components/EventList/EventListItem.tsx` (delete detail-fetch machinery)

**Untouched (verified):** `listEditionEvents`, the summary `/api/editions/[year]/events` route (+ its OpenAPI contract), `getEventDetail`, `/api/events/[eventId]`, `src/mcp/tools.ts`, `EventsRecap`, `EventTitleBlock`, favorites.
