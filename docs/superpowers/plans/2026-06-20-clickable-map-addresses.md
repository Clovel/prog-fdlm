# Clickable Map Addresses Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make event addresses clickable OS-native maps deeplinks — an inline link in the header and an explicit "Voir l'itinéraire" button at the bottom of the collapsible.

**Architecture:** A platform-detect helper builds per-OS maps URLs (Apple Plans on iOS, `geo:` chooser on Android, Google Maps web elsewhere). A shared `MapsLink` component renders an `<a>` whose `href` is always the universal Google Maps URL (SSR-stable, no-JS fallback) and intercepts clicks to redirect to the native target. The address is lifted out of the collapsible-trigger `<button>` and rendered as a sibling link to stay a11y-correct.

**Tech Stack:** Next.js App Router (React 19, `'use client'`), TypeScript, Tailwind v4, shadcn/ui `Button`, `lucide-react` icons.

## Global Constraints

- **No test framework.** Verification is `pnpm tsc:ci`, `pnpm lint` (scope to `src/`: `pnpm exec eslint src/...`), `pnpm build`, plus runtime/visual checks. Never claim a unit test was added.
- **Component conventions (mandatory):** comment-banner layout, `React.FC<Props>` default-exported, `<Name>Props` interface above the component, `import type` for type-only imports.
- **ESLint gotchas:** 2-space indent, single quotes in JS / double in JSX, semicolons, always-multiline trailing commas. **No space after `if`** (`if(x)`). `@typescript-eslint/strict-boolean-expressions` is error — write `addressStr !== undefined && addressStr.length > 0`, never `if(addressStr)`. `@typescript-eslint/explicit-function-return-type` warn — annotate return types incl. handlers (`(): void => {}`). `prefer-template` — no `+` string concat.
- **Theme tokens only** — no raw color names except where the codebase already uses them; match the existing link style `text-blue-600 dark:text-blue-400 underline underline-offset-4` from `EventRender`.
- **French copy.** Button label is exactly **"Voir l'itinéraire"**.
- **Path aliases** (`*` → `./src/*`): import `components/...`, `helpers/...`, `types/...`, `lib/utils`.

---

### Task 1: Maps URL helpers

**Files:**
- Create: `src/helpers/mapsUrl.ts`

**Interfaces:**
- Consumes: `Location` from `types/Location`.
- Produces:
  - `type MapsPlatform = 'ios' | 'android' | 'other'`
  - `getMapsPlatform(): MapsPlatform` — client-only; `'other'` when `navigator` is undefined.
  - `buildMapsQuery(location: Location): string` — `[name, addressStr]` present-filtered, joined with `', '`.
  - `buildMapsUrl(query: string, platform: MapsPlatform): string`.

- [ ] **Step 1: Write `src/helpers/mapsUrl.ts`**

```ts
/* Type imports ---------------------------------------- */
import type { Location } from 'types/Location';

/* Types ----------------------------------------------- */
export type MapsPlatform = 'ios' | 'android' | 'other';

/* Helpers --------------------------------------------- */
/**
 * Detects the platform from the user agent so we can pick the native maps
 * target. Client-only: returns 'other' during SSR (no `navigator`), which
 * keeps the rendered href stable across hydration.
 */
export const getMapsPlatform = (): MapsPlatform => {
  if(typeof navigator === 'undefined') return 'other';

  const ua: string = navigator.userAgent;

  if(/iPad|iPhone|iPod/.test(ua)) return 'ios';
  // iPadOS 13+ reports as desktop Macintosh but is touch-capable.
  if(/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return 'ios';
  if(/Android/.test(ua)) return 'android';

  return 'other';
};

/** Builds the maps search string from the venue name + address. */
export const buildMapsQuery = (location: Location): string => {
  const parts: string[] = [];

  if(location.name.length > 0) parts.push(location.name);
  if(location.addressStr !== undefined && location.addressStr.length > 0) {
    parts.push(location.addressStr);
  }

  return parts.join(', ');
};

/** Builds the per-platform maps URL for an already-built query string. */
export const buildMapsUrl = (query: string, platform: MapsPlatform): string => {
  const encoded: string = encodeURIComponent(query);

  switch(platform) {
    case 'ios':
      return `https://maps.apple.com/?q=${encoded}`;
    case 'android':
      return `geo:0,0?q=${encoded}`;
    default:
      return `https://www.google.com/maps/search/?api=1&query=${encoded}`;
  }
};
```

- [ ] **Step 2: Typecheck + lint**

Run: `pnpm tsc:ci && pnpm exec eslint src/helpers/mapsUrl.ts`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/helpers/mapsUrl.ts
git commit -m "feat(maps): platform-detect maps URL helpers"
```

