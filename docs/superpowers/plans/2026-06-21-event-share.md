# Event Share Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A "Partager" button that triggers the OS share sheet (or copies the link), and a shareable `?event=<id>` link that lands on the edition page, scrolls to + focuses the event, plus a per-event OpenGraph preview card.

**Architecture:** Part A reuses the existing `dispatchFocusEvent` focus mechanism: a client `ShareEventButton` builds the URL and shares/copies; the `?event=` param is read **server-side** in `page.tsx` and passed as a `focusEventId` prop into `EditionAgenda`, whose post-hydration effect relaxes only the hiding filters and dispatches focus. Part B adds a per-event OG image route + page-level `generateMetadata`.

**Tech Stack:** Next.js 16 App Router (RSC + client components), TypeScript, Tailwind, shadcn `Button`, `lucide-react`, `sonner`, Drizzle, `next/og` (Satori) for OG images.

## Global Constraints

- **No test framework.** Verification is `pnpm tsc:ci`, `pnpm exec eslint <files>`, `pnpm build`, plus runtime/`curl` checks. Never claim a unit test was added.
- **SSR / hydration safety (this app is hydration-sensitive):**
  - The share button must render **identical HTML on server and client** — do feature detection (`navigator.share`) **inside the onClick handler only**, never in JSX. One stable button labelled **"Partager"**.
  - Read `?event=` **on the server** (`page.tsx` `searchParams`) and pass it as a prop. Do **not** use `useSearchParams()`. The focus/filter-relax run in a post-hydration `useEffect`, so SSR HTML and first client render match.
- **Component conventions:** comment-banner layout, `React.FC<Props>` default export, `<Name>Props` interface above, `import type` for type-only imports, `'use client'` on client components.
- **ESLint (strict, except `ui/`):** 2-space indent, single quotes JS / double JSX, semicolons, always-multiline trailing commas, **no space after `if`** (`if(x)`), `strict-boolean-expressions` (`!== undefined`/`=== true`/`typeof x === 'function'`, never bare truthiness), explicit return types incl. handlers (`(): void =>`), `prefer-template`. `promise/*`: every chain ends in `.catch`; **wrap `toast.*` calls in a block-body void arrow** inside `.then`/`.catch` (toast returns a value). `react-hooks/set-state-in-effect`: synchronous `setState` in an effect body needs `// eslint-disable-line react-hooks/set-state-in-effect` (see the existing EventsMap focus effect).
- **French copy:** button label exactly **"Partager"**; clipboard success toast **"Lien copié"**.
- **Path aliases:** `components/...`, `helpers/...`, `db/...`, `lib/...`, `types/...`.
- **OG/Satori gotchas:** embed images as base64 data-URI `<img>` (no inline `<svg>`); load fonts via `fs.readFile(new URL('./fonts/...', import.meta.url))`; mirror `lib/shareCard/shareCard.tsx`.

---

### Task 1: `relaxFiltersToShow` helper

**Files:**
- Modify: `src/helpers/applyEventFilters.ts`

**Interfaces:**
- Consumes: existing `FilterState`, `eventMatchesFilters`, and the module-private `isPast`/`isInFestivalNight`; `Event` (already imported).
- Produces: `relaxFiltersToShow(event: Event, filters: FilterState, feteDeLaMusiqueDay: Date, now: Date): FilterState`.

- [ ] **Step 1: Add the helper**

After `eventMatchesFilters` (before the comparator section), add:

```ts
/* Deep-link visibility -------------------------------- */
// Returns `filters` with only the toggles that would hide `event` flipped, so
// that eventMatchesFilters(event, result, ...) is true. Used by the share
// deep-link so an event a visitor's default filters would hide (past, off the
// festival night, or kids-only) still appears when they open its link.
export const relaxFiltersToShow = (
  event: Event,
  filters: FilterState,
  feteDeLaMusiqueDay: Date,
  now: Date,
): FilterState => {
  const relaxed: FilterState = { ...filters };

  if(relaxed.hidePast && isPast(event, now)) {
    relaxed.hidePast = false;
  }
  if(relaxed.dayOnly && !isInFestivalNight(event.startTime, feteDeLaMusiqueDay)) {
    relaxed.dayOnly = false;
  }
  if(!relaxed.showForKids && event.forKids === true) {
    relaxed.showForKids = true;
  }

  return relaxed;
};
```

