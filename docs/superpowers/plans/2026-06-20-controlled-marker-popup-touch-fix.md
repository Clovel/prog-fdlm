# Controlled MarkerPopup (mobile tap fix) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore touch-reliable marker taps by reverting `EventsMap` to maplibre-native per-marker `MarkerPopup`, made controllable so the "Voir sur la carte" focus feature and single-popup behaviour still work.

**Architecture:** `MarkerPopup` (in shadcn-owned `ui/map.tsx`) gains optional `open`/`onOpenChange` props. It keeps maplibre's `marker.setPopup` (touch-aware tap), mirrors the popup's maplibre `open`/`close` events back to React, and reconciles a controlled `open` prop with guards. `EventsMap` drives one `selectedId`; both a native tap (via `onOpenChange`) and a focus request set it; recenter moves off the touch-unreliable DOM click onto a selection effect.

**Tech Stack:** React 19 (client), TypeScript, maplibre-gl via `components/ui/map.tsx`.

## Global Constraints

- **No test framework.** Verification is `pnpm tsc:ci`, `pnpm exec eslint <files>`, `pnpm build`, plus runtime checks. Never claim a unit test was added.
- **`src/components/ui/map.tsx` is shadcn-owned and follows shadcn style, NOT the project's strict rules:** double quotes, `if (x)` *with* a space, no explicit return types on internal functions, `// eslint-disable-next-line react-hooks/exhaustive-deps` where present. Match the surrounding file exactly; do NOT "fix" these relaxations or add project-style formatting there.
- **`src/components/EventsMap/EventsMap.tsx` follows the strict project rules:** 2-space indent, single quotes JS / double JSX, semicolons, trailing commas, **no space after `if`** (`if(x)`), `strict-boolean-expressions` (`!== null`/`!== undefined`), explicit return types incl. handlers (`(): void =>`).
- **Visual parity:** the per-marker `MarkerPopup` must use `closeButton`, `anchor="bottom"`, `offset={40}`, and `className="max-w-[85vw] overflow-y-auto sm:max-w-80 max-h-[320px] sm:max-h-[360px]"` so the popup looks identical to today.
- **Single popup:** exactly one popup open at a time (the no-stacking property).
- **Touch is the priority platform.** The fix exists because a DOM `click` is unreliable on touch; do not reintroduce a dependency on the marker's DOM click for opening the popup.

---

### Task 1: Make `MarkerPopup` controllable (`ui/map.tsx`)

**Files:**
- Modify: `src/components/ui/map.tsx` — `MarkerPopupProps` (currently lines 534-541) and `MarkerPopup` (currently lines 543-606).

**Interfaces:**
- Consumes: existing `useMarkerContext()` → `{ marker, map }`; the maplibre `popup` instance.
- Produces: `MarkerPopup` accepts two new optional props: `open?: boolean` and `onOpenChange?: (open: boolean) => void`. Omitting both preserves current (uncontrolled) behaviour.

- [ ] **Step 1: Add the two props to `MarkerPopupProps`**

Replace the `MarkerPopupProps` type (lines 534-541) with:

```tsx
type MarkerPopupProps = {
  /** Popup content */
  children: ReactNode;
  /** Additional CSS classes for the popup container */
  className?: string;
  /** Show a close button in the popup (default: false) */
  closeButton?: boolean;
  /** Controlled open state. Omit for uncontrolled (maplibre tap-toggle only). */
  open?: boolean;
  /** Called when the popup opens or closes (native tap, focus, or close button). */
  onOpenChange?: (open: boolean) => void;
} & Omit<PopupOptions, "className" | "closeButton">;
```

- [ ] **Step 2: Destructure the new props and add an `onOpenChange` ref**

Change the function signature + the top of the body. Replace lines 543-551 (the `function MarkerPopup({...}) {` head through `const prevPopupOptions = useRef(popupOptions);`) with:

```tsx
function MarkerPopup({
  children,
  className,
  closeButton = false,
  open,
  onOpenChange,
  ...popupOptions
}: MarkerPopupProps) {
  const { marker, map } = useMarkerContext();
  const container = useMemo(() => document.createElement("div"), []);
  const prevPopupOptions = useRef(popupOptions);
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;
```

