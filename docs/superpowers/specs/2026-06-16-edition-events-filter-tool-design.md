# EditionEventsFilterTool — design

**Date:** 2026-06-16
**Status:** Approved (brainstorm) — ready for implementation plan

## Purpose

A lightweight, compact, mobile-first tool on the public `/[year]` edition page that lets a
visitor narrow and reorder the agenda without leaving the page. It adds a text search, two
view toggles (day-of-edition, hide-past), and a sort control, while preserving the existing
borough grouping.

## Context

- The public page `src/app/(public)/[year]/page.tsx` builds `viewEvents: Event[]` and renders:
  `FavoritesSection` → `EditionEventsFilterTool` (currently a stub) → borough listing
  (`reduceEventsByCategory` → `sortEventsByCategoryEntries` → `EventCategoryView`) →
  `EventsRecap` → `EditionEmbeds` → `EventsMap`.
- **Categories are boroughs of Bordeaux**, not music genres. The grouping is meaningful and
  must always remain. `eventCategories` defines their canonical sort order.
- `Event` (render contract, `src/types/Event.ts`) exposes: `name?`, `status?`, `description?`,
  `category?`, `genres?: string[]`, `artists?: string[]`, `location: { name, addressStr? }`,
  `startTime: Date`, `endTime?: Date`, `price?`, `favoriteCount?: number`.
- The edition's festival day is `feteDeLaMusiqueDay: Date` (from `edition.dayOfFestival`,
  falling back to `${year}-06-21`).

## Behavior

### Filtering scope

The filtered + sorted list feeds the **borough listing** and the **`EventsMap`**.
**Out of scope** (always show the full, unfiltered data):

- `FavoritesSection` — the pinned favorites block stays global.
- `EventsRecap` — keeps showing the edition total ("N événements cette année").

### Toggles

- **Day-of-edition toggle** — default **ON**. When ON, keep only events whose `startTime`
  falls inside the festival-night window `[dayOfFestival 06:00:00, dayOfFestival + 1 day
  06:00:00)` in local (Europe/Paris-equivalent browser) time. This treats the whole night as
  one block, so a set starting 23:30 or 01:00 is kept while a different-day pre-party is hidden.