---

### Task 2: MapsLink component

**Files:**
- Create: `src/components/MapsLink/MapsLink.tsx`

**Interfaces:**
- Consumes: `getMapsPlatform`, `buildMapsQuery`, `buildMapsUrl` from `helpers/mapsUrl`; `Location` from `types/Location`; `Button` from `components/ui/button`; `MapPin` from `lucide-react`; `cn` from `lib/utils`.
- Produces: default-exported `MapsLink: React.FC<MapsLinkProps>` where `MapsLinkProps = { location: Location; variant: 'inline' | 'button' }`. Renders `null` when the query is empty.

- [ ] **Step 1: Write `src/components/MapsLink/MapsLink.tsx`**

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports -------------------------------------- */
import { cn } from 'lib/utils';
import {
  buildMapsQuery,
  buildMapsUrl,
  getMapsPlatform,
} from 'helpers/mapsUrl';

/* Component imports ----------------------------------- */
import { MapPin } from 'lucide-react';
import { Button } from 'components/ui/button';

/* Type imports ---------------------------------------- */
import type { Location } from 'types/Location';

/* MapsLink component prop types ----------------------- */
interface MapsLinkProps {
  location: Location;
  variant: 'inline' | 'button';
}

/* MapsLink component ---------------------------------- */
const MapsLink: React.FC<MapsLinkProps> = (
  {
    location,
    variant,
  },
) => {
  const query: string = buildMapsQuery(location);

  if(query.length === 0) return null;

  // href is ALWAYS the universal Google Maps URL: identical on server and
  // client (no hydration mismatch) and a working no-JS fallback. The native
  // redirect happens on click, when `navigator` is available.
  const href: string = buildMapsUrl(query, 'other');

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>): void => {
    const platform = getMapsPlatform();

    if(platform === 'other') return; // let the https link open in a new tab

    event.preventDefault();
    window.location.href = buildMapsUrl(query, platform);
  };

  if(variant === 'button') {
    return (
      <div className="mt-4">
        <Button
          asChild
          variant="outline"
          size="sm"
        >
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
          >
            <MapPin className="h-4 w-4" />
            Voir l&apos;itinéraire
          </a>
        </Button>
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={
        cn(
          'inline-flex items-start gap-1 text-sm',
          'text-blue-600 dark:text-blue-400 underline underline-offset-4',
        )
      }
    >
      <MapPin className="h-4 w-4 shrink-0 translate-y-0.5" />
      <span>
        {location.addressStr}
      </span>
    </a>
  );
};