(The `popup = useMemo(...)` block and the existing `useEffect(() => { ... marker.setPopup(popup); ... }, [map])` that follow stay unchanged.)

- [ ] **Step 3: Add the two sync effects after the existing `setPopup` effect**

Immediately after the existing `useEffect(() => { if (!map) return; popup.setDOMContent(container); marker.setPopup(popup); return () => { marker.setPopup(null); }; }, [map]);` block, insert:

```tsx
  // Mirror maplibre open/close (native tap, focus, or close button) back to React.
  useEffect(() => {
    const handleOpen = () => onOpenChangeRef.current?.(true);
    const handleClose = () => onOpenChangeRef.current?.(false);
    popup.on("open", handleOpen);
    popup.on("close", handleClose);
    return () => {
      popup.off("open", handleOpen);
      popup.off("close", handleClose);
    };
  }, [popup]);

  // Reconcile the controlled `open` prop with the actual popup state. Guards
  // keep the open<->close event loop from re-triggering. Uncontrolled (open
  // === undefined) is a no-op.
  useEffect(() => {
    if (open === undefined || !map) return;
    if (open && !popup.isOpen()) {
      marker.togglePopup();
    } else if (!open && popup.isOpen()) {
      popup.remove();
    }
  }, [open, map, marker, popup]);
```

(The `if (popup.isOpen()) { ... }` option-update block, `handleClose`, and the `createPortal(...)` return below stay unchanged.)

- [ ] **Step 4: Typecheck + lint**

