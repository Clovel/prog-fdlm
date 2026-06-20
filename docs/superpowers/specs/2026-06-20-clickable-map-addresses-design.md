# Clickable map addresses (OS-native deeplinks)

**Date:** 2026-06-20
**Status:** Approved design, pending implementation plan

## Goal

Make an event's address open the user's maps app. Two surfaces:

1. The **always-visible address** in the event header becomes a clickable link.
2. A **more explicit button** ("Voir l'itinéraire") at the bottom of the
   collapsible event detail, shown when the event has an address.

Both leverage the OS's native way of opening maps (Apple Plans on iOS, the
Android maps chooser, Google Maps web on desktop), and degrade gracefully in
any browser.

## Deeplink strategy: platform-detect

A single `https` Google Maps URL never opens Apple Plans, and `geo:` only works
on Android. So we detect the platform and pick the native target:

| Platform     | URL                                                          | Result                                  |
| ------------ | ------------------------------------------------------------ | --------------------------------------- |
| iOS / macOS  | `https://maps.apple.com/?q=<query>`                          | Apple Plans                             |
| Android      | `geo:0,0?q=<query>`                                          | OS app chooser / default maps app       |
| other (desktop) | `https://www.google.com/maps/search/?api=1&query=<query>` | Google Maps web (new tab)               |

`<query>` is `[location.name, location.addressStr]` filtered for presence,
joined with `, `, and URL-encoded. Including the venue name helps the maps app
resolve the specific place rather than just the street.

**Accepted limitation:** iOS has no system-level maps chooser, so an iOS user
who prefers Google Maps still gets Apple Plans. This affects a minority; a
per-app picker is out of scope (YAGNI). If it ever matters, the explicit button
is the natural place to add a second option.

## Hydration safety

Platform detection reads `navigator`, which is unavailable during SSR. Rendering
a platform-specific `href` on the client would mismatch the server HTML (same
class of bug as the prior `EventTime` hydration fix). Therefore:

- The rendered `href` is **always** the universal Google Maps `https` URL —
  identical on server and client, works with JavaScript disabled, and already
  opens the Google Maps app on Android via Universal Links.
- An `onClick` handler performs the native redirect at click time, when
  `navigator` is available:
  - iOS / macOS → `event.preventDefault()` then `window.location.href = <appleMapsUrl>`.
  - Android → `event.preventDefault()` then `window.location.href = <geoUrl>` (OS chooser).
  - other → no interception; the `https` link opens in a new tab.

This yields: no hydration mismatch, a working link without JS, and native apps
on mobile.

## Components & files

### `src/helpers/mapsUrl.ts` (new)

- `getMapsPlatform(): 'ios' | 'android' | 'other'` — derives the platform from
  `navigator.userAgent` / `navigator.platform`. Client-only; returns `'other'`
  if `navigator` is undefined.
- `buildMapsQuery(location): string` — joins `[name, addressStr]` (present ones)
  with `, `.
- `buildMapsUrl(query, platform): string` — builds the per-platform URL above.

### `src/components/MapsLink/MapsLink.tsx` (new)

`React.FC<MapsLinkProps>`, default export, following the repo comment-banner and
typing conventions.

Props:

```ts
interface MapsLinkProps {
  location: Location; // needs name + addressStr
  variant: 'inline' | 'button';
}
```

Behaviour:

- Computes `query = buildMapsQuery(location)`; renders nothing if the query is
  empty (no address).
- Renders an `<a>` whose `href` is the universal Google Maps URL
  (`buildMapsUrl(query, 'other')`), with `target="_blank"` and
  `rel="noopener noreferrer"`.
- `onClick` handler (typed `(event: React.MouseEvent<HTMLAnchorElement>): void`)
  reads `getMapsPlatform()` and redirects per the hydration-safety rules above.
  Wrapped so the arrow returns `void`.
- `variant="inline"` → `MapPin` icon + address text, underlined link styling
  (`text-blue-600 dark:text-blue-400 underline underline-offset-4`, matching the
  existing links list in `EventRender`).
- `variant="button"` → shadcn `Button` (`asChild`) wrapping the `<a>`, with a
  `MapPin` icon and the label **"Voir l'itinéraire"**.

### `src/components/EventTitleBlock/EventTitleBlock.tsx` (edit)

Remove the address rendering from the detail line (the `, ` separator + the
`addressStr` span). Keep venue name, genres, artists, price. The address now
renders as a sibling `MapsLink` in `EventListItem` (see next).

### `src/components/EventList/EventListItem.tsx` (edit)

The address must not be a nested interactive element inside the
`CollapsibleTrigger` `<button>` (the file's existing comment establishes that
interactive controls are siblings of the trigger, not children). So:

- Wrap the `CollapsibleTrigger` in a `flex flex-col min-w-0 flex-1` container.
- After the trigger, render `<MapsLink location={event.location} variant="inline" />`
  as a sibling (it self-hides when there's no address).

Net visual change: the address moves to its own line beneath the title — a real,
keyboard-focusable link.

### `src/components/EventRender/EventRender.tsx` (edit)

After the links `<article>`, when `event.location.addressStr` is present, render
`<MapsLink location={event.location} variant="button" />`.

Note: the collapsible only exists when `hasExpandableContent` is true
(description/links/embeds/alerts). Address-only events have no collapsible but
still show the inline link, so nothing is lost. `hasExpandableContent` is **not**
changed to include address — out of scope.

## Out of scope

- Per-app chooser on iOS.
- Using `location.coords` (geocoded client-side in the map; not reliably present
  on the event DTO here). We query by name + address string.
- Making address presence expand the collapsible.

## Verification

- `pnpm tsc:ci`, `pnpm lint` (scoped to `src/`), `pnpm build`.
- Runtime check on a running dev server: inline link and explicit button render,
  desktop click opens Google Maps in a new tab, and the rendered `href` is the
  Google Maps URL on both server-rendered HTML and after hydration (no console
  hydration warning).
- Manual mobile spot-check (or UA spoof) that the iOS/Android branches fire the
  Apple Plans / `geo:` redirect.
