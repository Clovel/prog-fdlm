# "Voir sur la carte" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Voir sur la carte" button to each list event that scrolls up to the map section and opens that event's marker popup.

**Architecture:** A new typed window-CustomEvent bridge (`mapFocus.ts`, mirror of `eventFocus.ts`) carries the event id list→map. The map section keeps `EventsMap` mounted across collapse (`forceMount` + CSS hide) and resizes on reveal. `EventsMap` is refactored to a single controlled `MapPopup` driven by `selectedEvent` state — both marker clicks and focus events set it — so the popup is visually identical to today and never stacks.

**Tech Stack:** Next.js App Router (React 19, client components), TypeScript, Tailwind v4, shadcn/ui `Button`, maplibre via `components/ui/map.tsx`, `lucide-react`.

## Global Constraints

- **No test framework.** Verification is `pnpm tsc:ci`, `pnpm exec eslint <files>`, `pnpm build`, plus runtime/visual checks. Never claim a unit test was added.
- **Component conventions:** comment-banner layout, `React.FC<Props>` default-exported, `<Name>Props` interface above the component, `import type` for type-only imports.
- **ESLint:** 2-space indent, single quotes JS / double JSX, semicolons, always-multiline trailing commas, **no space after `if`** (`if(x)`), `@typescript-eslint/strict-boolean-expressions` (use `!== undefined`/`!== null`/`.length > 0`, never truthiness), explicit return types incl. handlers (`(): void =>`), `prefer-template`. `react-hooks/set-state-in-effect` only flags *synchronous* setState in an effect body — setState inside an event-listener or `setTimeout` callback is fine.
- **French copy:** the button label is exactly **"Voir sur la carte"**.
- **Visual parity (critical):** the focus `MapPopup` must use the same props the current `MarkerPopup` uses — `closeButton`, `anchor="bottom"`, `offset={40}`, `className="max-w-[85vw] overflow-y-auto sm:max-w-80 max-h-[320px] sm:max-h-[360px]"` — so it looks identical to the click popup.
- **Path aliases** (`*` → `./src/*`): import `helpers/...`, `components/...`, `types/...`, `lib/utils`.
- The DOM `Event` type is shadowed in component files by `import type { Event } from 'types/Event'`; use `globalThis.Event` for window-listener params and `CustomEvent` (not shadowed) for detail access.

---

### Task 1: `mapFocus.ts` bridge

**Files:**
- Create: `src/helpers/mapFocus.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `FOCUS_MAP_EVENT_NAME` (string literal `'fdlm:focus-map'`)
  - `interface FocusMapDetail { id: string }`
  - `dispatchFocusMap(id: string): void`
  - `isFocusMapEvent(event: globalThis.Event): event is CustomEvent<FocusMapDetail>`

- [ ] **Step 1: Write `src/helpers/mapFocus.ts`**

```ts
// Bridge that lets a list event ("Voir sur la carte") ask the map section to
// reveal its marker. Mirror of helpers/eventFocus.ts in the opposite direction
// (list -> map). A typed window CustomEvent crosses the two sibling subtrees;
// keyed on the event UUID.

/* Constants ------------------------------------------- */
export const FOCUS_MAP_EVENT_NAME = 'fdlm:focus-map' as const;

/* Type declarations ----------------------------------- */
export interface FocusMapDetail {
  id: string;
}

/* Dispatch -------------------------------------------- */
export const dispatchFocusMap = (id: string): void => {
  window.dispatchEvent(
    new CustomEvent<FocusMapDetail>(FOCUS_MAP_EVENT_NAME, { detail: { id } }),
  );
};

/* Type guard ------------------------------------------ */
export const isFocusMapEvent = (
  event: globalThis.Event,
): event is CustomEvent<FocusMapDetail> => {
  return (
    event instanceof CustomEvent &&
    event.type === FOCUS_MAP_EVENT_NAME
  );
};
```

- [ ] **Step 2: Typecheck + lint**

Run: `pnpm tsc:ci && pnpm exec eslint src/helpers/mapFocus.ts`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/helpers/mapFocus.ts
git commit -m "feat(map): mapFocus bridge (list -> map focus event)"
```

---

### Task 2: EventsMap — single controlled popup + focus props

**Files:**
- Modify: `src/components/EventsMap/EventsMap.tsx` (full rewrite below)

**Interfaces:**
- Consumes: `MarkerInfo` (existing, has `isFavorite`); `MapPopup`/`useMap`/`Map`/`MapControls`/`MapMarker`/`MarkerContent` from `components/ui/map`.
- Produces:
  - `export interface MapFocusTarget { id: string; nonce: number }`
  - `EventsMap` props now `{ eventMarkers: MarkerInfo[]; expanded: boolean; focusTarget: MapFocusTarget | null }`.
  - `MarkerInfo` export unchanged.