Run: `pnpm tsc:ci && pnpm exec eslint src/components/ui/map.tsx`
Expected: no NEW errors. `ui/map.tsx` has pre-existing `react-hooks/refs` errors (documented in CLAUDE.md) — those remain; your change must not add others. `EventsMap` still uses `MapPopup` here and is unaffected, so `tsc:ci` stays clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/map.tsx
git commit -m "feat(map): make MarkerPopup controllable (open/onOpenChange)"
```

---

### Task 2: Switch `EventsMap` to the controlled `MarkerPopup`

**Files:**
- Modify: `src/components/EventsMap/EventsMap.tsx` (full rewrite below)

**Interfaces:**
- Consumes: `MarkerPopup` (with `open`/`onOpenChange` from Task 1) instead of `MapPopup`.
- Produces: `MarkerInfo`, `MapFocusTarget`, and `EventsMap` props (`eventMarkers`, `expanded`, `focusTarget`) unchanged.

Replaces the single `MapPopup` + `selectedEvent` with one `selectedId` driving a per-marker controlled `MarkerPopup`. Recenter moves to a `selectedId` effect (off the DOM click). Marker `onClick` is removed.

- [ ] **Step 1: Rewrite `src/components/EventsMap/EventsMap.tsx`**

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

/* Module imports -------------------------------------- */
import { useFavorites } from 'components/Favorites/FavoritesProvider';
import { cn } from 'lib/utils';

/* Component imports ----------------------------------- */
import { MapPin } from 'lucide-react';
import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  useMap,
} from 'components/ui/map';
import { Switch } from 'components/ui/switch';
import { Label } from 'components/ui/label';
import EventInfoWindow from './EventInfoWindow';

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';
import type { MapRef } from 'components/ui/map';

/* Type declarations ----------------------------------- */
export interface MarkerInfo {
  id: string;
  position: {
    lat: number;
    lng: number;
  };
  event: Event;
  isFavorite: boolean;
}

export interface MapFocusTarget {
  id: string;
  nonce: number;
}

/* Internal variables ---------------------------------- */
// IGN Géoplateforme PLAN.IGN vector style — keyless, served by IGN. Used for
// both themes (the map stays light; the popup respects dark mode on its own).
const IGN_STYLE = 'https://data.geopf.fr/annexes/ressources/vectorTiles/styles/PLAN.IGN/standard.json' as const;

const center = {
  lat: 44.840912,
  lng: -0.571377,
} as const satisfies { lat: number; lng: number };

/* LockBearing component ------------------------------- */
// Disables map rotation (mouse drag-rotate and two-finger touch rotate) so the
// map can never be turned off true-north. Rendered inside <Map> to reach the
// MapLibre instance via context.
const LockBearing: React.FC = () => {
  const { map } = useMap();

  useEffect(
    (): void => {
      if(map === null) {
        return;
      }
      map.dragRotate.disable();
      map.touchZoomRotate.disableRotation();
      map.setBearing(0);
    },
    [map],
  );

  return null;
};

/* EventsMap component prop types ---------------------- */
interface EventsMapProps {
  eventMarkers: MarkerInfo[];
  expanded: boolean;
  focusTarget: MapFocusTarget | null;
}

/* EventsMap component --------------------------------- */
const EventsMap: React.FC<EventsMapProps> = (
  {
    eventMarkers = [],
    expanded,
    focusTarget,
  },
) => {
  const { isFavorite, count } = useFavorites();
  const [ onlyFavorites, setOnlyFavorites ] = useState<boolean>(false);
  const [ selectedId, setSelectedId ] = useState<string | null>(null);
  const mapRef = useRef<MapRef>(null);

  // Pan the marker into the lower third of the viewport so its popup (which
  // opens above the pin) stays fully visible — including on mobile.
  const recenterOn = useCallback(
    (lng: number, lat: number): void => {
      mapRef.current?.flyTo({ center: [ lng, lat ], offset: [ 0, 175 ], duration: 400 });
    },
    [],
  );

  // The map is kept mounted while the section is collapsed (display:none), which
  // zeroes its size; resize once it becomes visible again so it fills its box.
  useEffect(
    (): void => {
      if(expanded) {
        mapRef.current?.resize();
      }
    },
    [expanded],
  );

  // Recenter whenever the open marker changes. Driven by selection state (set by
  // a native tap's open event or by a focus request) rather than the marker's
  // DOM click, which is unreliable on touch under cooperativeGestures.
  useEffect(
    (): void => {
      if(selectedId === null) {
        return;
      }
      const target = eventMarkers.find((marker) => marker.id === selectedId);
      if(target === undefined) {
        return;
      }
      recenterOn(target.position.lng, target.position.lat);
    },
    [
      selectedId,
      eventMarkers,
      recenterOn,
    ],
  );

  // A focus request (from a list event's "Voir sur la carte") opens that event's
  // popup. Clear the favorites filter first so the target marker is visible, then
  // select it (the controlled MarkerPopup opens; the effect above recenters).
  // No-op if the id has no marker.
  useEffect(
    (): void => {
      if(focusTarget === null) {
        return;
      }
      const target = eventMarkers.find((marker) => marker.id === focusTarget.id);
      if(target === undefined) {
        return;
      }
      setOnlyFavorites(false); // eslint-disable-line react-hooks/set-state-in-effect
      setSelectedId(focusTarget.id);
    },
    [
      focusTarget,
      eventMarkers,
    ],
  );

  // Falls back to "show all" when there are no favorites, so the filter can't
  // strand the user on an empty map while the Switch is disabled.
  const favoritesOnly: boolean = onlyFavorites && count > 0;
  const visibleMarkers: MarkerInfo[] = eventMarkers.filter(
    (marker) => !favoritesOnly || isFavorite(marker.id),
  );

  return (
    <div>
      <div className="flex items-center gap-2 py-2">
        <Switch
          id="only-favorites"
          checked={favoritesOnly}
          onCheckedChange={setOnlyFavorites}
          disabled={count === 0}
        />
        <Label
          htmlFor="only-favorites"
          className="text-sm"
        >
          Afficher seulement les favoris
        </Label>
      </div>
      <div className="h-[600px] w-full overflow-hidden rounded-md border border-border">
        <Map
          ref={mapRef}
          styles={{ light: IGN_STYLE, dark: IGN_STYLE }}
          center={[ center.lng, center.lat ]}
          zoom={13}
          minZoom={10}
          maxZoom={18}
          cooperativeGestures
          attributionControl={{ compact: true, customAttribution: '© IGN — Géoplateforme' }}
        >
          <LockBearing />
          <MapControls position="bottom-right" showZoom />
          {
            visibleMarkers.map(
              (marker) => {
                return (
                  <MapMarker
                    key={marker.id}
                    longitude={marker.position.lng}
                    latitude={marker.position.lat}
                    anchor="bottom"
                  >
                    <MarkerContent>
                      <MapPin
                        aria-label={marker.event.name ?? 'Événement sans nom'}
                        className={cn(
                          'size-8 drop-shadow-md',
                          isFavorite(marker.id) ? 'text-amber-400' : 'text-red-600',
                        )}
                        fill="currentColor"
                        stroke="#ffffff"
                        strokeWidth={1.5}
                      />
                    </MarkerContent>
                    <MarkerPopup
                      open={selectedId === marker.id}
                      onOpenChange={
                        (isOpen: boolean): void => {
                          setSelectedId(
                            (previous) => isOpen ? marker.id : previous === marker.id ? null : previous,
                          );
                        }
                      }
                      closeButton
                      anchor="bottom"
                      offset={40}
                      className="max-w-[85vw] overflow-y-auto sm:max-w-80 max-h-[320px] sm:max-h-[360px]"
                    >
                      <EventInfoWindow markerInfo={marker} />
                    </MarkerPopup>
                  </MapMarker>
                );
              }
            )
          }
        </Map>
      </div>
      <p className="text-muted-foreground mt-2 text-xs">
        Géocodage : Base Adresse Nationale (IGN Géoplateforme) · Fond de carte : IGN
      </p>
    </div>
  );
};

/* Export EventsMap component -------------------------- */
export default EventsMap;
```