- [ ] **Step 2: Typecheck + lint**

Run: `pnpm tsc:ci && pnpm exec eslint src/helpers/applyEventFilters.ts`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/helpers/applyEventFilters.ts
git commit -m "feat(agenda): relaxFiltersToShow helper for deep-link visibility"
```

---

### Task 2: `ShareEventButton` + wire into `EventRender`

**Files:**
- Create: `src/components/ShareEventButton/ShareEventButton.tsx`
- Modify: `src/components/EventRender/EventRender.tsx`

**Interfaces:**
- Consumes: `Event` (`types/Event`), `Button` (`components/ui/button`), `Share2` (`lucide-react`), `toast` (`sonner`).
- Produces: default-exported `ShareEventButton: React.FC<{ event: Event }>`.

- [ ] **Step 1: Create `src/components/ShareEventButton/ShareEventButton.tsx`**

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports -------------------------------------- */
import { toast } from 'sonner';

/* Component imports ----------------------------------- */
import { Share2 } from 'lucide-react';
import { Button } from 'components/ui/button';

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';

/* ShareEventButton component prop types --------------- */
interface ShareEventButtonProps {
  event: Event;
}

/* ShareEventButton component -------------------------- */
const ShareEventButton: React.FC<ShareEventButtonProps> = (
  {
    event,
  },
) => {
  // Feature detection lives HERE (click time), never in render: the server has
  // no `navigator`, so branching in JSX would desync server/client markup and
  // trip a hydration mismatch. One stable button; behaviour decided on click.
  const handleShare = (): void => {
    const title: string = event.name ?? event.location.name;
    const url = `${window.location.origin}${window.location.pathname}?event=${event.id}`;

    if(typeof navigator.share === 'function') {
      void navigator
        .share({
          title,
          text: `${title} — Fête de la Musique`,
          url,
        })
        .catch((): void => undefined);
      return;
    }

    void navigator.clipboard
      .writeText(url)
      .then((): void => {
        toast.success('Lien copié');
      })
      .catch((): void => {
        toast.error('Impossible de copier le lien');
      });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="grow shrink-0"
      onClick={handleShare}
    >
      <Share2 className="h-4 w-4" />
      Partager
    </Button>
  );
};

/* Export ShareEventButton component ------------------- */
export default ShareEventButton;
```

- [ ] **Step 2: Wire into the `EventRender` action row**

In `src/components/EventRender/EventRender.tsx`, add the import (Component imports group):

```tsx
import ShareEventButton from 'components/ShareEventButton/ShareEventButton';
```

Then replace the existing action-row block (the `(addressStr… || coords…) && <div className="… flex items-center gap-2">…</div>` block near the end) with an **always-rendered** row that includes the share button:

```tsx
      <div className="w-full mt-4 flex flex-wrap items-center gap-2">
        {
          event.location.addressStr !== undefined &&
          event.location.addressStr.length > 0 &&
            <MapsLink location={event.location} variant="button" />
        }
        {
          event.location.coords !== undefined &&
            <Button
              variant="outline"
              size="sm"
              className="grow shrink-0"
              onClick={(): void => dispatchFocusMap(event.id)}
            >
              <MapPinned className="h-4 w-4" />
              Voir sur la carte
            </Button>
        }
        <ShareEventButton event={event} />
      </div>
```

(The outer `(hasAddress || hasCoords) &&` guard is removed because the share button is always present; the row therefore always renders. `flex-wrap` lets three buttons wrap on narrow screens.)

- [ ] **Step 3: Typecheck + lint**