- **Hide-past toggle** — default **ON**. An event is "past" when:
  - it has an `endTime` and `endTime < now`; or
  - it has **no** `endTime` and its `startTime` calendar date is strictly before today's date
    (so today's open-ended events always remain visible).
  `now` is captured at mount (`new Date()`); it does not tick live — a reload refreshes it.

### Search

- Frontend only, **no debounce**, runs on every keystroke.
- **Accent- and case-insensitive** substring match. Normalize both the query and the haystack
  with `String.prototype.normalize('NFD')` + diacritic strip + `toLowerCase()`.
- Haystack per event: `name`, each `artists[]`, each `genres[]`, `location.name`,
  `location.addressStr`, `description`. An event matches if the normalized query is a substring
  of any normalized field.
- Empty/whitespace-only query = no search constraint.

### Sort

- Field: `none` | `start` | `end` | `favorites`; direction: `asc` | `desc`.
- `none` (default) preserves the current insertion order — i.e. exactly today's behavior.
- `start` → `startTime`; `end` → `endTime` (events without an end sort last regardless of
  direction); `favorites` → `favoriteCount ?? 0`.
- **Sorting applies within each borough section, not across boroughs.** Implementation: sort
  the flat filtered list by the comparator, then `reduceEventsByCategory` (which preserves
  insertion order), so each section comes out in comparator order while section order stays the
  canonical borough order.

## UI

Mobile-first. Bar styling matches the shadcn/`neutral` theme (Tailwind v4 tokens, `dark:`
aware). All controls in the bar share **one control-height token** (search input, the search
✕, the ⟲ reset, the Filtres button) so the row stays visually flush — no mismatched heights.

### Bar (always visible, sibling of the borough listing)

- **Search input** with a leading icon and a trailing **✕** that clears only the text
  (shown only when the query is non-empty).
- **⟲ reset** control — appears **only** when state ≠ defaults; resets **back to defaults**
  (both toggles ON, search and sort cleared). Icon-only on mobile, icon + "Réinitialiser" on
  desktop.
- **"Filtres & tri" button** opening the dialog, with a **badge** = count of active *narrowing*
  filters = `(dayOnly ? 1 : 0) + (hidePast ? 1 : 0) + (search.trim() ? 1 : 0)`. Sort does not
  contribute (it reorders, it doesn't hide). At first load the badge reads **2**, which honestly
  signals "your view is narrowed" and explains why few events show.

### Dialog (`components/ui/dialog`)

- **Full-screen sheet on mobile, centered modal on desktop** (responsive classes on
  `DialogContent`).
- Contents:
  - **Affichage** section — the two `Switch`es with short helper captions.
  - **Trier par** section — a field picker (Aucun / Début / Fin / Favoris) plus a direction
    toggle (croissant / décroissant), disabled when field = Aucun.
- Footer: **Réinitialiser** (same as bar ⟲) + **"Voir N résultats"** (N = current filtered
  count) which simply closes the dialog.
- Changes apply **live** (state updates immediately; the page behind reflects them).

### Empty state

When `viewEvents.length > 0` but the filtered list is empty, the borough listing area renders
an "Aucun événement ne correspond à votre recherche." block with a reset action, instead of
empty sections.

## Architecture

- **`src/helpers/applyEventFilters.ts`** (pure, unit-testable):
  - `eventMatchesFilters(event, filters, feteDeLaMusiqueDay, now): boolean`
  - `compareEvents(sort): (a, b) => number`
  - `applyEventFilters(events, filters, feteDeLaMusiqueDay, now): Event[]` = filter then sort.
  - a `normalizeText(s)` helper for accent/case folding.
- **`src/hooks/public/useEditionFilters.ts`**: owns `filters` state, captures `now` at mount,
  and returns `{ filters, setFilters, reset, activeCount, filteredEvents }`. `filteredEvents`
  is `useMemo`'d over `applyEventFilters`.
  - `FilterState = { search: string; dayOnly: boolean; hidePast: boolean; sortField: 'none' |
    'start' | 'end' | 'favorites'; sortDir: 'asc' | 'desc' }`.
  - `DEFAULT_FILTERS = { search: '', dayOnly: true, hidePast: true, sortField: 'none', sortDir:
    'asc' }`.
  - State is in-memory only (no URL/localStorage); resets on reload.
- **`EditionEventsFilterTool`** becomes presentational: props
  `{ filters, onChange, onReset, activeCount, resultCount }`. Renders the bar + dialog; holds
  only local dialog-open UI state. No filtering logic inside.
- **`EditionPage`** calls `useEditionFilters(viewEvents, feteDeLaMusiqueDay)`, passes
  state/handlers/`resultCount` to the tool, and feeds `filteredEvents` to the borough listing
  and `EventsMap`. `FavoritesSection` and `EventsRecap` keep receiving the full `viewEvents`.

## Out of scope / non-goals

- No server-side filtering, no new API.
- No persistence (URL params / localStorage) — explicitly deferred.
- No per-borough sort overrides; one global sort applied within every section.
- The map does not consume the sort (irrelevant to markers); it consumes only the filtered set.

## Verification

- `pnpm tsc:ci`, `pnpm lint`, `pnpm build`.
- Manual checks against a running dev server: default view shows only day-of, non-past events;
  toggles reveal others; search narrows live; sort reorders within boroughs only; reset/badge
  behave per spec; dialog is full-screen on mobile and modal on desktop; equal control heights.
- Confirm `FavoritesSection`, `EventsRecap` counts stay global while `EventsMap` follows filters.