- [ ] **Step 2: Typecheck + lint + build**

Run: `pnpm tsc:ci && pnpm exec eslint src/components/EventsMap/EventsMap.tsx && pnpm build`
Expected: all pass (`MapPopup` is now unused in `EventsMap` but still exported from `ui/map.tsx` — that is fine, not an error).

- [ ] **Step 3: Commit**

```bash
git add src/components/EventsMap/EventsMap.tsx
git commit -m "fix(map): controlled per-marker MarkerPopup so taps open on touch"
```

---

### Task 3: Full verification (incl. touch emulation)

**Files:** none (verification only).

- [ ] **Step 1: Full gates**

Run: `pnpm tsc:ci && pnpm exec eslint src/ && pnpm build`
Expected: tsc + build pass; eslint reports only the pre-existing `src/components/ui/map.tsx` `react-hooks/refs` errors — no new errors in `EventsMap.tsx` or `map.tsx`.

- [ ] **Step 2: Runtime — touch (the regression)**

With the dev server running, open `/2026` in a **touch-emulated** context (Playwright launched/emulated with `hasTouch: true`, or Chrome devtools device mode). **Tap** a marker → its popup opens. This is the bug being fixed; it must pass under touch emulation, not just mouse.

- [ ] **Step 3: Runtime — desktop + feature parity**

- Mouse-click a marker on desktop → popup opens.
- Only one popup open at a time: open marker A, then tap/click marker B → A closes, B open (no stacking).
- Close button closes the popup.
- Expand a list event with coords → "Voir sur la carte" → scrolls to the map and opens that event's popup at its marker.
- Popup looks identical to before (same size/position/close button).
- 0 console errors; no hydration warning.

---

## Self-Review notes

- **Spec coverage:** controlled props on `MarkerPopup` → Task 1; keep `setPopup` + maplibre open/close sync + reconcile guards → Task 1; `selectedId` + per-marker controlled popup + visual-parity props → Task 2; recenter via selection effect (off DOM click) → Task 2; focus effect sets `selectedId` + clears `onlyFavorites` → Task 2; single-popup `onOpenChange` guard → Task 2; touch-emulation verification → Task 3.
- **Type consistency:** `open?: boolean` / `onOpenChange?: (open: boolean) => void` defined in Task 1, consumed in Task 2; `selectedId: string | null` consistent across the selection effect, focus effect, and `MarkerPopup` `open`/`onOpenChange`; `MarkerInfo`/`MapFocusTarget` unchanged.
- **No placeholders:** full code in every code step.
- **Style split called out:** Task 1 edits the shadcn-style `ui/map.tsx` (double quotes, space-after-`if`, no explicit return types); Task 2 edits strict-style `EventsMap.tsx`. The Global Constraints make this explicit so a reviewer doesn't flag the intended style difference.
