# Event share feature

**Date:** 2026-06-21
**Status:** Approved design, pending implementation plan

## Goal

Let visitors share a single event. A "Partager" button (under the maps buttons
in the expanded event detail) triggers the OS share sheet (or copies the link as
a fallback). Opening the shared link lands on the edition page, scrolls to the
event, and focuses it (expand + highlight) — reusing the existing focus
mechanism. Shared links also render a per-event preview card (OpenGraph) when
pasted into messengers.

## Existing mechanisms reused

- **Focus**: `helpers/eventFocus.ts` `dispatchFocusEvent(id)` + the `EventListItem`
  listener already scroll/expand/highlight the canonical (non-favorites) row.
- **Filters**: `helpers/applyEventFilters.ts` (`DEFAULT_FILTERS`, `eventMatchesFilters`,
  private `isPast`/`isInFestivalNight`).
- **OG cards**: `lib/shareCard/shareCard.tsx` (`renderShareCard`), `ogBase.ts`,
  `colors.ts`, `fonts/`; per-edition `(public)/[year]/opengraph-image.tsx`.
- **Toasts**: `sonner` is already wired.
- **Edition metadata**: `(public)/[year]/layout.tsx` `generateMetadata` (edition-level).

## SSR constraints (this app is hydration-sensitive)

This app server-renders the edition page and has had hydration mismatches before
(EventTime timezone; `serverNowIso` is passed server→client; `EventsMap` is
`ssr:false`). Two rules the design must honour:

1. **No `navigator`/`window` branching at render time.** The share button must
   render identical HTML on server and client; the `navigator.share`-vs-clipboard
   choice happens **inside the onClick handler** only. One stable button label
   ("Partager"), no render-time feature detection.
2. **Read the `?event=` param on the server, pass it as a prop** — do NOT use
   `useSearchParams()` on the client (avoids the static-render/Suspense caveat).
   `page.tsx` reads `searchParams.event` and passes `focusEventId` into
   `EditionAgenda`. The focus + filter-relaxation run in a **post-hydration
   `useEffect`**, so the SSR HTML and first client render are identical (default
   filters); only after hydration does the effect relax filters / scroll / focus.

## URL shape

`https://<origin>/<year>?event=<eventId>` (query param). One URL serves both the
human (page renders the agenda + client deep-link focus) and the crawler
(server `generateMetadata` emits per-event OG). No duplicate route. Reading
`searchParams` keeps the route dynamic — it already is (per-request DB queries +
`new Date()`), so no regression.

---

## Part A — Share button + deep-link (core, independently shippable)

### A1. `ShareEventButton` (new) — `src/components/ShareEventButton/ShareEventButton.tsx`

- `'use client'`, `React.FC<{ event: Event }>`, default export, repo comment-banner.
- Renders one shadcn `Button variant="outline" size="sm"` with a `Share2`
  (lucide) icon + label **"Partager"**. Styled `grow shrink-0` to match the
  sibling buttons in the action row.
- `onClick` (typed `(): void =>`, wrapped so it returns void): builds
  `` const url = `${window.location.origin}${window.location.pathname}?event=${event.id}`; ``
  then:
  - `if(typeof navigator.share === 'function')` → `void navigator.share({ title, text, url })`
    (`.catch` to swallow the user-cancel `AbortError`; promise chain per repo's
    `promise/*` rules).
  - else → `void navigator.clipboard.writeText(url).then(() => toast.success('Lien copié')).catch(...)`.
  - `title` = `event.name ?? event.location.name`; `text` = a short French line
    (e.g. `` `${event.name ?? event.location.name} — Fête de la Musique` ``).
- Feature detection is entirely inside the handler — never in render (SSR rule 1).

### A2. `EventRender` (edit) — add the button to the action row

