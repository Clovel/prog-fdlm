# RSC Conversion of the Public Edition Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the public per-edition agenda page (`/[year]`) from a fully client-fetched `'use client'` page into a Server Component that renders the agenda from server-fetched data, eliminating the client-fetch waterfall to fix LCP (4.4s → target <2.5s), FCP, and most CLS (0.56) — with zero behaviour change for the French audience.

**Architecture:** The page becomes a Server Component that calls the existing DB query functions directly (`getEdition`, `listEditionEventsWithDetail`) — no HTTP hop — handles not-found server-side, renders JSON-LD server-side, and passes the data plus a single server-captured `now` timestamp into one client island (`EditionAgenda`) that owns all interactivity (filters, favorites, map). To make the server-rendered HTML hydrate identically on the client, all time-dependent filter math (festival-night window, past-detection, default filter state) is anchored to `Europe/Paris` via `date-fns-tz` and fed the injected `now` instead of calling `new Date()` at render time.

**Tech Stack:** Next.js 16 App Router (React Server Components), React 19, TypeScript, TanStack Query (being removed from this page), Drizzle query functions, `date-fns-tz` (already a dependency).

**Reference for review:** Next.js App Router / React Server Component best practices — server/client component boundaries, `'use client'` islands, server-side data fetching, hydration correctness.

---

## Background & Verified Facts

Read this section once before starting; it is the shared context for every task.

- **The page today** (`src/app/(public)/[year]/page.tsx`) is `'use client'`. It calls two TanStack Query hooks (`useEdition`, `useEditionEvents`) that `fetch` `/api/editions/[year]` and `/api/editions/[year]/events/full`. Until both resolve it renders a centered "Chargement des événements..." paragraph, then swaps in the full agenda. That swap + the empty initial HTML is the LCP/FCP/CLS problem.
- **The API routes already wrap pure server functions:** `/api/editions/[year]/route.ts` calls `getEdition(year)` and `/api/editions/[year]/events/full/route.ts` calls `listEditionEventsWithDetail(year)`. Both are exported from `db/queries` (`src/db/queries/index.ts` lines 3 and 5). The Server Component will call these **directly**.
  - `getEdition(year: number)` returns `{ edition: EditionView; generalAlerts: GeneralAlertView[]; embedLinks: EmbedLinkView[] } | null` (the `EditionPayload` shape — see `src/hooks/public/useEdition.ts`). Returns `null` when the edition does not exist / is not published.
  - `listEditionEventsWithDetail(year: number)` returns `EventWithDetailView[] | null` (`null` = edition not found). Types in `src/app/(public)/[year]/types.ts`.
- **The API routes are NOT touched** by this plan. They remain the public/programmatic API surface. We only stop the *page* from using them.
- **`useEdition` and `useEditionEvents` are used ONLY by this page** (verified by grep). After conversion they and their shared `EditionNotFoundError` helper become dead code.
- **`[year]/layout.tsx`** is already a Server Component hosting `generateMetadata` (uses `getEditionCardData`). It renders children through untouched. **Do not modify it.**
- **`[year]/not-found.tsx`** already exists and renders `NotFoundView`. A server-side `notFound()` call from the page will render it. This replaces the current client-side flag→`notFound()` dance.
- **`HeaderProvider`/`useHeader`** (`src/app/HeaderContext.tsx`) is a client context consumed by `Header` (in the public layout) and by the page's mirror effect. The mirror effect stays in the client island.
- **`FavoritesProvider`** (`src/components/Favorites/FavoritesProvider.tsx`) starts with an empty set and loads from `localStorage` in a `useEffect` (guarded by a `ready` flag). It is already hydration-safe (renders empty on both server and client, populates post-mount). It only needs `editionId`, available from `edition.id`. No changes needed.

### The hydration hazard (the #1 regression risk — read carefully)

`DEFAULT_FILTERS` (`src/helpers/applyEventFilters.ts`) and `useEditionFilters` (`src/hooks/public/useEditionFilters.ts`) currently call `new Date()` at render/mount time, and the filter predicates (`isInFestivalNight`, `isPast`) use `Date.prototype.setHours`, which resolves in the **runtime's local timezone**. On Vercel the server runs in **UTC**; the French audience's browsers run in **Europe/Paris**. If the server renders the default-filtered list using UTC math and the client re-renders using Paris math, the two HTML trees differ → React hydration mismatch → content shift (re-introducing the CLS we are fixing) and console errors.

**Mitigation (implemented in Task 1):**
1. Inject a single `now: Date` from the server (captured once per request) instead of calling `new Date()` inside the helper/hook. Server and client then render the initial state from the *same instant*. This also matches the existing documented behaviour ("capture now once at mount; reload refreshes").
2. Anchor `isInFestivalNight` and `isPast`'s day math to `Europe/Paris` via `date-fns-tz`, so the computation is **identical regardless of the runtime timezone**.

**Verified `date-fns-tz` v3 usage (this exact form is server-TZ-independent — confirmed under TZ=UTC, America/New_York, and Europe/Paris, all producing identical instants):**
- Build a wall-clock **string** (NOT a `Date` built from `Date.UTC`, which IS timezone-dependent) and pass it to `fromZonedTime(string, 'Europe/Paris')`.
- Use `formatInTimeZone(instant, 'Europe/Paris', 'yyyy-MM-dd')` to get an instant's Paris calendar day.

