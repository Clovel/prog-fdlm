# Event favorite-count KPI — design

**Date:** 2026-05-31
**Status:** approved (brainstorm), pending implementation plan
**Builds on:** `2026-05-31-favorites-design.md` (the existing localStorage + DB favorites), `2026-05-31-ai-agent-access-mcp-design.md` (MCP read/write tools).

## Goal

Expose **how many times each event has been favorited** as a KPI that reflects **real public engagement**, surfaced on the public event card, in the admin events table, on the admin dashboard, and to AI agents via MCP + a public REST endpoint.

## Problem statement

Favorites today are two-tier:

- **Anonymous visitors** (the general public — the site has no public signup) store favorites only in their browser's `localStorage` (`fdlm:favorites:<editionId>`). These **never reach the server**.
- **Authenticated users** (the handful of admins/editors/viewers) also get a row in the `favorite` table, reconciled on login.

A `COUNT(*)` on `favorite` today therefore counts only maintainers — a near-useless number for a public festival site. To make the KPI meaningful we must **capture anonymous favorites server-side**, deduplicated per device, without introducing accounts.

## Chosen approach (A): generalize the `favorite` table

Make the existing `favorite` table own **either** a user **or** an anonymous device, so every favorite — public or maintainer — is a first-class row and the count is a single correlated `COUNT` exactly like the existing `linkCount`/`embedCount`/`alertCount`.

Rejected alternatives:
- **Separate `anonymous_favorite` table** — forces summing two counts everywhere and double-counts a maintainer who favorited anonymously then logged in.
- **Denormalized `events.favorite_count` counter** — no dedup (clearing storage and re-favoriting inflates it), drift, races, weaker aggregate, not auditable.

## Data model

Migrate the existing `favorite` table (table name is `favorite`, see `src/db/schema/favorites.ts`):

- `user_id uuid` → **nullable** (drop `NOT NULL`); keep FK to `user` with `onDelete: cascade`.
- Add `anon_id uuid` **nullable** — an opaque client-generated device token. **No FK** (there is no anonymous-user table).
- CHECK `favorite_owner_chk`: `num_nonnulls(user_id, anon_id) = 1` — exactly one owner.
- Drop the current unique index `favorite_user_event_uq`; add two **partial** unique indexes:
  - `favorite_user_event_uq` on `(user_id, event_id) WHERE user_id IS NOT NULL`
  - `favorite_anon_event_uq` on `(anon_id, event_id) WHERE anon_id IS NOT NULL`
- Keep `favorite_user_id_idx`. Add `favorite_event_id_idx` on `(event_id)` so the per-event count stays fast.

Existing rows all have `user_id` set and `anon_id` null, so they satisfy the new CHECK — the migration is **non-destructive**. Generated SQL is reviewed before `db:migrate` (Supabase, no build-time migration step).

## Anonymous identity

New `src/helpers/anonId.ts` → `getOrCreateAnonId(): string`:
- Reads `fdlm:anon-id` from `localStorage`; if absent, generates `crypto.randomUUID()` and persists it.
- Mirrors the memory-fallback pattern of `src/helpers/favoritesStorage.ts` (private mode / quota). Client-only; returns a stable per-device id.

This is **functional storage**, like today's favorites — not a tracking cookie. See Privacy.

## Writes / API

Mutations (`src/db/mutations/favorites.ts`) — add anonymous siblings mirroring the existing user mutations (validate event existence, `onConflictDoNothing` on the relevant partial-unique target):
- `addAnonymousFavorites(anonId: string, eventIds: string[]): Promise<void>`
- `removeAnonymousFavorite(anonId: string, eventId: string): Promise<void>`

