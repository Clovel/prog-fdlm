# Migrate EventsMap from Google Maps to mapcn (MapLibre) + IGN Géoplateforme

**Date:** 2026-06-10
**Type:** Implementation plan
**Scope:** `src/components/EventsMap/` + the public-page map gate + dependency swap.

## Why

Google Maps is billed per map load (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`), exposing
a festival-day cost/quota risk and a client-exposed key to police. MapLibre GL +
IGN Géoplateforme vector tiles are **keyless, free, and same-provider as our
geocoder**. mapcn (MIT, MapLibre, shadcn-style) fits the repo's shadcn/Tailwind/
next-themes stack.

Compatibility verified end-to-end:
- IGN style `https://data.geopf.fr/annexes/ressources/vectorTiles/styles/PLAN.IGN/standard.json`
  is MapLibre style-spec **v8**, vector source → `…/tms/1.0.0/PLAN.IGN/{z}/{x}/{y}.pbf`
  (HTTP 200, `application/x-protobuf`), glyphs + sprite on `data.geopf.fr`, keyless.
- mapcn base `Map` (`src/registry/map.tsx`) is `"use client"`, built directly on
  `maplibre-gl`, MIT, exposes `styles?: { light?; dark?: string | StyleSpecification }`,
  and switches by `next-themes` `resolvedTheme`.

## Locked decisions

- **Dark map:** parity — feed the IGN light style for BOTH themes (map stays light
  like today; the popup keeps respecting dark mode via Tailwind `dark:`). No dark
  map style for now.
- **Satellite/map-type control:** dropped. Single IGN plan basemap, no layer switcher.

## Parity mapping (current → target)

| Current (Google) | Target (mapcn + IGN) |
| --- | --- |
| `useJsApiLoader` + API key | keyless IGN style URL; remove env gate |
| `GoogleMap` center `{44.840912,-0.571377}` zoom 13, min 10 / max 18 | mapcn `<Map>` same center/zoom; min/max via `MapLibreGL.MapOptions` |
| `disableDefaultUI`, only zoom-ish | mapcn `MapControls` (zoom + locate) |
| default pin; favorites = amber circle `#f59e0b` r9 white stroke | mapcn `MapMarker`/`MarkerContent` DOM marker; amber variant when `isFavorite` |
| `InfoWindow` → `EventInfoWindow` (name/address/links/description+Markdown) | mapcn `MarkerPopup` rendering the SAME `EventInfoWindow`; re-theme popup chrome for dark |
| POI labels hidden | IGN style carries its own labels (accept; optional layer filter later) |
| favorites `Switch` + `count` (`useFavorites`) | unchanged, reused |
| `@react-google-maps/api`, `@googlemaps/google-maps-services-js` (only `LatLngLiteral`) | remove both; add `maplibre-gl`; type → plain `{ lat:number; lng:number }` |
| gated on `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (`[year]/page.tsx:220-224`) | render unconditionally; drop key from `.env.example` + Vercel |

## Constants

```
IGN_STYLE = 'https://data.geopf.fr/annexes/ressources/vectorTiles/styles/PLAN.IGN/standard.json'
CENTER    = { lat: 44.840912, lng: -0.571377 }  // unchanged
ZOOM=13  MIN_ZOOM=10  MAX_ZOOM=18  HEIGHT=600px
FAVORITE_COLOR = '#f59e0b'
```

## Steps

1. **Add mapcn map component.** `npx mapcn add map` (or copy `registry/map.tsx`).
   Place under `src/components/ui/`. Fix imports to repo conventions: mapcn uses
   `@/lib/utils`; this repo imports `cn` from `lib/utils` (tsconfig `*`→`src/*`).
   Keep it exempt-friendly under `src/components/ui/` (ESLint relaxations apply).
2. **Add dep** `maplibre-gl` (pnpm, respect `pnpm@9.15.9`). Import its CSS once.
3. **Rewrite `EventsMap.tsx`** on mapcn primitives:
   - `<Map styles={{ light: IGN_STYLE, dark: IGN_STYLE }} center zoom minZoom maxZoom />`.
   - Markers from `eventMarkers` (logic unchanged); favorites → amber `MarkerContent`,
     others → neutral pin. Click sets `selectedMarker`.
   - `MarkerPopup` for `selectedMarker` rendering `<EventInfoWindow>` (reused as-is).
   - Keep the favorites `Switch`/`count` block and the "N marqueurs" line verbatim.
   - Replace `LatLngLiteral` type with a local `{ lat:number; lng:number }`.
   - Add `AttributionControl` / ensure IGN + OSM attribution is shown (legal).
4. **Popup dark mode.** Style the MapLibre popup container (white bg + tip) for
   `dark:` so it matches the prior InfoWindow fix (popup content already uses our
   Tailwind components).
5. **Un-gate the map** in `[year]/page.tsx`: render `<EventsMap events={viewEvents} />`
   unconditionally (drop the `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` check).
6. **Remove Google deps** `@react-google-maps/api`, `@googlemaps/google-maps-services-js`
   (confirmed only used for the `LatLngLiteral` type). Remove
   `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` from `.env.example` (and Vercel, manually).
7. **SSR guard.** mapcn is `"use client"`; if `maplibre-gl`'s import breaks the
   production build (window access), wrap the `<EventsMap>` usage in
   `next/dynamic(() => import(...), { ssr:false })`.
8. **Keep** the "Géocodage : Base Adresse Nationale" footnote.

## Verification

- `pnpm tsc:ci`, `pnpm exec eslint` on changed files, `pnpm build`.
- Dev server visual check: map renders without a key; markers appear; favorite
  markers are amber; clicking opens the popup with name/address/links/Markdown
  description; popup is readable in **dark mode**; favorites `Switch` filters; zoom
  controls work; IGN attribution visible.
- Confirm no residual references to the Google key or removed deps
  (`grep -rn "GOOGLE_MAPS\|react-google-maps\|google-maps-services"`).

## Commit plan (logical)

1. Add mapcn map component + `maplibre-gl` dep.
2. Rewrite `EventsMap` on MapLibre/IGN (markers, popup, attribution, favorites).
3. Un-gate the public map + remove Google deps/env key.

## Risks / notes

- IGN PLAN.IGN labels differ cosmetically from Google's POI-hidden look (accepted).
- IGN rate limit 50 req/s/IP applies to tiles too, but tiles are CDN-cached and
  per-visitor; not a concern at festival scale (unlike Google, no billing/quota).
- Bundle: `maplibre-gl` ~200 KB gzip, client-only; offset by dropping the Google
  loader. Acceptable.
- Out of scope: dark map tiles, IGN ortho/satellite layer, POI-label filtering.
