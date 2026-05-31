# Favorites feature — design

**Date:** 2026-05-31
**Branch context:** built on top of the DB/auth/admin/editions architecture (current `taxonomy-categories-genres` line).

## Goal

Let public visitors **star** events. Favorited events:

1. Appear in a dedicated **"Favoris"** section rendered **first** on the edition page (before all category sections), in addition to still appearing in their normal category section (additive, not a move).
2. Show as **gold markers** on the map, with an optional **"show only favorites"** filter toggle.

Favorites persist:

- **Anonymous visitors:** `localStorage`, scoped **per edition**.
- **Authenticated users** (invite-only staff — `admin`/`editor`/`viewer`; `disableSignUp: true`): persisted in the **database**.
- On login, anonymous (localStorage) favorites are **merged** into the user's DB favorites.

## Architecture decision

**Single `FavoritesProvider` context** (Approach A), mounted on the edition page and scoped to the current edition. State always mirrors to per-edition `localStorage`; when a session exists it also syncs to the DB. The star button, the Favoris section, and the map all consume the same context, giving free cross-component reactivity. The anonymous path — the majority of traffic — never touches the network. The DB backend is isolated behind the hook, invisible to the UI.

Rejected alternatives:
- **TanStack Query for DB favorites** — public pages use plain `fetch` (no QueryProvider in the public tree), and the anonymous majority gains nothing from query caching.
- **No shared state, each consumer reads storage directly** — no cross-component reactivity, duplicated sync logic.

## 1. Data model (DB)

New table in `src/db/schema/favorites.ts`, matching existing schema conventions (uuid pk, snake_case, cascade FKs):

```
favorite (
  id          uuid pk default random
  user_id     uuid not null → user(id)   on delete cascade
  event_id    uuid not null → events(id) on delete cascade
  created_at  timestamptz not null default now
  unique (user_id, event_id)   -- favorite_user_event_uq
  index (user_id)              -- favorite_user_id_idx
)
```

Per-edition scoping for authenticated users is **implicit**: an event belongs to exactly one edition, and the edition page only renders its own events, so we intersect the user's favorite ids with on-screen events. No `edition_id` column.

Wiring:
- Add export to `src/db/schema/index.ts`.
- Add relations in `src/db/schema/relations.ts` (`favorite → user`, `favorite → event`; optionally `user`/`events` back-relations).
- Generate migration via `pnpm db:generate`; apply with `pnpm db:migrate`.

## 2. Persistence / storage

- **Anonymous:** `localStorage`, key `fdlm:favorites:<editionId>`, value = JSON array of event ids.
- **Authenticated:** DB is source of truth; localStorage still mirrors for instant reads.
- `src/helpers/favoritesStorage.ts` wraps read/write/parse with SSR-safe guards (`typeof window === 'undefined'`) and an in-memory fallback when `localStorage` throws (private mode).

## 3. Provider interface

`src/components/Favorites/FavoritesProvider.tsx` (+ `useFavorites` hook). Mounted inside the edition page once `editionId` is known.

```ts
interface FavoritesContextValue {
  favoriteIds: ReadonlySet<string>;
  isFavorite: (eventId: string) => boolean;
  toggleFavorite: (eventId: string) => void;
  count: number;
  ready: boolean;
}
```

Behavior:
- **Mount (anon):** read localStorage → state.
- **Mount (authed):** read localStorage for instant paint → `GET /api/favorites?editionId=…` → reconcile; any local-only ids merged up via batch `POST` (the login merge). DB then wins.
- **toggle:** optimistic state + localStorage update; if authed, fire `POST` (add) / `DELETE` (remove). On network failure: log, keep the optimistic local value (favorites are low-stakes and still persisted locally).

The merge-on-login executes the next time an authenticated session is observed on an edition page (the provider only mounts there). This is acceptable: login happens on `/login`, and the merge runs on the subsequent edition-page visit.

## 4. API routes

All gated by `authorizeApi()` (require a session; any role).

- `GET /api/favorites?editionId=<uuid>` → `{ eventIds: string[] }` — the user's favorites within that edition.
- `POST /api/favorites` body `{ eventIds: string[] }` → upsert (`insert … on conflict do nothing`). Serves both single-add and login merge. Incoming ids are filtered against the `events` table first so one invalid/foreign id can't abort the batch.
- `DELETE /api/favorites/[eventId]` → remove one.

Supporting code:
- Queries in `src/db/queries/`: `listUserFavorites`, `addFavorites`, `removeFavorite` (+ export in `queries/index.ts`).
- Zod schemas in `src/validation/favorite.ts`.

## 5. UI touch-points

**(a) Star toggle — `src/components/EventList/EventListItem.tsx`**
A `lucide-react` `Star` button in the existing header row, before the chevron. `stopPropagation` so it doesn't trigger the Collapsible open/close. Filled gold (`text-amber-400` / `fill-amber-400`, with a `dark:` variant) when favorited, outline otherwise. `aria-label`: "Ajouter aux favoris" / "Retirer des favoris". Raw amber follows the existing status-badge color precedent.

**(b) Favoris section — `src/app/(public)/[year]/page.tsx`**
Rendered **first**, before the category loop, only when `count > 0`:
`<EventCategoryView categoryTitle="Favoris" categoryEvents={viewEvents.filter(isFavorite)} feteDeLaMusiqueDay={…} />` followed by a `<Separator />`. Additive — events still render in their real category. Recomputes live on toggle via context. The page is wrapped in `<FavoritesProvider editionId={…}>`.

**(c) Map — `src/components/EventsMap/EventsMap.tsx`**
Consumes `useFavorites`. Favorite status is applied at **render** time, not in the geocoding effect, so toggling never re-geocodes. Favorited markers get a gold `icon` (a `google.maps.Symbol` pin colored amber); others stay default. A "Afficher seulement les favoris" toggle (shadcn `Switch` or checkbox) above the map filters rendered markers to favorites only; default off.

## 6. Error handling & edge cases

- `localStorage` unavailable (private mode) → in-memory fallback, no crash.
- DB sync failure → optimistic value retained locally; `console.error`, no user-facing error.
- Stale local id (event deleted) → harmless: filtered out when intersecting with on-screen events; DB FK cascade removes the row.
- Star click vs. row expand → `stopPropagation` on the star button.
- Re-geocoding avoided → favorite icon/filter computed at render, geocoding effect stays keyed on `events`.

## 7. Verification

No test framework in the repo. Verify via:
- `pnpm tsc:ci` and `pnpm lint` (and `pnpm lint-fix` to match style).
- Manual dev-server checks:
  - star/unstar reflects live in the Favoris section and in the map marker color;
  - "show only favorites" map toggle filters correctly;
  - per-edition isolation (stars on one year don't appear on another);
  - logged-in DB persistence survives reload;
  - merge-on-login carries anonymous stars up to the DB.

## File summary

**New:**
- `src/db/schema/favorites.ts`
- `src/db/migrations/<generated>.sql`
- `src/db/queries/listUserFavorites.ts`, `addFavorites.ts`, `removeFavorite.ts` (or grouped)
- `src/validation/favorite.ts`
- `src/app/api/favorites/route.ts`
- `src/app/api/favorites/[eventId]/route.ts`
- `src/components/Favorites/FavoritesProvider.tsx` (+ `useFavorites`)
- `src/helpers/favoritesStorage.ts`

**Modified:**
- `src/db/schema/index.ts`, `src/db/schema/relations.ts`
- `src/db/queries/index.ts`
- `src/app/(public)/[year]/page.tsx`
- `src/components/EventList/EventListItem.tsx`
- `src/components/EventsMap/EventsMap.tsx`