Routes — relax the currently auth-only favorite-write routes to accept an anonymous branch:
- `POST /api/favorites` — body `{ eventIds, anonId? }`. **With** a session → user rows (current behavior; `anonId` ignored). **No** session → require `anonId`; write anon rows.
- `DELETE /api/favorites/[eventId]` — **with** session → remove user row. **No** session → require `anonId` (passed as a **query param**, since the existing client sends no DELETE body); remove anon row.
- `postFavoritesSchema` gains optional `anonId: z.uuid()`. Add an `anonId` query-param schema for DELETE.
- `GET /api/favorites` (list the caller's favorites) stays **auth-only** — anonymous clients read their own favorites from `localStorage` as today; no anon GET needed.

**Behavior change (intended):** every visitor's favorite toggle now writes to the server. This is required to count public engagement. Volume is trivial at this scale.

## Login reconcile (anon → user claim)

New `POST /api/favorites/claim { anonId }` (auth required): in one `db.transaction`, for the logged-in user, convert that device's anon rows into the user's rows — `INSERT … (user_id, event_id) … onConflictDoNothing`, then `DELETE` the claimed `anon_id` rows — and return the user's full favorite event-id list for the edition(s). Atomic; guarantees no double-count.

`FavoritesProvider`'s reconcile (in `src/components/Favorites/FavoritesProvider.tsx`) becomes, on first authed render per `(editionId, auth)`:
1. POST any local-only ids (covers favorites made before this feature, never synced).
2. POST `/api/favorites/claim` with the device `anonId` (covers server-side anon rows).
3. GET `/api/favorites?editionId=` and merge into local state + `localStorage`.

For anonymous (unauthenticated) sessions, `toggleFavorite` keeps writing `localStorage` **and** now syncs to the server using the device `anonId`.

## Reads / DTOs

One correlated count, identical in shape to the existing child-row counts:

```ts
db.$count(favorites, eq(favorites.eventId, events.id))
```

(Use the `db.$count` helper, not raw `sql` interpolation — the latter produces an unqualified column that breaks correlated counts; see the existing `linkCount`/`embedCount` usage.)

- Add `favoriteCount: number` to:
  - `EventSummaryDto` (`src/db/queries/types.ts`) — wired in `listEditionEvents`.
  - the event-detail DTO — wired in `getEventDetail`.
  - `AdminEventSummary` — wired in `listEditionEventsAdmin`.
- Add `favoriteCount: number` to the public render type `src/types/Event.ts` and map it in `summaryToEvent` on the `[year]` page.

## Aggregate query module

New `src/db/queries/topFavorites.ts`, all returning lightweight rows (`{ id, name, favoriteCount, startTime, category }`) ordered by favorite count desc, ties broken by `startTime, id`:

- `getTopFavoritedEventsForYear(year: number, limit: number)` — **published-only**; returns `null` for a missing/unpublished edition (mirrors `listEditionEvents`). Backs both the public REST route and the admin dashboard card.
- `listTopFavoritedEventsPerEdition(limit: number)` — **published-only**; returns `[{ year, events: [...] }]`, one bucket per published edition. Backs the MCP tool's no-`year` mode.

## Display surfaces

1. **Public event card** (`src/components/EventList/EventListItem.tsx`): render the total favorite count beside the existing Star button, **shown only when `> 0`**. The Star *fill* continues to mean "I (this device/user) favorited"; the number is the public total.
2. **Admin events table**: a "Favoris" column from `AdminEventSummary.favoriteCount`.
3. **Admin dashboard** (`/admin`, "Tableau de bord"): a `TopFavoritesCard` added alongside `DashboardSummary`, listing the **current published edition's** top ~5 events by favorite count. It fetches the **public** REST endpoint below (the data is public; no admin-only route needed) via a `useTopFavorites(year, limit)` TanStack hook.

## MCP / agent exposure

- `favoriteCount` rides along **automatically** in the existing `list_events` and `get_event` MCP read tools (they JSON-serialize the DTOs) — no tool changes needed for per-event counts.
- **New public MCP read tool** `list_top_favorites` in `registerReadTools` (`src/mcp/tools.ts`): args `{ year?: number, limit?: number (1–50, default 10) }`. With `year` → `getTopFavoritedEventsForYear`. Omit `year` → `listTopFavoritedEventsPerEdition` (`[{ year, events }]`), so an agent answers "top N events of each edition" in one call. Published-only, mirroring the other public read tools.

## Public REST endpoint

- **New** `GET /api/editions/[year]/top-favorites?limit=` (public, unauthenticated, published-only) → `{ events: [...] }` from `getTopFavoritedEventsForYear`; 404 for a missing/unpublished edition. Backs the admin dashboard card and keeps the public API symmetric with the MCP tool.
- Update `src/app/api/openapi.json/route.ts` and `src/app/llms.txt/route.ts`: document the new `favoriteCount` field on event schemas and the new `top-favorites` endpoint.

## Shared-primitive guarantee

The admin dashboard card, the public REST route, and the MCP tool **all** call `topFavorites.ts`; per-event counts everywhere use the same `db.$count(favorites, …)` expression. No duplicated count or ranking logic.

## Privacy

The feature persists a **pseudonymous random device id** (`anon_id`) server-side. It carries no PII, enables no cross-site tracking, and is functional storage equivalent to the favorites already kept in `localStorage`. If/when a privacy policy exists, note anonymous favorite storage there.

## Abuse (accepted)

A determined user can clear `localStorage` → receive a new `anon_id` → re-favorite to add 1 to a count. This is mild and accepted. **Out of scope (YAGNI):** IP-hash dedup, soft caps, real-time count updates, a denormalized counter, and historical/trend analytics.

## Out of scope

- Showing *who* favorited an event.
- Notifications or ranking changes on the public site driven by favorite count.
- Any abuse-hardening beyond per-device dedup (see above).

## Verification

- `pnpm tsc:ci`, `pnpm lint` (scope eslint to `src/…` if the stray worktree noise appears), `pnpm build`.
- `pnpm db:generate` → **review** the generated SQL (nullable `user_id`, `anon_id`, CHECK, partial uniques, `event_id` index) → `pnpm db:migrate`.
- `curl` an anonymous `POST /api/favorites` with an `anonId`, then `GET /api/editions/[year]/events` → confirm `favoriteCount` incremented; `DELETE …?anonId=` → confirm it decremented.
- Login reconcile: favorite anonymously, log in, confirm the anon rows are claimed (no double count) and the count is unchanged.
- `GET /api/editions/[year]/top-favorites` returns ranked events; the `list_top_favorites` MCP tool returns per-edition buckets when `year` is omitted.
- Visual check: public card count, admin "Favoris" column, dashboard `TopFavoritesCard`.

## Affected files (orientation, not exhaustive)

- Schema/migration: `src/db/schema/favorites.ts`, `src/db/migrations/*`.
- Mutations: `src/db/mutations/favorites.ts`.
- Queries: `src/db/queries/types.ts`, `listEditionEvents.ts`, `getEventDetail.ts`, `admin/listEditionEventsAdmin.ts`, new `topFavorites.ts`.
- Validation: `src/validation/favorite.ts`.
- Routes: `src/app/api/favorites/route.ts`, `src/app/api/favorites/[eventId]/route.ts`, new `src/app/api/favorites/claim/route.ts`, new `src/app/api/editions/[year]/top-favorites/route.ts`.
- Client: `src/helpers/anonId.ts` (new), `src/components/Favorites/FavoritesProvider.tsx`, `src/components/EventList/EventListItem.tsx`.
- Admin UI: `src/app/admin/events/*` (table column), `src/app/admin/DashboardSummary.tsx` + new `TopFavoritesCard`, new `src/hooks/admin/useTopFavorites.ts` (or `src/hooks/`).
- Render type: `src/types/Event.ts`, `summaryToEvent` in `src/app/(public)/[year]/page.tsx`.
- MCP/docs: `src/mcp/tools.ts`, `src/app/api/openapi.json/route.ts`, `src/app/llms.txt/route.ts`.