In the existing `mt-4 flex items-center gap-2` action row (the one holding the
`MapsLink` button + "Voir sur la carte"), add `<ShareEventButton event={event} />`.
The share button is **always shown** (sharing needs neither address nor coords).
The row already exists; if neither maps button renders, the row still renders for
the share button (adjust the row's render guard to also account for "always show
share").

### A3. `relaxFiltersToShow` (new) — in `src/helpers/applyEventFilters.ts`

```
export const relaxFiltersToShow = (
  event: Event,
  filters: FilterState,
  feteDeLaMusiqueDay: Date,
  now: Date,
): FilterState
```
Returns a `FilterState` equal to `filters` but with only the toggles that would
hide `event` flipped, so `eventMatchesFilters(event, result, fete, now)` is true:
- if `filters.hidePast && isPast(event, now)` → `hidePast: false`
- if `filters.dayOnly && !isInFestivalNight(event.startTime, fete)` → `dayOnly: false`
- if `!filters.showForKids && event.forKids === true` → `showForKids: true`
- `search` left untouched (deep-link starts from default empty search).
Lives in `applyEventFilters.ts` so it can use the module-private `isPast` /
`isInFestivalNight`.

### A4. `page.tsx` (edit) — read the param server-side, pass as prop

- Add `searchParams: Promise<{ event?: string }>` to the page args; await it;
  pass `focusEventId={typeof event === 'string' ? event : undefined}` to
  `EditionAgenda`. (No validation needed beyond string presence; an unknown id
  is a no-op in the client effect.)

### A5. `EditionAgenda` (edit) — deep-link focus effect

- New optional prop `focusEventId?: string`.
- A `useRef<boolean>(false)` `focusedRef` so it fires once.
- `useEffect` (deps include `focusEventId`, `viewEvents`, `filteredEvents`,
  `filters`, `feteDeLaMusiqueDay`, `now`, `setFilters`):
  1. `if(focusEventId === undefined || focusedRef.current) return;`
  2. `const target = viewEvents.find((e) => e.id === focusEventId); if(target === undefined) return;` (not in this edition → no-op)
  3. if `!eventMatchesFilters(target, filters, feteDeLaMusiqueDay, now)` →
     `setFilters(relaxFiltersToShow(target, filters, feteDeLaMusiqueDay, now)); return;`
     (wait for the relaxed re-render; effect re-runs)
  4. target is now visible → `focusedRef.current = true; dispatchFocusEvent(focusEventId);`
- Because parent effects run after child `EventListItem` mount effects (listeners
  attached), the dispatch lands. The first render uses default filters (matches
  SSR); relaxation/scroll happen post-hydration.

---

## Part B — Per-event OG preview (depends on A's URL)

### B1. `getEventShareData` (new) — `src/db/queries/getEventShareData.ts`

`getEventShareData(eventId: string): Promise<EventShareData | null>` selecting
from `events` joined to `editions` (published only): returns
`{ year, name, venueName, addressStr, startTime, endTime }` (the fields the OG
card + metadata title/description need). Returns `null` for unknown/unpublished.
Exact column names verified against `db/schema` during implementation.

### B2. Per-event OG card — `src/lib/shareCard/eventShareCard.tsx` (new)

`renderEventShareCard(data: EventShareData): Promise<Response>`, a sibling of
`renderShareCard`, reusing `ogBase`/`colors`/`fonts`. Renders the event name,
venue, and date. Honour the known Satori gotchas: embed images as base64
data-URIs (no inline `<svg>`), read font/asset files via
`fs.readFile(new URL(..., import.meta.url))`. Re-export `size`/`contentType`/`alt`.

### B3. OG image route — `src/app/api/og/event/[eventId]/route.tsx` (new)

A `GET` route handler: `getEventShareData(eventId)` → if null, return the edition
fallback card (or a 404/redirect to the edition OG); else
`renderEventShareCard(data)`. Stable URL `/api/og/event/<id>` referenced by
`generateMetadata`.

### B4. `page.tsx` `generateMetadata` (edit)

Add page-level `generateMetadata({ params, searchParams })`:
- `const { year } = await params; const { event } = await searchParams;`
- if `event` is a string and `getEventShareData(event)` resolves to a row whose
  `year` matches the route year → return per-event metadata: `title` =
  `` `${name} — Fête de la Musique ${year} à Bordeaux` ``, `description` =
  venue + formatted date, `openGraph` = `{ ...OG_SITE, title, description,
  images: [`/api/og/event/${event}`] }`, matching `twitter`.
- else → return `{}` so the edition-level metadata from `layout.tsx` is inherited.
- Uses `metadataBase`/`OG_SITE` so the relative image URL resolves to an absolute
  one for crawlers.

---

## Files summary

**New:** `components/ShareEventButton/ShareEventButton.tsx`,
`db/queries/getEventShareData.ts`, `lib/shareCard/eventShareCard.tsx`,
`app/api/og/event/[eventId]/route.tsx`.
**Edited:** `helpers/applyEventFilters.ts` (+`relaxFiltersToShow`),
`components/EventRender/EventRender.tsx` (+button),
`app/(public)/[year]/page.tsx` (+`searchParams` prop + `generateMetadata`),
`app/(public)/[year]/EditionAgenda.tsx` (+`focusEventId` + focus effect).

## Sequencing

Part A first (button + deep-link is shippable and testable on its own), then
Part B (preview), which depends on the `?event=` URL shape from A.

## Out of scope

- Sharing from the map popup (`EventInfoWindow`) — button lives in the list detail only.
- Stripping `?event=` from the URL after focusing (optional polish; the once-guard
  already prevents re-trigger).
- Per-event canonical/SEO routes beyond the OG metadata.

## Verification

- `pnpm tsc:ci`, `pnpm exec eslint src/...`, `pnpm build`.
- Runtime: the "Partager" button renders identically server/client (no hydration
  warning); clicking calls the share sheet where supported and copies + toasts
  otherwise. Opening `/<year>?event=<id>` scrolls to + expands + highlights the
  event, including for a **past / kids-only / off-night** event (exercises
  `relaxFiltersToShow`), and is a no-op for an id not in the edition.
- OG: `curl` the page with `?event=<id>` and confirm per-event `og:title` /
  `og:image`; fetch `/api/og/event/<id>` and confirm an image renders; confirm a
  no-`event` load still inherits the edition card.