Run: `pnpm tsc:ci && pnpm exec eslint src/components/ShareEventButton/ShareEventButton.tsx src/components/EventRender/EventRender.tsx`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ShareEventButton/ShareEventButton.tsx src/components/EventRender/EventRender.tsx
git commit -m "feat(agenda): Partager button (Web Share API + clipboard fallback)"
```

---

### Task 3: Deep-link — server reads `?event=`, EditionAgenda focuses it

**Files:**
- Modify: `src/app/(public)/[year]/page.tsx`
- Modify: `src/app/(public)/[year]/EditionAgenda.tsx`

**Interfaces:**
- Consumes: `relaxFiltersToShow` + `eventMatchesFilters` (`helpers/applyEventFilters`), `dispatchFocusEvent` (`helpers/eventFocus`).
- Produces: `EditionAgenda` gains optional prop `focusEventId?: string`; `EditionPage` passes it from `searchParams.event`.

- [ ] **Step 1: `page.tsx` — read `searchParams.event`, pass as prop**

Change the `EditionPage` signature to also accept `searchParams`, await it, and pass `focusEventId`:

```tsx
const EditionPage = async(
  {
    params,
    searchParams,
  }: {
    params: Promise<{ year: string }>;
    searchParams: Promise<{ event?: string }>;
  },
): Promise<React.ReactElement> => {
  const { year } = await params;
  if(!/^\d{4}$/.test(year)) {
    notFound();
  }
  const { event: focusEventId } = await searchParams;
```

Then pass it to `<EditionAgenda ... />`:

```tsx
      <EditionAgenda
        edition={editionPayload.edition}
        generalAlerts={generalAlerts}
        embedLinks={editionPayload.embedLinks}
        events={events}
        serverNowIso={serverNowIso}
        focusEventId={typeof focusEventId === 'string' ? focusEventId : undefined}
      />
```

- [ ] **Step 2: `EditionAgenda.tsx` — prop + focus effect**

Add `focusEventId?: string` to `EditionAgendaProps` and destructure it. Add the imports (Module imports group):

```tsx
import { eventMatchesFilters, relaxFiltersToShow } from 'helpers/applyEventFilters';
import { dispatchFocusEvent } from 'helpers/eventFocus';
```

(`useRef` must be in the React import — add it if absent.)

After the `useEditionFilters(...)` destructuring (which provides `filters`, `setFilters`, `filteredEvents`), add:

```tsx
  // Deep-link focus: a shared ?event= link lands here. After hydration, reveal
  // the event (relaxing only the filters that hide it) and dispatch the existing
  // focus (scroll + expand + highlight). Fires once. Runs only client-side, so
  // SSR HTML / first render are unaffected (default filters).
  const focusedRef = useRef<boolean>(false);
  useEffect(
    (): void => {
      if(focusEventId === undefined || focusedRef.current) {
        return;
      }
      const target = viewEvents.find((event) => event.id === focusEventId);
      if(target === undefined) {
        return;
      }
      if(!eventMatchesFilters(target, filters, feteDeLaMusiqueDay, now)) {
        setFilters(relaxFiltersToShow(target, filters, feteDeLaMusiqueDay, now)); // eslint-disable-line react-hooks/set-state-in-effect
        return;
      }
      focusedRef.current = true;
      dispatchFocusEvent(focusEventId);
    },
    [
      focusEventId,
      viewEvents,
      filters,
      setFilters,
      feteDeLaMusiqueDay,
      now,
    ],
  );
```

This sits above the early `if(viewEvents.length === 0)` return is NOT allowed (hooks must run unconditionally) — place it **before** that early return, alongside the other hooks.

- [ ] **Step 3: Typecheck + lint + build**

Run: `pnpm tsc:ci && pnpm exec eslint "src/app/(public)/[year]/page.tsx" "src/app/(public)/[year]/EditionAgenda.tsx" && pnpm build`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(public)/[year]/page.tsx" "src/app/(public)/[year]/EditionAgenda.tsx"
git commit -m "feat(agenda): deep-link ?event= scrolls to + focuses the shared event"
```

---

### Task 4: `getEventShareData` query

**Files:**
- Create: `src/db/queries/getEventShareData.ts`

**Interfaces:**
- Consumes: `db`, `events`, `editions` schema.
- Produces: `interface EventShareData { year: number; name: string | null; venueName: string; addressStr: string | null; startTime: string; endTime: string | null }` and `getEventShareData(eventId: string): Promise<EventShareData | null>`.

- [ ] **Step 1: Create `src/db/queries/getEventShareData.ts`**

```ts
/* Module imports -------------------------------------- */
import { and, eq } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../index';
import { editions, events } from '../schema';

/* Type declarations ----------------------------------- */
export interface EventShareData {
  year: number;
  name: string | null;
  venueName: string;
  addressStr: string | null;
  startTime: string;
  endTime: string | null;
}

/* Query ----------------------------------------------- */
// Minimal per-event data for the share OG card + metadata. Published editions
// only (mirrors getEventDetail's WHERE).
export const getEventShareData = async(eventId: string): Promise<EventShareData | null> => {
  const rows = await db
    .select({
      year: editions.year,
      name: events.name,
      venueName: events.locationName,
      addressStr: events.locationAddress,
      startTime: events.startTime,
      endTime: events.endTime,
    })
    .from(events)
    .innerJoin(editions, eq(events.editionId, editions.id))
    .where(and(eq(events.id, eventId), eq(editions.isPublished, true)))
    .limit(1);

  const row = rows[0];
  if(row === undefined) {
    return null;
  }

  return {
    year: row.year,
    name: row.name,
    venueName: row.venueName,
    addressStr: row.addressStr,
    startTime: row.startTime.toISOString(),
    endTime: row.endTime !== null ? row.endTime.toISOString() : null,
  };
};
```

- [ ] **Step 2: Typecheck + lint**

Run: `pnpm tsc:ci && pnpm exec eslint src/db/queries/getEventShareData.ts`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/db/queries/getEventShareData.ts
git commit -m "feat(db): getEventShareData query for share card + metadata"
```

---

### Task 5: Per-event OG card + image route

**Files:**
- Create: `src/lib/shareCard/eventShareCard.tsx`
- Create: `src/app/api/og/event/[eventId]/route.tsx`

**Interfaces:**
- Consumes: `EventShareData` + `getEventShareData` (Task 4); `CARD_COLORS` (`./colors`), `vinylNoteSvg` (`components/brand/VinylNote/VinylNoteGlyph`), fonts in `./fonts`; `ImageResponse` (`next/og`); `formatInTimeZone` (`date-fns-tz`), `fr` (`date-fns/locale`).
- Produces: `renderEventShareCard(data: EventShareData): Promise<ImageResponse>`; a `GET` route at `/api/og/event/[eventId]`.

- [ ] **Step 1: Create `src/lib/shareCard/eventShareCard.tsx`**

Mirror `shareCard.tsx` (reuse its font loader / glyph / colors pattern). Render the FÊTE DE LA MUSIQUE label, the event name (large), the venue, and the date.

```tsx
/* Framework imports ----------------------------------- */
import { ImageResponse } from 'next/og';

/* Module imports -------------------------------------- */
import { promises as fs } from 'fs';
import { formatInTimeZone } from 'date-fns-tz';
import { fr } from 'date-fns/locale';

/* Module imports (project) ---------------------------- */
import { CARD_COLORS } from './colors';

/* Component imports ----------------------------------- */
import { vinylNoteSvg } from 'components/brand/VinylNote/VinylNoteGlyph';

/* Type imports ---------------------------------------- */
import type { EventShareData } from 'db/queries/getEventShareData';

/* Image route metadata -------------------------------- */
export const size = { width: 1200, height: 630 } as const;
export const contentType = 'image/png' as const;

/* Helpers --------------------------------------------- */
const loadFonts = async(): Promise<
  Array<{ name: string; data: ArrayBuffer; weight: 400 | 700; style: 'normal' }>
> => {
  const [regular, bold] = await Promise.all([
    fs.readFile(new URL('./fonts/Inter-Regular.ttf', import.meta.url)),
    fs.readFile(new URL('./fonts/Inter-Bold.ttf', import.meta.url)),
  ]);
  return [
    { name: 'Inter', data: new Uint8Array(regular).buffer, weight: 400, style: 'normal' },
    { name: 'Inter', data: new Uint8Array(bold).buffer, weight: 700, style: 'normal' },
  ];
};

// startTime is a full instant; render it in Europe/Paris (the festival TZ).
const formatEventDate = (iso: string): string => {
  const formatted = formatInTimeZone(new Date(iso), 'Europe/Paris', "EEEE d MMMM '·' HH'h'mm", { locale: fr });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

/* Renderer -------------------------------------------- */
export const renderEventShareCard = async(data: EventShareData): Promise<ImageResponse> => {
  const fonts = await loadFonts();
  const c = CARD_COLORS;

  const glyphSvg = vinylNoteSvg(
    {
      recordColor: c.primary,
      holeColor: c.background,
      noteColor: c.primaryForeground,
      grooveColor: c.mutedForeground,
      groove: true,
    },
    220,
  );
  const glyphDataUri = `data:image/svg+xml;base64,${Buffer.from(glyphSvg).toString('base64')}`;

  const title: string = data.name ?? data.venueName;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px',
          backgroundColor: c.background,
          border: `2px solid ${c.border}`,
          fontFamily: 'Inter',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          { /* eslint-disable-next-line @next/next/no-img-element -- Satori OG image, not the DOM */ }
          <img width={96} height={96} src={glyphDataUri} alt="" />
          <div
            style={{
              display: 'flex',
              fontSize: '30px',
              fontWeight: 700,
              letterSpacing: '6px',
              color: c.mutedForeground,
            }}
          >
            {`FÊTE DE LA MUSIQUE ${data.year} · BORDEAUX`}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              fontSize: '76px',
              fontWeight: 700,
              lineHeight: 1.05,
              color: c.foreground,
            }}
          >
            {title}
          </div>
          <div style={{ display: 'flex', fontSize: '36px', marginTop: '24px', color: c.foreground }}>
            {data.venueName}
          </div>
          <div style={{ display: 'flex', fontSize: '32px', marginTop: '8px', color: c.mutedForeground }}>
            {formatEventDate(data.startTime)}
          </div>
        </div>
      </div>
    ),
    {
      width: size.width,
      height: size.height,
      fonts,
    },
  );
};
```

(If `eslint`/`tsc` flags the long event name overflowing, that is acceptable for v1 — Satori clips. Do not add truncation logic unless lint requires it.)

- [ ] **Step 2: Create `src/app/api/og/event/[eventId]/route.tsx`**

```tsx
/* Module imports (project) ---------------------------- */
import { getEventShareData } from 'db/queries/getEventShareData';
import { renderEventShareCard } from 'lib/shareCard/eventShareCard';

