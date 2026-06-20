# Controlled MarkerPopup — fix mobile marker taps

**Date:** 2026-06-20
**Status:** Approved design, pending implementation plan

## Problem

On the deployed site, tapping a map marker no longer opens its popup on touch
devices (Android Chrome, iOS Safari); it still works on desktop.

**Root cause.** The "Voir sur la carte" feature refactored `EventsMap` from
per-marker `MarkerPopup` (maplibre-native, opened by maplibre's own tap
handling) to a single controlled `MapPopup` opened from our `onClick` — a DOM
`"click"` listener on the marker element (`ui/map.tsx` `MapMarker`). The markers
live inside maplibre's `cooperative-gestures` canvas container; on touch, the
synthesized `click` is unreliable/suppressed there, so `onClick` never fires and
the popup never opens. Desktop mouse `click` fires normally, hence the split.

`MapPopup`'s appeal — "fully render-controlled, no maplibre toggle to
reconcile" — is exactly what bypassed maplibre's touch-aware tap detection. On a
mobile-first app, touch reliability outranks avoiding the reconciliation code, so
we revert to maplibre-native popups and make them controllable.

## Approach: controlled MarkerPopup

Restore per-marker `MarkerPopup` (maplibre-native tap, touch-reliable) and make
it *controllable* so the "Voir sur la carte" focus feature can still open a
specific marker's popup and so only one popup is open at a time.

### `ui/map.tsx` — `MarkerPopup` gains optional controlled props

Add to `MarkerPopupProps`:
- `open?: boolean`
- `onOpenChange?: (open: boolean) => void`

Behaviour:
- **Unchanged when both omitted** (uncontrolled — current behaviour preserved
  for any other caller).
- **Keep `marker.setPopup(popup)`** so a tap opens/closes via maplibre's
  touch-aware handling. This is the load-bearing part of the fix.
- **maplibre → React sync:** subscribe once to the popup's maplibre `open` and
  `close` events and call `onOpenChange(true)` / `onOpenChange(false)`. Hold
  `onOpenChange` in a ref (mirroring `MapMarker`'s existing `callbacksRef`
  pattern) so the subscription is added once, not re-subscribed per render.
- **React → maplibre sync:** an effect keyed on `open` reconciles, guarded to
  avoid an open/close loop:
  - `if(open === true && !popup.isOpen()) marker.togglePopup();`
  - `else if(open === false && popup.isOpen()) popup.remove();`
- The existing close button (`popup.remove()`) and option-update block stay.

No `react-hooks/refs`/lint regressions beyond what the file already has;
`ui/map.tsx` is shadcn-owned and already exempt from several strict rules.

### `EventsMap` — one `selectedId`, per-marker controlled popup

- State `selectedId: string | null` (replaces `selectedEvent`).
- Render the per-marker `MarkerPopup` again (inside each `MapMarker`, after
  `MarkerContent`), each with the same visual props as before
  (`closeButton`, `anchor="bottom"`, `offset={40}`,
  `className="max-w-[85vw] overflow-y-auto sm:max-w-80 max-h-[320px] sm:max-h-[360px]"`)
  and its own `<EventInfoWindow markerInfo={marker} />`.
- Remove the single `MapPopup` and the `MapPopup` import.
- Each popup: `open={selectedId === marker.id}` and
  `onOpenChange={(o): void => setSelectedId((prev) => (o ? marker.id : (prev === marker.id ? null : prev)))}`.
  The `prev === marker.id` guard prevents an A→B switch from clobbering the new
  selection: B's `open` sets `selectedId = B`, then A's auto-close fires
  `onOpenChange(false)` and must only clear when A is still selected.
- **Recenter moves off the DOM click onto a selection effect** (the DOM click is
  the touch-unreliable path): an effect keyed on `selectedId` finds the marker
  and `recenterOn(lng, lat)`. So a tap and the focus feature both recenter,
  touch-reliably. Drop `recenterOn` from the marker `onClick` (the `onClick` prop
  can be removed entirely).
- **Focus effect** (unchanged shape): on `focusTarget` change, find the marker;
  if found, `setOnlyFavorites(false)` then `setSelectedId(focusTarget.id)`.
  Opening + recenter then flow through the controlled popup and the selection
  effect. `setOnlyFavorites(false)` keeps the existing
  `eslint-disable react-hooks/set-state-in-effect` justification.

### Single-popup behaviour

Exactly one popup open at a time: opening marker B sets `selectedId = B`, which
flips A's `open` to `false`, and A's reconcile effect calls `popup.remove()`.
This preserves the no-stacking property the `MapPopup` design introduced, now on
top of touch-reliable maplibre-native popups.

## Data flow summary

- **Tap a marker (any device):** maplibre opens the popup natively → popup
  `open` event → `onOpenChange(true)` → `setSelectedId(id)` → selection effect
  recenters; any previously-open popup is closed by its reconcile effect.
- **"Voir sur la carte":** `dispatchFocusMap(id)` → `EventsMapSection` expands +
  scrolls + sets `focusTarget` → `EventsMap` clears `onlyFavorites` +
  `setSelectedId(id)` → that marker's `MarkerPopup` `open` becomes true → reconcile
  effect opens it via `togglePopup` (touch-reliable) → selection effect recenters.
- **Close button / re-tap:** maplibre closes → `close` event → `onOpenChange(false)`
  → clears `selectedId` (guarded).

## Out of scope

- Changing `EventInfoWindow` content or the favorites toggle.
- The `EventsMapSection` keep-mounted / `focus-map` listener (unchanged).
- The `mapFocus.ts` bridge (unchanged).
- The side-by-side button layout work (separate, already done).

## Verification

- `pnpm tsc:ci`, `pnpm exec eslint src/...` (scoped), `pnpm build`.
- Runtime on a dev server with **touch emulation** (Playwright `hasTouch`/tap, or
  devtools device mode): a **tap** on a marker opens its popup (the regression);
  desktop mouse click still opens it; "Voir sur la carte" opens the right marker's
  popup; only one popup is ever open (tapping/ focusing another replaces it);
  close button works; 0 console errors. Confirm the popup looks identical to
  before.