/* Export MapsLink component --------------------------- */
export default MapsLink;
```

- [ ] **Step 2: Typecheck + lint**

Run: `pnpm tsc:ci && pnpm exec eslint src/components/MapsLink/MapsLink.tsx`
Expected: no errors. (If lint flags the `handleClick` arrow return type, it is already annotated `: void`; mirror neighbouring handlers if any other rule fires.)

- [ ] **Step 3: Commit**

```bash
git add src/components/MapsLink/MapsLink.tsx
git commit -m "feat(maps): MapsLink component (inline + button variants)"
```

---

### Task 3: Remove address from EventTitleBlock

**Files:**
- Modify: `src/components/EventTitleBlock/EventTitleBlock.tsx:57-74`

**Interfaces:**
- Consumes: nothing new.
- Produces: `EventTitleBlock` no longer renders `location.addressStr`. Venue name (shown when `event.name !== undefined`), genres, artists, price are unchanged.

- [ ] **Step 1: Edit the detail-line block**

Replace the venue-name `<span>` + address `<span>` (current lines 57-74) with only the venue-name span — delete the address span entirely:

```tsx
      <div className="text-sm">
        <span className="font-semibold">
          {
            event.name !== undefined &&
                event.location.name
          }
        </span>
        {
          event.genres !== undefined &&
```

(Everything from the genres block downward stays as-is.)

- [ ] **Step 2: Typecheck + lint**

Run: `pnpm tsc:ci && pnpm exec eslint src/components/EventTitleBlock/EventTitleBlock.tsx`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/EventTitleBlock/EventTitleBlock.tsx
git commit -m "refactor(agenda): drop address from EventTitleBlock (moves to MapsLink)"
```

---

### Task 4: Inline address link in EventListItem

**Files:**
- Modify: `src/components/EventList/EventListItem.tsx:18-19` (imports), `:76-88` (trigger wrapping)

**Interfaces:**
- Consumes: `MapsLink` from `components/MapsLink/MapsLink`.
- Produces: the address renders as a sibling `<a>` beneath the collapsible trigger, never nested in the trigger `<button>`.

- [ ] **Step 1: Add the import**

After the `EventTitleBlock` import line, add:

```tsx
import MapsLink from 'components/MapsLink/MapsLink';
```

- [ ] **Step 2: Wrap the trigger + add the inline link**

Replace the `CollapsibleTrigger` block (current lines 76-88) so it is wrapped in a `flex-col` column with the link as a sibling:

```tsx
          <div className="flex flex-1 min-w-0 flex-col gap-1">
            <CollapsibleTrigger asChild disabled={!collapsiblePresent}>
              <button
                type="button"
                className={
                  cn(
                    'min-w-0 -mx-2 px-2 py-1 text-left rounded-md text-foreground',
                    collapsiblePresent ? 'cursor-pointer' : 'cursor-default',
                  )
                }
              >
                <EventTitleBlock event={event} />
              </button>
            </CollapsibleTrigger>
            {
              event.location.addressStr !== undefined &&
              event.location.addressStr.length > 0 &&
                <div className="-mx-2 px-2">
                  <MapsLink location={event.location} variant="inline" />
                </div>
            }
          </div>
```

Note: `flex-1 min-w-0` moves from the inner `button` to the new wrapper `div`; the button keeps the rest of its classes.

- [ ] **Step 3: Typecheck + lint**

Run: `pnpm tsc:ci && pnpm exec eslint src/components/EventList/EventListItem.tsx`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/EventList/EventListItem.tsx
git commit -m "feat(agenda): clickable inline address link under event title"
```

---

### Task 5: Explicit "Voir l'itinéraire" button in EventRender

**Files:**
- Modify: `src/components/EventRender/EventRender.tsx:7-9` (imports), `:100-101` (after the links article)

**Interfaces:**
- Consumes: `MapsLink` from `components/MapsLink/MapsLink`.
- Produces: a `variant="button"` `MapsLink` rendered at the end of the collapsible content when `addressStr` is present.

- [ ] **Step 1: Add the import**

In the component-imports banner, add:

```tsx
import MapsLink from 'components/MapsLink/MapsLink';
```

- [ ] **Step 2: Render the button before the closing wrapper `</div>`**

After the links `<article>` (the closing `}` of the `event.links` block, current line ~100) and before the closing `</div>`, add:

```tsx
      {
        event.location.addressStr !== undefined &&
        event.location.addressStr.length > 0 &&
          <MapsLink location={event.location} variant="button" />
      }
```

- [ ] **Step 3: Typecheck + lint**

Run: `pnpm tsc:ci && pnpm exec eslint src/components/EventRender/EventRender.tsx`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/EventRender/EventRender.tsx
git commit -m "feat(agenda): Voir l'itineraire button in collapsible detail"
```

---

### Task 6: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Full gates**

Run: `pnpm tsc:ci && pnpm exec eslint src/ && pnpm build`
Expected: all pass. (Use `eslint src/` not `pnpm lint` to avoid the stray-worktree `.next` noise documented in CLAUDE.md.)

- [ ] **Step 2: Runtime check**

Run `pnpm dev`, open an edition with events that have addresses. Verify:
- The address shows as an underlined link with a pin icon beneath each event title.
- An event with a collapsible (description/links/etc.) shows the "Voir l'itinéraire" button at the bottom when expanded.
- Desktop click opens Google Maps in a new tab.
- View source / inspect the SSR HTML: the address `href` is the `https://www.google.com/maps/...` URL, and there is **no React hydration warning** in the console.

- [ ] **Step 3: Mobile branch spot-check (optional but recommended)**

In devtools, spoof an iPhone UA and confirm clicking redirects to `https://maps.apple.com/?q=...`; spoof Android and confirm `geo:0,0?q=...`.

---

## Self-Review notes

- **Spec coverage:** deeplink strategy → Task 1; hydration safety → Task 2 (`href` fixed to Google, click redirect); `MapsLink` → Task 2; EventTitleBlock edit → Task 3; inline sibling link → Task 4; explicit button → Task 5; verification → Task 6. All spec sections covered.
- **No placeholders:** every code step shows full code.
- **Type consistency:** `getMapsPlatform`/`buildMapsQuery`/`buildMapsUrl`/`MapsPlatform` used identically in Tasks 1–2; `MapsLink` props `{ location, variant }` consistent across Tasks 2/4/5.