/* Route handler --------------------------------------- */
export const GET = async(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
): Promise<Response> => {
  const { eventId } = await params;
  const data = await getEventShareData(eventId);
  if(data === null) {
    return new Response('Not found', { status: 404 });
  }
  return renderEventShareCard(data);
};
```

- [ ] **Step 3: Typecheck + lint + build**

Run: `pnpm tsc:ci && pnpm exec eslint src/lib/shareCard/eventShareCard.tsx "src/app/api/og/event/[eventId]/route.tsx" && pnpm build`
Expected: all pass. (If `pnpm build` flags the route's `params` shape, match the Next 16 async-params convention used elsewhere — `params: Promise<{ eventId: string }>`.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/shareCard/eventShareCard.tsx "src/app/api/og/event/[eventId]/route.tsx"
git commit -m "feat(og): per-event share card + /api/og/event/[eventId] route"
```

---

### Task 6: Per-event metadata in `page.tsx`

**Files:**
- Modify: `src/app/(public)/[year]/page.tsx`

**Interfaces:**
- Consumes: `getEventShareData` (Task 4), `OG_SITE` (`lib/shareCard/ogBase`), `Metadata` (`next`), `formatInTimeZone`/`fr`.
- Produces: `generateMetadata` export on the page (event-specific when `?event=` resolves; otherwise inherits the edition metadata from `layout.tsx`).