This replaces the per-marker `MarkerPopup` with one controlled `MapPopup` driven by `selectedEvent` state. Marker clicks toggle it; a `focusTarget` change opens it (clearing the favorites filter and recentering); an `expanded` false→true transition resizes the map.

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
  MapPopup,
  MarkerContent,
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
  const [ selectedEvent, setSelectedEvent ] = useState<MarkerInfo | null>(null);
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

  // A focus request (from a list event's "Voir sur la carte") opens that
  // event's popup. Clear the favorites filter first so the target marker is
  // visible, then select + recenter. No-op if the id has no marker.
  useEffect(
    (): void => {
      if(focusTarget === null) {
        return;
      }
      const target = eventMarkers.find((marker) => marker.id === focusTarget.id);
      if(target === undefined) {
        return;
      }
      setOnlyFavorites(false);
      setSelectedEvent(target);
      recenterOn(target.position.lng, target.position.lat);
    },
    [
      focusTarget,
      eventMarkers,
      recenterOn,
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
                    onClick={
                      (): void => {
                        const willOpen: boolean = selectedEvent?.id !== marker.id;
                        setSelectedEvent(willOpen ? marker : null);
                        if(willOpen) {
                          recenterOn(marker.position.lng, marker.position.lat);
                        }
                      }
                    }
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
                  </MapMarker>
                );
              }
            )
          }
          {
            selectedEvent !== null &&
              <MapPopup
                longitude={selectedEvent.position.lng}
                latitude={selectedEvent.position.lat}
                closeButton
                anchor="bottom"
                offset={40}
                className="max-w-[85vw] overflow-y-auto sm:max-w-80 max-h-[320px] sm:max-h-[360px]"
                onClose={(): void => setSelectedEvent(null)}
              >
                <EventInfoWindow markerInfo={selectedEvent} />
              </MapPopup>
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

- [ ] **Step 2: Typecheck + lint**

Run: `pnpm tsc:ci && pnpm exec eslint src/components/EventsMap/EventsMap.tsx`
Expected: no errors. (`EventsMapSection` still passes only `eventMarkers` at this point, so `tsc` will report missing `expanded`/`focusTarget` props at the `EventsMap` usage in `EventsMapSection.tsx` — that call site is updated in Task 3. If `tsc:ci` fails *only* with that error at `EventsMapSection.tsx`, it is expected; eslint on this file must still be clean.)

- [ ] **Step 3: Commit**

```bash
git add src/components/EventsMap/EventsMap.tsx
git commit -m "refactor(map): single controlled MapPopup + expanded/focusTarget props"
```

---

### Task 3: EventsMapSection — keep map mounted + focus listener

**Files:**
- Modify: `src/components/EventsMapSection/EventsMapSection.tsx`

**Interfaces:**
- Consumes: `FOCUS_MAP_EVENT_NAME`, `isFocusMapEvent` from `helpers/mapFocus` (Task 1); `MapFocusTarget` from `components/EventsMap/EventsMap` (Task 2); existing `EventsMap` props `expanded`/`focusTarget`.
- Produces: passes `expanded`/`focusTarget` to `EventsMap`; keeps the map mounted across collapse.

- [ ] **Step 1: Update imports**

Replace the framework + module + type import groups at the top so they read:

```tsx
/* Framework imports ----------------------------------- */
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import dynamic from 'next/dynamic';

/* Module imports -------------------------------------- */
import { cn } from 'lib/utils';
import { useFavorites } from 'components/Favorites/FavoritesProvider';
import { FOCUS_MAP_EVENT_NAME, isFocusMapEvent } from 'helpers/mapFocus';

/* Component imports ----------------------------------- */
import { ChevronDown } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from 'components/ui/collapsible';

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';
import type { MapFocusTarget, MarkerInfo } from 'components/EventsMap/EventsMap';
```

- [ ] **Step 2: Add the section ref, focus state, and listener**

Inside the component body, replace the line `const [ open, setOpen ] = useState<boolean>(true);` with:

```tsx
  const [ open, setOpen ] = useState<boolean>(true);
  const [ focusTarget, setFocusTarget ] = useState<MapFocusTarget | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const nonceRef = useRef<number>(0);

  // A list event's "Voir sur la carte" broadcasts its id. Expand the section,
  // scroll it into view, and hand the id (with a bumped nonce so re-clicks
  // re-trigger) to EventsMap, which opens the marker popup.
  useEffect(
    () => {
      const handleFocusMap = (event: globalThis.Event): void => {
        if(!isFocusMapEvent(event)) {
          return;
        }
        setOpen(true);
        nonceRef.current += 1;
        setFocusTarget({ id: event.detail.id, nonce: nonceRef.current });
        sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };

      window.addEventListener(FOCUS_MAP_EVENT_NAME, handleFocusMap);
      return (): void => {
        window.removeEventListener(FOCUS_MAP_EVENT_NAME, handleFocusMap);
      };
    },
    [],
  );
```

- [ ] **Step 3: Attach the ref, keep the map mounted, pass the new props**

Change the `<section ...>` opening tag to attach the ref:

```tsx
    <section ref={sectionRef} className="w-full max-w-5xl px-4 g:py-8 mx-auto lg:px-0">
```

Replace the `<CollapsibleContent>` block (the one wrapping `<EventsMap .../>`) with:

```tsx
        <CollapsibleContent forceMount className="data-[state=closed]:hidden">
          <EventsMap
            eventMarkers={eventMarkers}
            expanded={open}
            focusTarget={focusTarget}
          />
        </CollapsibleContent>
```

- [ ] **Step 4: Typecheck + lint**

Run: `pnpm tsc:ci && pnpm exec eslint src/components/EventsMapSection/EventsMapSection.tsx src/components/EventsMap/EventsMap.tsx`
Expected: no errors (the Task 2 cross-file error is now resolved).

- [ ] **Step 5: Commit**

```bash
git add src/components/EventsMapSection/EventsMapSection.tsx
git commit -m "feat(map): keep map mounted across collapse + focus-map listener"
```

---

### Task 4: EventRender — "Voir sur la carte" button

**Files:**
- Modify: `src/components/EventRender/EventRender.tsx`

**Interfaces:**
- Consumes: `dispatchFocusMap` from `helpers/mapFocus` (Task 1); `Button` from `components/ui/button`; `MapPinned` from `lucide-react`.
- Produces: a button rendered only when `event.location.coords !== undefined`.

- [ ] **Step 1: Add imports**

In the Module imports group add `dispatchFocusMap`, and in the Component imports group add `Button` and the `MapPinned` icon:

```tsx
/* Module imports -------------------------------------- */
import { dispatchFocusMap } from 'helpers/mapFocus';

/* Component imports ----------------------------------- */
import { MapPinned } from 'lucide-react';
import { Button } from 'components/ui/button';
import CustomEmbed from 'components/CustomEmbed/CustomEmbed';
import DescriptionRender from 'components/DescriptionRender/DescriptionRender';
import EventAlert from 'components/EventAlert/EventAlert';
import MapsLink from 'components/MapsLink/MapsLink';
```

- [ ] **Step 2: Add the button after the MapsLink block**

Immediately after the existing `MapsLink` block (the `event.location.addressStr ... <MapsLink ... variant="button" />` block) and before the closing `</div>` of the `.event-description` wrapper, add:

```tsx
      {
        event.location.coords !== undefined &&
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={(): void => dispatchFocusMap(event.id)}
            >
              <MapPinned className="h-4 w-4" />
              Voir sur la carte
            </Button>
          </div>
      }
```

- [ ] **Step 3: Typecheck + lint**

Run: `pnpm tsc:ci && pnpm exec eslint src/components/EventRender/EventRender.tsx`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/EventRender/EventRender.tsx
git commit -m "feat(agenda): 'Voir sur la carte' button on events with coords"
```

---

### Task 5: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Full gates**

Run: `pnpm tsc:ci && pnpm exec eslint src/ && pnpm build`
Expected: tsc and build pass; eslint reports only the pre-existing `src/components/ui/map.tsx` `react-hooks/refs` errors (documented, not introduced here) — no new errors in `helpers/mapFocus.ts`, `EventsMap.tsx`, `EventsMapSection.tsx`, `EventRender.tsx`.

- [ ] **Step 2: Runtime check (dev server)**

Open an edition with events. Verify:
- Expand a list event that has an address/coords → a "Voir sur la carte" button (pin-on-map icon) shows at the bottom.
- Click it → the page scrolls up to the "Carte des events" section (expanding it if it was collapsed), the map fills its box, and that event's popup opens at its marker — **identical in appearance** to clicking the marker directly.
- Only one popup is ever open: clicking a marker, then "Voir sur la carte" for another event, replaces the popup (no stacking).
- Collapse then expand the map section a few times → the map does **not** reinitialise (no flash/reload) and still renders after expand.
- No console errors and no React hydration warning.

- [ ] **Step 3: Edge spot-checks**

- An event with no coords shows **no** "Voir sur la carte" button.
- With "Afficher seulement les favoris" on, focusing a non-favorite event clears the filter and still opens its popup.

---

## Self-Review notes

- **Spec coverage:** bridge → Task 1; keep-mounted + resize + listener → Tasks 2/3; unified controlled `MapPopup` (visual parity props) → Task 2; button gated on coords → Task 4; `onlyFavorites` cleared on focus, nonce re-trigger → Tasks 2/3; verification incl. no-reinit + single-popup → Task 5.
- **Type consistency:** `MapFocusTarget { id, nonce }` defined in Task 2, imported in Task 3; `FOCUS_MAP_EVENT_NAME`/`isFocusMapEvent`/`dispatchFocusMap`/`FocusMapDetail` defined in Task 1, used in Tasks 3/4; `MarkerInfo` unchanged (keeps `isFavorite`); `selectedEvent: MarkerInfo | null` consistent with `EventInfoWindow`'s `markerInfo` prop.
- **No placeholders:** every code step shows full code.
- **Cross-file tsc note:** Task 2 leaves a transient type error at the `EventsMapSection` call site (missing `expanded`/`focusTarget`), resolved in Task 3 — called out in Task 2 Step 2 so the reviewer doesn't treat it as a regression.