For the French audience, browser-local time already *is* Europe/Paris, so the rendered output is byte-identical to today's behaviour — **zero regression**. Users outside France previously got a window computed in their own timezone (arguably a bug); they now correctly see the Bordeaux festival night.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/helpers/applyEventFilters.ts` | Modify | `DEFAULT_FILTERS(fete, now)` and `isDefaultFilters(filters, fete, now)` take injected `now`; `isInFestivalNight`/`isPast` anchored to `Europe/Paris`. |
| `src/hooks/public/useEditionFilters.ts` | Modify | Accept injected `now: Date` instead of `useRef(new Date())`. |
| `src/helpers/buildEventJsonLd.ts` | Create | Pure, server-safe builder turning `EventWithDetailView[]` into the JSON-LD node array (moved out of the page so it can run server-side). |
| `src/app/(public)/[year]/EditionAgenda.tsx` | Create | New `'use client'` island: the current page body. Receives data + `serverNowIso` as props, maps DTOs→`Event`, owns filters/favorites/header-mirror, renders all interactive UI. |
| `src/app/(public)/[year]/page.tsx` | Rewrite | Server Component: validate param, fetch via queries, `notFound()`, render server-side JSON-LD, render `<EditionAgenda />`. |
| `src/hooks/public/useEdition.ts` | Delete | Dead after conversion. |
| `src/hooks/public/useEditionEvents.ts` | Delete | Dead after conversion. |
| `src/hooks/public/editionNotFound.ts` | Delete | `EditionNotFoundError` only used by the two deleted hooks + old page. |
| `src/app/(public)/[year]/error.tsx` | Create | Preserve the graceful French error UX the old client page showed on fetch failure (now needed because a DB throw in the Server Component would otherwise hit Next's default error boundary). |
| `src/components/embeds/embeds.css` (or the embed components) | Modify | Reserve a `min-height` on IG/FB embed containers so lazy iframe injection stops shifting content (CLS fix). |

---

## Task 1: Make filter time-math deterministic and timezone-stable

**Why first:** Every later task depends on the helper/hook signatures and on the hydration-safety guarantee. Nothing renders server-side safely until this is done.

**Files:**
- Modify: `src/helpers/applyEventFilters.ts`
- Modify: `src/hooks/public/useEditionFilters.ts`

- [ ] **Step 1: Add the Paris-anchored time helpers and thread `now` through `applyEventFilters.ts`**

Replace the `DEFAULT_FILTERS`, `isInFestivalNight`, `isPast`, and `isDefaultFilters` definitions. Add the `date-fns-tz` import at the top (Module imports banner). Full replacement for the affected regions:

```ts
/* Module imports -------------------------------------- */
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';

/* Festival timezone ----------------------------------- */
// The festival is in Bordeaux; all day/night math is anchored to Europe/Paris
// so it is identical on the UTC server and the (typically Paris) browser —
// guaranteeing server/client render parity (no hydration mismatch).
const FESTIVAL_TZ = 'Europe/Paris';

const pad2 = (value: number): string => String(value).padStart(2, '0');

/* Filter state types ---------------------------------- */
export type SortField = 'none' | 'start' | 'end' | 'favorites';
export type SortDir = 'asc' | 'desc';

export interface FilterState {
  search: string;
  dayOnly: boolean;
  hidePast: boolean;
  sortField: SortField;
  sortDir: SortDir;
}

// `now` is injected (server-captured) so the default state is identical across
// server render and client hydration.
export const DEFAULT_FILTERS = (feteDeLaMusiqueDay: Date, now: Date): FilterState => ({
  search: '',
  dayOnly: (now.getTime() >= new Date(feteDeLaMusiqueDay).getTime()),
  hidePast: true,
  sortField: 'none',
  sortDir: 'desc',
});
```

Keep `normalizeText` unchanged. Replace the festival-night and past helpers:

```ts
/* Festival-night window ------------------------------- */
// Keep events whose start falls in [dayOfFestival 06:00, next day 06:00) in
// Europe/Paris. `feteDeLaMusiqueDay` is a date-only 'YYYY-MM-DD' DB column
// (UTC midnight), so its calendar day is read via UTC getters, then 06:00 is
// interpreted as a Paris wall-clock instant (timezone-stable).
const isInFestivalNight = (start: Date, feteDeLaMusiqueDay: Date): boolean => {
  const year: number = feteDeLaMusiqueDay.getUTCFullYear();
  const month: number = feteDeLaMusiqueDay.getUTCMonth();
  const day: number = feteDeLaMusiqueDay.getUTCDate();
  const startStr = `${year}-${pad2(month + 1)}-${pad2(day)}T06:00:00`;
  const next: Date = new Date(Date.UTC(year, month, day + 1));
  const endStr = `${next.getUTCFullYear()}-${pad2(next.getUTCMonth() + 1)}-${pad2(next.getUTCDate())}T06:00:00`;
  const windowStartMs: number = fromZonedTime(startStr, FESTIVAL_TZ).getTime();
  const windowEndMs: number = fromZonedTime(endStr, FESTIVAL_TZ).getTime();
  const startMs: number = start.getTime();
  return startMs >= windowStartMs && startMs < windowEndMs;
};

/* Past detection -------------------------------------- */
// Start-of-day for an instant, in Europe/Paris (timezone-stable).
const parisDayStartMs = (instant: Date): number => {
  const dayStr: string = formatInTimeZone(instant, FESTIVAL_TZ, 'yyyy-MM-dd');
  return fromZonedTime(`${dayStr}T00:00:00`, FESTIVAL_TZ).getTime();
};

const isPast = (event: Event, now: Date): boolean => {
  if(event.endTime !== undefined) {
    // Instant comparison — timezone-independent.
    return event.endTime.getTime() < now.getTime();
  }
  // No end time: past only once the start's Paris day is before now's Paris day.
  return parisDayStartMs(event.startTime) < parisDayStartMs(now);
};
```

Update `isDefaultFilters` to take `now` and forward it:

```ts
export const isDefaultFilters = (
  filters: FilterState,
  feteDeLaMusiqueDay: Date,
  now: Date,
): boolean => {
  const defaultFilters = DEFAULT_FILTERS(feteDeLaMusiqueDay, now);
  return (
    filters.search === defaultFilters.search &&
    filters.dayOnly === defaultFilters.dayOnly &&
    filters.hidePast === defaultFilters.hidePast &&
    filters.sortField === defaultFilters.sortField &&
    filters.sortDir === defaultFilters.sortDir
  );
};
```

`eventMatchesFilters`, `compareEvents`, `applyEventFilters`, and `countActiveFilters` keep their existing signatures (they already receive `now` / don't need it). Leave them as-is.

- [ ] **Step 2: Thread `now` through `useEditionFilters.ts`**

Replace the hook so `now` is a parameter (the caller — the client island — passes the server-captured instant). Full file:

```ts
'use client';

/* Framework imports ----------------------------------- */
import { useCallback, useMemo, useState } from 'react';

/* Module imports -------------------------------------- */
import {
  applyEventFilters,
  countActiveFilters,
  DEFAULT_FILTERS,
} from 'helpers/applyEventFilters';

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';
import type { FilterState } from 'helpers/applyEventFilters';

/* useEditionFilters result type ----------------------- */
export interface UseEditionFiltersResult {
  filters: FilterState;
  setFilters: (next: FilterState) => void;
  reset: () => void;
  activeCount: number;
  filteredEvents: Event[];
}

/* useEditionFilters hook ------------------------------ */
// `now` is supplied by the caller (server-captured request time) so the initial
// default filter state and filtered list are identical on server and client.
export const useEditionFilters = (
  events: Event[],
  feteDeLaMusiqueDay: Date,
  now: Date,
): UseEditionFiltersResult => {
  const [filters, setFilters] = useState<FilterState>(
    () => DEFAULT_FILTERS(feteDeLaMusiqueDay, now),
  );

  const filteredEvents = useMemo<Event[]>(
    () => applyEventFilters(events, filters, feteDeLaMusiqueDay, now),
    [
      events,
      filters,
      feteDeLaMusiqueDay,
      now,
    ],
  );

  const reset = useCallback(
    (): void => {
      setFilters(DEFAULT_FILTERS(feteDeLaMusiqueDay, now));
    },
    [feteDeLaMusiqueDay, now],
  );

  return {
    filters,
    setFilters,
    reset,
    activeCount: countActiveFilters(filters),
    filteredEvents,
  };
};
```

Note: the previous `nowRef`/`react-hooks/refs` eslint-disable is gone because `now` is now a stable prop value. The `react-hooks/set-state-in-effect` concern does not apply here.

- [ ] **Step 3: Find and update every other caller of the changed signatures**

Run: `cd /home/clovel/repository/perso/prog-fdlm && grep -rn "DEFAULT_FILTERS\|isDefaultFilters\|useEditionFilters" src/`
Expected callers to fix (besides the two files above and the page, handled in Task 2/3):
- Any component using `isDefaultFilters(filters, fete)` must pass `now` as a third arg. The most likely caller is `EditionEventsFilterTool` (the "réinitialiser" control). For each hit, add the `now` argument — the `now` value must come from the same server-injected instant. If `EditionEventsFilterTool` calls `isDefaultFilters`, add a `now: Date` prop to it (passed down from `EditionAgenda`) and forward it.

For each non-test caller found, update the call site to pass `now`. Show the diff for each in your report.

- [ ] **Step 4: Verify types and lint**

Run: `cd /home/clovel/repository/perso/prog-fdlm && pnpm tsc:ci`
Expected: exit 0. (If `isDefaultFilters`/`DEFAULT_FILTERS` callers are missing the `now` arg, tsc will fail here — fix them.)

Run: `pnpm exec eslint src/helpers/applyEventFilters.ts src/hooks/public/useEditionFilters.ts`
Expected: no errors.

- [ ] **Step 5: Prove timezone-stability (regression guard for the hydration fix)**

Create a throwaway script `tzcheck.mjs` in the repo root:

```js
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';
const TZ = 'Europe/Paris';
const pad = (n) => String(n).padStart(2, '0');
const fete = new Date('2026-06-21');
const y = fete.getUTCFullYear(), mo = fete.getUTCMonth(), da = fete.getUTCDate();
const startStr = `${y}-${pad(mo + 1)}-${pad(da)}T06:00:00`;
const next = new Date(Date.UTC(y, mo, da + 1));
const endStr = `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}T06:00:00`;
console.log(fromZonedTime(startStr, TZ).toISOString(), fromZonedTime(endStr, TZ).toISOString(),
  fromZonedTime(`${formatInTimeZone(new Date('2026-06-21T23:30:00+02:00'), TZ, 'yyyy-MM-dd')}T00:00:00`, TZ).toISOString());
```

Run: `TZ=UTC node tzcheck.mjs && TZ=America/New_York node tzcheck.mjs && TZ=Europe/Paris node tzcheck.mjs`
Expected: all three lines **identical** → `2026-06-21T04:00:00.000Z 2026-06-22T04:00:00.000Z 2026-06-20T22:00:00.000Z`
Then delete the script: `rm tzcheck.mjs`

- [ ] **Step 6: Commit**

```bash
git add src/helpers/applyEventFilters.ts src/hooks/public/useEditionFilters.ts
# plus any caller files updated in Step 3
git commit -m "refactor: inject now and anchor edition filter time-math to Europe/Paris

Makes default-filter state and festival-night/past detection deterministic and
timezone-stable so the upcoming server-rendered edition page hydrates identically
on the (UTC) server and the (Paris) client. No behaviour change for the French
audience. Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Create the `EditionAgenda` client island

**Why:** Extract the entire current page body into a `'use client'` component that takes server-fetched data as props (instead of fetching), so it can be server-rendered for the initial HTML while keeping all interactivity.

**Files:**
- Create: `src/app/(public)/[year]/EditionAgenda.tsx`

- [ ] **Step 1: Write `EditionAgenda.tsx`**

This is the current `page.tsx` body, refactored to: (a) receive data via props, (b) use the injected `now`, (c) drop all TanStack Query / loading / error / notFound logic (the Server Component handles fetch + not-found). Keep the comment-banner layout the repo uses.

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React, { useEffect, useMemo, useState } from 'react';

/* Module imports -------------------------------------- */
import { reduceEventsByCategory } from 'helpers/reduceEventsByCategory';
import { sortEventsByCategoryEntries } from 'helpers/orderEventsByCategory';
import { useHeader } from 'app/HeaderContext';
import { useEditionFilters } from 'hooks/public/useEditionFilters';

/* Component imports ----------------------------------- */
import { Button } from 'components/ui/button';
import { Separator } from 'components/ui/separator';
import EditionEmbeds from 'components/EditionEmbeds/EditionEmbeds';
import EventsRecap from 'components/EventsRecap/EventsRecap';
import EventCategoryView from 'components/EventCategoryView/EventCategoryView';
import EventsMap from 'components/EventsMap/EventsMap';
import GeneralAlertsBanner from 'components/GeneralAlertsBanner/GeneralAlertsBanner';
import EmptyEditionView from 'components/EmptyEditionView/EmptyEditionView';
import FavoritesProvider from 'components/Favorites/FavoritesProvider';
import FavoritesSection from 'components/Favorites/FavoritesSection';
import EditionEventsFilterTool from 'components/EditionEventsFilterTool/EditionEventsFilterTool';

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';
import type {
  EditionView,
  EmbedLinkView,
  EventWithDetailView,
  GeneralAlertView,
} from './types';

/* Helpers --------------------------------------------- */
// Maps a consolidated event DTO (full detail inlined) into the render `Event`
// contract. Descriptions/links/embeds/alerts arrive with the list, so nothing
// is fetched per-event on expand.
const dtoToEvent = (dto: EventWithDetailView): Event => ({
  id: dto.id,
  name: dto.name ?? undefined,
  status: dto.status ?? undefined,
  category: dto.category ?? undefined,
  genres: dto.genres ?? undefined,
  artists: dto.artists ?? undefined,
  price: dto.priceText ?? undefined,
  location: {
    name: dto.location.name,
    addressStr: dto.location.address ?? undefined,
    coords: dto.location.coords ?? undefined,
  },
  startTime: new Date(dto.startTime),
  endTime: dto.endTime !== null ? new Date(dto.endTime) : undefined,
  description: dto.description ?? undefined,
  favoriteCount: dto.favoriteCount,
  links: dto.links,
  embedLinks: dto.embedLinks.map(({ platform, url }) => ({ type: platform, url })),
  alerts: dto.alerts.map(
    ({ variant, title, content }) => ({
      type: variant,
      title: title ?? undefined,
      content,
    }),
  ),
});

/* EditionAgenda component prop types ------------------ */
interface EditionAgendaProps {
  edition: EditionView;
  generalAlerts: GeneralAlertView[];
  embedLinks: EmbedLinkView[];
  events: EventWithDetailView[];
  serverNowIso: string;
}

/* EditionAgenda component ----------------------------- */
const EditionAgenda: React.FC<EditionAgendaProps> = (
  {
    edition,
    generalAlerts,
    embedLinks,
    events,
    serverNowIso,
  },
) => {
  const { setState: setHeaderState } = useHeader();

  // Server-captured request instant — identical on server render and client
  // hydration, so all time-based filtering renders the same tree on both.
  // useState (lazy init), NOT useMemo: it must be referentially STABLE across
  // re-renders, otherwise the filteredEvents useMemo (keyed on `now`) recomputes
  // every render. useMemo is not a stability guarantee under concurrent React;
  // useState with a lazy initialiser is. serverNowIso never changes for this
  // component's lifetime (a new year remounts the route), so init-once is correct.
  const [now] = useState<Date>(() => new Date(serverNowIso));

  const viewEvents: Event[] = useMemo<Event[]>(
    () => events.map(dtoToEvent),
    [events],
  );

  const feteDeLaMusiqueDay: Date = useMemo<Date>(
    () => new Date(edition.dayOfFestival),
    [edition.dayOfFestival],
  );

  // Mirror the loaded edition into the shared header; clear on unmount / change.
  useEffect(
    () => {
      setHeaderState({ year: edition.year, eventsCount: events.length });
      return (): void => {
        setHeaderState({ year: null, eventsCount: null });
      };
    },
    [
      edition.year,
      events.length,
      setHeaderState,
    ],
  );

  const {
    filters,
    setFilters,
    reset: resetFilters,
    activeCount,
    filteredEvents,
  } = useEditionFilters(viewEvents, feteDeLaMusiqueDay, now);

  if(viewEvents.length === 0) {
    return (
      <div className="flex flex-col place-items-center min-w-full py-4 lg:py-0">
        <GeneralAlertsBanner alerts={generalAlerts} />
        <EmptyEditionView />
      </div>
    );
  }

  return (
    <FavoritesProvider editionId={edition.id}>
      <div className="flex flex-col place-items-center min-w-full gap-0">
        <GeneralAlertsBanner alerts={generalAlerts} />
        <FavoritesSection events={viewEvents} feteDeLaMusiqueDay={feteDeLaMusiqueDay} />
        <EditionEventsFilterTool
          filters={filters}
          feteDeLaMusiqueDay={feteDeLaMusiqueDay}
          onChange={setFilters}
          onReset={resetFilters}
          activeCount={activeCount}
          resultCount={filteredEvents.length}
        />
        {
          filteredEvents.length === 0
            ? (
              <div className="flex flex-col items-center gap-3 w-full max-w-5xl px-4 py-12 mx-auto text-center">
                <p className="text-muted-foreground">
                  Aucun événement ne correspond à votre recherche.
                </p>
                <Button variant="outline" onClick={resetFilters}>
                  Réinitialiser les filtres
                </Button>
              </div>
            )
            : Object.entries(reduceEventsByCategory(filteredEvents))
              .sort(sortEventsByCategoryEntries)
              .map(
                (categoryEntry, index, array) => {
                  const categoryTitle = categoryEntry[0];
                  const categoryEvents = categoryEntry[1];
                  return (
                    <React.Fragment key={`${categoryTitle}-${index}`}>
                      <EventCategoryView
                        categoryTitle={categoryTitle}
                        categoryEvents={categoryEvents}
                        feteDeLaMusiqueDay={feteDeLaMusiqueDay}
                      />
                      {
                        array.length - 1 !== index &&
                          <Separator className="w-full" />
                      }
                    </React.Fragment>
                  );
                },
              )
        }
        <EventsRecap events={viewEvents} />
        <EditionEmbeds embeds={embedLinks} />
        <section className="w-full max-w-5xl px-4 g:py-8 mx-auto lg:px-0">
          <h4 className="text-2xl font-semibold tracking-tight pb-4">
            Cartes des événements
          </h4>
          <EventsMap events={filteredEvents} />
        </section>
      </div>
    </FavoritesProvider>
  );
};

/* Export EditionAgenda component ---------------------- */
export default EditionAgenda;
```

**Important fidelity notes (do not "improve" these):**
- The `className="... g:py-8 ..."` on the map `<section>` is copied verbatim from the original (it is a pre-existing typo for `lg:py-8`; preserving it keeps this a pure refactor — fixing it is out of scope for this task).
- If Task 1 Step 3 added a `now` prop to `EditionEventsFilterTool`, pass `now={now}` here as well. Match whatever prop name Task 1 introduced.
- The JSON-LD `<script>` is intentionally NOT here — it moves to the Server Component (Task 3) so it is in the initial HTML for SEO.

- [ ] **Step 2: Verify types and lint**

Run: `cd /home/clovel/repository/perso/prog-fdlm && pnpm tsc:ci`
Expected: exit 0.

Run: `pnpm exec eslint "src/app/(public)/[year]/EditionAgenda.tsx"`
Expected: no errors. (Watch for `@typescript-eslint/explicit-function-return-type` on arrows and the no-space-after-`if` rule.)

- [ ] **Step 3: Commit**

```bash
git add "src/app/(public)/[year]/EditionAgenda.tsx"
git commit -m "feat: add EditionAgenda client island (props-fed, no data fetching)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Create the server-side JSON-LD builder and convert `page.tsx` to a Server Component

**Files:**
- Create: `src/helpers/buildEventJsonLd.ts`
- Rewrite: `src/app/(public)/[year]/page.tsx`

- [ ] **Step 1: Write the JSON-LD builder (server-safe, pure, operates on DTOs)**

```ts
/* Type imports ---------------------------------------- */
import type { EventWithDetailView } from 'app/(public)/[year]/types';

/* Builder --------------------------------------------- */
// Schema.org Event[] nodes for the edition. Pure and serializable so it can run
// in the Server Component and be emitted into the initial HTML for SEO.
const EVENT_STATUS_MAP: Record<string, string> = {
  canceled: 'https://schema.org/EventCancelled',
  postponed: 'https://schema.org/EventPostponed',
  rescheduled: 'https://schema.org/EventRescheduled',
};

export const buildEventJsonLd = (
  events: EventWithDetailView[],
): Array<Record<string, unknown>> =>
  events
    .filter((event): boolean => event.name !== null && event.name.length > 0)
    .map(
      (event): Record<string, unknown> => {
        const place: Record<string, unknown> = {
          '@type': 'Place',
          name: event.location.name,
        };
        if(event.location.address !== null && event.location.address.length > 0) {
          place.address = event.location.address;
        }
        const node: Record<string, unknown> = {
          '@context': 'https://schema.org',
          '@type': 'Event',
          name: event.name,
          startDate: new Date(event.startTime).toISOString(),
          eventStatus: event.status !== null
            ? EVENT_STATUS_MAP[event.status] ?? 'https://schema.org/EventScheduled'
            : 'https://schema.org/EventScheduled',
          location: place,
        };
        if(event.endTime !== null) {
          node.endDate = new Date(event.endTime).toISOString();
        }
        return node;
      },
    );
```

Note: this matches the original page's JSON-LD output exactly. `startTime`/`endTime` are ISO strings in the DTO; `new Date(...).toISOString()` normalises them identically to the old `event.startTime.toISOString()`.

- [ ] **Step 2: Rewrite `page.tsx` as a Server Component**

Full replacement (note: NO `'use client'`, `params` read from props as a Promise, server-side `notFound()`):

```tsx
/* Framework imports ----------------------------------- */
import { notFound } from 'next/navigation';

/* Module imports (project) ---------------------------- */
import { getEdition } from 'db/queries';
import { listEditionEventsWithDetail } from 'db/queries';
import { buildEventJsonLd } from 'helpers/buildEventJsonLd';

/* Component imports ----------------------------------- */
import EditionAgenda from './EditionAgenda';

/* EditionPage component ------------------------------- */
const EditionPage = async (
  { params }: { params: Promise<{ year: string }> },
): Promise<React.ReactElement> => {
  const { year } = await params;
  if(!/^\d{4}$/.test(year)) {
    notFound();
  }

  const yearNum: number = Number(year);
  const [editionPayload, events] = await Promise.all([
    getEdition(yearNum),
    listEditionEventsWithDetail(yearNum),
  ]);

  if(editionPayload === null || events === null) {
    notFound();
  }

  const serverNowIso: string = new Date().toISOString();
  const jsonLd: Array<Record<string, unknown>> = buildEventJsonLd(events);

  return (
    <>
      {
        jsonLd.length > 0 &&
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
      }
      <EditionAgenda
        edition={editionPayload.edition}
        generalAlerts={editionPayload.generalAlerts}
        embedLinks={editionPayload.embedLinks}
        events={events}
        serverNowIso={serverNowIso}
      />
    </>
  );
};

/* Export EditionPage component ------------------------ */
export default EditionPage;
```

**Notes:**
- `React` is referenced only as a type (`React.ReactElement`); add `import type React from 'react';` under the Framework banner if `tsc` complains about the `React` name, mirroring `[year]/layout.tsx` which uses `import type React from 'react';`.
- Both queries run in parallel via `Promise.all` (they are independent). `getEdition` returning `null` OR `listEditionEventsWithDetail` returning `null` both mean "no such published edition" → `notFound()` (renders the existing `not-found.tsx`).
- TypeScript may infer `getEdition`/`listEditionEventsWithDetail` import from the same module; combine into one import line if the linter's import rules prefer it: `import { getEdition, listEditionEventsWithDetail } from 'db/queries';`.

- [ ] **Step 3: Verify types, lint, and build**

Run: `cd /home/clovel/repository/perso/prog-fdlm && pnpm tsc:ci`
Expected: exit 0.

Run: `pnpm exec eslint "src/app/(public)/[year]/page.tsx" src/helpers/buildEventJsonLd.ts`
Expected: no errors.

Run: `pnpm build`
Expected: build succeeds; `/[year]` appears as a dynamic (ƒ) route. No "useState/useEffect only works in Client Component" errors (those would mean a client hook leaked into the server file).

- [ ] **Step 4: Verify server-side rendering actually works (the core regression check)**

Start the dev server in the background and curl a published edition (use a year that exists in your DB — adjust `2026` if needed; check `/admin/editions` or the DB for a published year):

```bash
cd /home/clovel/repository/perso/prog-fdlm
pnpm dev &
sleep 8
# The page HTML must now contain real content server-side (not just a loading spinner):
curl -s http://localhost:3000/2026 | grep -c 'application/ld+json'   # expect >= 1 (JSON-LD in initial HTML)
curl -s http://localhost:3000/2026 | grep -ci 'Chargement des'        # expect 0 (no client-only loading gate)
# Spot-check an actual event name appears in the served HTML (replace with a known event):
curl -s http://localhost:3000/2026 | grep -ci 'concert\|musique'      # expect > 0
kill %1
```
Expected: JSON-LD present (`>= 1`), no "Chargement des" gate (`0`), event content present in the raw HTML. This proves the agenda is server-rendered.

- [ ] **Step 5: Manual hydration check (no console mismatch)**

With `pnpm dev` running, open `http://localhost:3000/2026` in a browser, open DevTools console, hard-reload. Expected: **no** "Hydration failed" / "server rendered HTML didn't match" warnings, and **no** visible content jump from an unfiltered→filtered list. Confirm the "Filtres & tri" tool still filters, the map renders, and favorites toggle. Document the result in your report (this is the decisive regression gate for the timezone fix).

- [ ] **Step 6: Commit**

```bash
git add "src/app/(public)/[year]/page.tsx" src/helpers/buildEventJsonLd.ts
git commit -m "feat: render the public edition page as a Server Component

Fetches edition + events via DB query functions directly (no client fetch
waterfall), handles not-found server-side, and emits JSON-LD in the initial
HTML. Interactivity moves to the EditionAgenda client island. Fixes the LCP/FCP
and most of the CLS on /[year].
Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3b: Make the agenda subtree SSR-safe (REQUIRED — Task 3 500s without it)

**Why:** After Task 3, `/[year]` returns HTTP 500 during SSR. The old client page bailed to a loading state on the server and never rendered this subtree; `EditionAgenda` now renders it fully server-side, exposing two browser-only islands:
1. `FavoritesProvider` calls `authClient.useSession()` (better-auth/react). better-auth is in `serverExternalPackages` (`next.config.js`), so server-rendering this client component resolves a second React copy → *"Invalid hook call … Cannot read properties of null (reading 'useRef')"*. It wraps the whole agenda, so it throws first.
2. `EventsMap` → `src/components/ui/map.tsx` calls `document.createElement(...)` during render (unguarded) → `document is not defined` on the server.

**Fix (decided): isolate the session sync; `ssr:false` the map.** The event cards keep SSR (the LCP/CLS win); only the two browser-only concerns go client-only.

**Files:**
- Modify: `src/app/(public)/[year]/EditionAgenda.tsx` (dynamic-import EventsMap with `ssr:false`)
- Create: `src/components/Favorites/FavoritesAuthSync.tsx` (the `useSession` + reconcile logic, client-only)
- Modify: `src/components/Favorites/FavoritesProvider.tsx` (drop `useSession`; hold `isAuthed` as state set by the sync child; render the sync child via `next/dynamic` `ssr:false`)

See the Task 3b implementer dispatch for the exact code. Verification: `pnpm tsc:ci`, `pnpm exec eslint`, `pnpm build`, then a CLEAN runtime SSR check (HTTP 200 + agenda content in served HTML + no errors in the dev/server log).

---

## Task 4: Remove the now-dead client hooks

**Files:**
- Delete: `src/hooks/public/useEdition.ts`
- Delete: `src/hooks/public/useEditionEvents.ts`
- Delete: `src/hooks/public/editionNotFound.ts`

- [ ] **Step 1: Confirm nothing imports them anymore**

Run: `cd /home/clovel/repository/perso/prog-fdlm && grep -rn "useEdition\b\|useEditionEvents\b\|EditionNotFoundError\|editionNotFound" src/`
Expected: the only remaining hits are inside the three files about to be deleted. If anything else references them, STOP and report — do not delete.

- [ ] **Step 2: Delete the files**

```bash
git rm src/hooks/public/useEdition.ts src/hooks/public/useEditionEvents.ts src/hooks/public/editionNotFound.ts
```

- [ ] **Step 3: Verify types and build**

Run: `pnpm tsc:ci`
Expected: exit 0.

Run: `pnpm build`
Expected: succeeds (no dangling imports).

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: remove unused client edition-fetch hooks after RSC conversion

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4b: Preserve the graceful error UX with an `error.tsx`

**Why:** The old client page caught load failures and rendered `<p class="text-destructive">Impossible de charger les événements.</p>`. In the Server Component, a thrown DB error propagates to the nearest error boundary; there is none in `[year]/`, so it would fall through to Next's default. Add a route-scoped error boundary to keep the original UX. (Genuine not-found is handled separately by `notFound()` → `not-found.tsx`; this is for unexpected failures only.)

**Files:**
- Create: `src/app/(public)/[year]/error.tsx`

- [ ] **Step 1: Write the error boundary**

`error.tsx` must be a Client Component (Next requirement) and receives `{ error, reset }`:

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React, { useEffect } from 'react';

/* Component imports ----------------------------------- */
import { Button } from 'components/ui/button';

/* EditionError component prop types ------------------- */
interface EditionErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/* EditionError component ------------------------------ */
const EditionError: React.FC<EditionErrorProps> = ({ error, reset }) => {
  useEffect(
    (): void => {
      console.error('[EditionPage] load failed:', error);
    },
    [error],
  );

  return (
    <div className="flex flex-col items-center gap-4 w-full py-16">
      <p className="text-destructive">Impossible de charger les événements.</p>
      <Button variant="outline" onClick={(): void => { reset(); }}>
        Réessayer
      </Button>
    </div>
  );
};

/* Export EditionError component ----------------------- */
export default EditionError;
```

- [ ] **Step 2: Verify**

Run: `cd /home/clovel/repository/perso/prog-fdlm && pnpm tsc:ci && pnpm exec eslint "src/app/(public)/[year]/error.tsx"`
Expected: exit 0, no errors. (Note the `onClick` wraps `reset()` in a block-body void arrow per the repo's `explicit-function-return-type` + toast-style convention.)

- [ ] **Step 3: Commit**

```bash
git add "src/app/(public)/[year]/error.tsx"
git commit -m "feat: add edition route error boundary preserving the French failure UX

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Reserve embed iframe height to stop layout shift (CLS fix)

**Why:** Instagram/Facebook embeds inject their iframe lazily (viewport-gated, via the Meta SDK) into containers with no reserved height, shoving content below them down as they load — a primary CLS contributor on `/[year]`. Reserving a `min-height` placeholder eliminates that shift.

**Files:**
- Read first: `src/components/embeds/InstagramEmbed.tsx`, `src/components/embeds/FacebookEmbed.tsx`, `src/components/embeds/embeds.css`

- [ ] **Step 1: Inspect the embed components and CSS**

Run: `cd /home/clovel/repository/perso/prog-fdlm && sed -n '1,200p' src/components/embeds/embeds.css; echo '--- IG ---'; cat src/components/embeds/InstagramEmbed.tsx; echo '--- FB ---'; cat src/components/embeds/FacebookEmbed.tsx`

Identify the outer wrapper element each embed renders (the one capped at `maxWidth` 540px IG / 750px FB) and whether it already has any height.

- [ ] **Step 2: Add a `min-height` to the embed wrappers**

In whichever layer is canonical for these components (prefer `embeds.css` if the wrappers are styled there; otherwise add a Tailwind `min-h-[...]` class on the wrapper `div` in each component). Reserve a sensible placeholder height so the collapsed→loaded delta is ~0:
- Instagram: `min-height: 480px;` (typical IG post embed is tall)
- Facebook: `min-height: 560px;` (post) — if `FacebookEmbed` distinguishes `type: 'video'`, use `min-height: 340px;` for video.

Apply via CSS if the wrapper has a stable class, e.g. in `embeds.css`:

```css
/* Reserve space so the lazily-injected SDK iframe does not shift content (CLS). */
.instagram-embed-root { min-height: 480px; }
.facebook-embed-root { min-height: 560px; }
```

(Use the actual class names found in Step 1. If the components use inline styles / no class, add `min-h-[480px]` / `min-h-[560px]` to the outermost wrapper `div` instead, matching the existing styling approach in those files.)

Keep the existing `maxWidth` behaviour untouched.

- [ ] **Step 3: Verify lint/build and visually confirm**

Run: `pnpm exec eslint src/components/embeds/` (and `pnpm tsc:ci` if any `.tsx` changed)
Expected: no errors.

With `pnpm dev`, load an edition page that has embeds (page-level `EditionEmbeds` and/or an event with embeds). Throttle network in DevTools, reload, and confirm the content below the embeds does **not** jump as the iframe loads. Document the before/after feel in your report.

- [ ] **Step 4: Commit**

```bash
git add src/components/embeds/
git commit -m "fix: reserve min-height on social embeds to prevent layout shift (CLS)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6 (optional, do last): Add a `loading.tsx` skeleton

**Why:** The Server Component now suspends server-side while the DB queries run; under streaming / slow DB (TTFB spiked to 6.6s in Speed Insights) Next will show the route's `loading.tsx` if present. A skeleton that matches the final layout improves perceived performance without re-introducing a content-shift.

**Files:**
- Create: `src/app/(public)/[year]/loading.tsx`

- [ ] **Step 1: Write a layout-matching skeleton**

```tsx
/* Framework imports ----------------------------------- */
import type React from 'react';

/* Component imports ----------------------------------- */
import { Skeleton } from 'components/ui/skeleton';

/* EditionLoading component ---------------------------- */
const EditionLoading: React.FC = () => {
  return (
    <div className="flex flex-col items-center w-full max-w-5xl gap-6 px-4 py-8 mx-auto">
      <Skeleton className="w-full h-12" />
      <Skeleton className="w-full h-40" />
      <Skeleton className="w-full h-40" />
      <Skeleton className="w-full h-40" />
    </div>
  );
};

/* Export EditionLoading component --------------------- */
export default EditionLoading;
```

Confirm `components/ui/skeleton` exists first: `ls src/components/ui/skeleton.tsx`. If it does not, render the same shape with `<div className="... animate-pulse bg-muted rounded-md" />` blocks instead.

- [ ] **Step 2: Verify**

Run: `pnpm tsc:ci && pnpm exec eslint "src/app/(public)/[year]/loading.tsx"`
Expected: exit 0, no errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(public)/[year]/loading.tsx"
git commit -m "feat: add edition page loading skeleton for the RSC suspense fallback

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Out of scope (deliberately NOT in this plan)

- **ISR / `export const revalidate`** on the page. It would help the TTFB spikes, but a cached page freezes the server-captured `now` for the cache window (making `hidePast` reflect render time, not request time) and interacts with publish-status. Worth doing as a follow-up *after* measuring the conversion's impact, with its own review. Note it; do not implement here.
- **Deduping the 3 per-request DB queries** (`getEditionCardData` in `layout.tsx` + `getEdition` + `listEditionEventsWithDetail`) via React `cache()`. Optimisation, not correctness. Follow-up.
- **Changing the public API routes.** Untouched on purpose.
- **Fixing the `g:py-8` typo** in the map section className. Left verbatim to keep the conversion a pure refactor.

---

## Final Verification (after all tasks)

- [ ] `pnpm tsc:ci` → exit 0
- [ ] `pnpm lint` → clean (or `pnpm exec eslint src/` if the worktree `.next` noise appears, per CLAUDE.md)
- [ ] `pnpm build` → succeeds; `/[year]` is a server-rendered route
- [ ] `curl -s http://localhost:3000/<published-year>` contains event content + JSON-LD, and contains no "Chargement des" client-loading gate
- [ ] Browser: no hydration warnings in console; filters, favorites, and map all work; no visible content jump on load
- [ ] Speed Insights re-check after deploy (give it real traffic): `vercel metrics vercel.speed_insights_metric.lcp -a p75 -f "route eq '/[year]'" --since 1d --project prog-fdlm` and same for `cls` — confirm LCP and CLS trend down.
```