- [ ] **Step 1: Add imports + `generateMetadata`**

Add imports at the top of `page.tsx`:

```tsx
import { getEventShareData } from 'db/queries/getEventShareData';
import { OG_SITE } from 'lib/shareCard/ogBase';
import { formatInTimeZone } from 'date-fns-tz';
import { fr } from 'date-fns/locale';
import type { Metadata } from 'next';
```

Add the export (above `EditionPage`):

```tsx
/* Metadata -------------------------------------------- */
// Per-event OG when a ?event= link is opened; otherwise return {} so the
// edition-level metadata from layout.tsx is inherited. metadataBase (root
// layout) resolves the relative OG image URL to an absolute one for crawlers.
export const generateMetadata = async(
  {
    params,
    searchParams,
  }: {
    params: Promise<{ year: string }>;
    searchParams: Promise<{ event?: string }>;
  },
): Promise<Metadata> => {
  const [{ year }, { event }] = await Promise.all([params, searchParams]);
  if(typeof event !== 'string' || event.length === 0) {
    return {};
  }

  const data = await getEventShareData(event);
  if(data === null || String(data.year) !== year) {
    return {};
  }

  const title = `${data.name ?? data.venueName} — Fête de la Musique ${data.year} à Bordeaux`;
  const dateLabel = formatInTimeZone(new Date(data.startTime), 'Europe/Paris', 'EEEE d MMMM', { locale: fr });
  const description = `${data.venueName} · ${dateLabel}`;
  const image = `/api/og/event/${event}`;

  return {
    title,
    description,
    openGraph: {
      ...OG_SITE,
      title,
      description,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
};
```

