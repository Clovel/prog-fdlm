# "Voir sur la carte" — jump from a list event to its map marker

**Date:** 2026-06-20
**Status:** Approved design, pending implementation plan

## Goal

The reverse of "Voir plus" (map → list): a **"Voir sur la carte"** button on an
event in the agenda list scrolls up to the map section and opens that event's
marker popup. Mirrors the existing list↔map navigation, sharing its custom-event
bridge pattern.

## Direction & existing mechanisms

- "Voir plus" already goes map → list via a typed window `CustomEvent`
  (`helpers/eventFocus.ts`, `fdlm:focus-event`) that the canonical
  `EventListItem` reacts to. This feature is the opposite direction and reuses
  the same pattern with a new event name.
- The map (`EventsMapSection` → `EventsMap`) is rendered **above** the list and
  is collapsible. Today the map **unmounts** when collapsed (Radix default) and
  is `dynamic(ssr:false)`.
- `EventsMap` builds a marker only for events with `location.coords`.
- `ui/map.tsx` exports a fully render-controlled `MapPopup` (open = mounted,
  close = unmounted; positioned by `lng/lat`) whose markup is byte-identical to
  the marker-bound `MarkerPopup`. `MapRef` is the maplibre `Map` instance, so
  `mapRef.current.resize()` is available. There is no `ResizeObserver` in the
  wrapper, so a hidden→visible reveal needs a manual `resize()`.

## Key architectural change: keep the map mounted

To remove all remount/timing complexity, the map **no longer unmounts when the
section collapses**:

- `EventsMapSection` renders `<CollapsibleContent forceMount className="data-[state=closed]:hidden">`,
  so `EventsMap` stays in the DOM and is only CSS-hidden when collapsed (Radix
  still wires the trigger's aria/animation).
- Because a hidden (`display:none`) container has zero size, `EventsMap` calls
  `mapRef.current.resize()` whenever it transitions from collapsed to expanded
  (driven by an `expanded` prop). This also covers manual expand, not just focus.

Trade-off (accepted): an always-mounted map keeps one WebGL context alive while
collapsed — negligible for a single map; the section defaults open so the map
loads on first paint regardless.

## Unified single controlled popup

`EventsMap` replaces the per-marker `MarkerPopup` with **one** controlled
`MapPopup` driven by a single `selectedEvent: MarkerInfo | null` state:

- A **marker click** sets `selectedEvent` (and recenters, as today).
- A **focus event** sets `selectedEvent` (see flow below).
- Exactly one `MapPopup` renders for `selectedEvent`, at its coords, with the
  same `EventInfoWindow` content and the same props the old `MarkerPopup` used
  (`closeButton`, `anchor="bottom"`, `offset={40}`, and the same `className`:
  `max-w-[85vw] overflow-y-auto sm:max-w-80 max-h-[320px] sm:max-h-[360px]`), so
  it is visually identical to today's popup. `onClose` clears `selectedEvent`.

Result: identical popup appearance, and always exactly one popup open (no
stacking) — no visible UI change versus today's click behaviour.

## Components & data flow

### `src/helpers/mapFocus.ts` (new)

Mirror of `eventFocus.ts`:
- `FOCUS_MAP_EVENT_NAME = 'fdlm:focus-map'`
- `interface FocusMapDetail { id: string }`
- `dispatchFocusMap(id: string): void` — dispatches the typed `CustomEvent`.
- `isFocusMapEvent(event: Event): event is CustomEvent<FocusMapDetail>` — guard.

### `EventRender.tsx` (edit)

Add a **"Voir sur la carte"** button (lucide `Map` icon) next to the existing
"Voir l'itinéraire" `MapsLink` button, rendered **only when
`event.location.coords !== undefined`**. `onClick → dispatchFocusMap(event.id)`.

### `EventsMapSection.tsx` (edit)

- Keep `EventsMap` mounted via `CollapsibleContent forceMount` + `data-[state=closed]:hidden`.
- Add a `ref` on the `<section>`.
- Listen for `fdlm:focus-map` (guarded by `isFocusMapEvent`). On a matching event:
  1. `setOpen(true)` (expand if collapsed),
  2. smooth-scroll the section into view (`sectionRef.scrollIntoView({ behavior: 'smooth', block: 'start' })`),
  3. set `focusTarget = { id, nonce }` state (nonce so re-clicking the same event re-triggers).
- Pass `expanded={open}` and `focusTarget` down to `EventsMap`.

### `EventsMap.tsx` (edit)

- New props: `expanded: boolean`, `focusTarget: { id: string; nonce: number } | null`.
- `selectedEvent: MarkerInfo | null` state drives the single `MapPopup`.
- Marker `onClick` → `setSelectedEvent(marker)` + `recenterOn(...)` (existing recenter kept).
- Effect on `expanded` false→true → `mapRef.current?.resize()`.
- Effect on `focusTarget` (id+nonce) → find the `MarkerInfo` for `focusTarget.id`
  in `eventMarkers`; if found: `setOnlyFavorites(false)` (so the target marker is
  visible), `setSelectedEvent(found)`, `recenterOn(found.position.lng, found.position.lat)`.
- Render one `<MapPopup>` for `selectedEvent` (props as above); `onClose → setSelectedEvent(null)`.

## Edge handling

- **No coords:** the "Voir sur la carte" button is not rendered (can't focus a
  missing marker). `EventInfoWindow`'s own map button only appears for
  coord-bearing events anyway.
- **Section collapsed:** auto-expanded by the focus handler; the map is already
  mounted so focus is synchronous (no wait).
- **`onlyFavorites` filter on:** cleared on focus so the target marker shows.
- **Re-click same event:** the `nonce` re-triggers recenter + popup.
- **`MarkerInfo.isFavorite`:** the implementation must align with the current
  `MarkerInfo` shape (it carries `isFavorite`, consumed by `EventInfoWindow`); the
  `selectedEvent` value must be a complete `MarkerInfo`.

## Out of scope

- Highlighting/animating the marker itself beyond opening its popup.
- Deep-linking to a map marker via URL.
- Changing the favorites-toggle behaviour inside `EventInfoWindow`.

## Verification

- `pnpm tsc:ci`, `pnpm exec eslint src/...`, `pnpm build`.
- Runtime on a running dev server: from a list event's expanded detail, click
  "Voir sur la carte" → page scrolls up to the map (expanding it if collapsed),
  the map resizes to fill, and that event's popup opens at its marker, identical
  in appearance to clicking the marker. Confirm no second/stacked popup, no
  console/hydration errors, and that collapsing/expanding the section no longer
  reinitialises the map.