- [ ] **Step 2: Typecheck + lint + build**

Run: `pnpm tsc:ci && pnpm exec eslint "src/app/(public)/[year]/page.tsx" && pnpm build`
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(public)/[year]/page.tsx"
git commit -m "feat(og): per-event metadata on the edition page for ?event= links"
```

---

### Task 7: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Gates**

Run: `pnpm tsc:ci && pnpm exec eslint src/ && pnpm build`
Expected: tsc + build pass; eslint reports only the pre-existing `src/components/ui/map.tsx` errors (documented baseline) — no new errors in the feature files.

- [ ] **Step 2: Runtime — share button (hydration + behaviour)**

Dev server, open an edition, expand an event. Verify:
- The "Partager" button renders in the action row with no React hydration warning in the console (server/client markup identical).
- On a desktop with `navigator.share` (or via devtools) it invokes share; where unsupported it copies the URL and shows the "Lien copié" toast. Inspect the copied URL: `/<year>?event=<uuid>`.

- [ ] **Step 3: Runtime — deep link**

- Open `/<year>?event=<id>` for a **currently-visible** event → page scrolls to it, expands it, highlights it.
- Open `/<year>?event=<id>` for a **past / kids-only / off-night** event → it becomes visible (filters relaxed only as needed) and is focused.
- Open `/<year>?event=<unknown-uuid>` → no error, no scroll (no-op).

- [ ] **Step 4: OG**

- `curl -s '<dev>/<year>?event=<id>' | grep -i 'og:\|twitter:'` → per-event `og:title` / `og:image` (`/api/og/event/<id>`).
- Open `<dev>/api/og/event/<id>` → an image renders with the event name/venue/date.
- `curl` the page **without** `?event=` → still the edition-level OG (inherited from layout).

---

## Self-Review notes

- **Spec coverage:** SSR rules (click-time detection, server-read param) → Tasks 2/3 Global Constraints; share button → Task 2; relax-only filters → Tasks 1 + 3; deep-link focus reuse → Task 3; per-event query → Task 4; OG card + route → Task 5; per-event metadata → Task 6; verification incl. OG + hydration → Task 7.
- **Type consistency:** `relaxFiltersToShow(event, filters, fete, now): FilterState` defined in Task 1, used in Task 3; `EventShareData` defined in Task 4, consumed in Tasks 5/6; `getEventShareData` signature consistent; `focusEventId?: string` prop consistent between Task 3's `page.tsx` and `EditionAgenda`.
- **No placeholders:** full code in every step; the one deferred detail (exact Next 16 route `params` shape) is pinned to the async-params convention and called out.
- **Page.tsx touched twice:** Task 3 (component reads `searchParams` → prop) and Task 6 (`generateMetadata`) edit `page.tsx` sequentially; Task 6 adds an export without altering Task 3's component.
- **Hooks-order:** Task 3 explicitly places the focus effect with the other hooks, above the `viewEvents.length === 0` early return.
