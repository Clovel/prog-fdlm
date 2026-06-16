# EditionEventsFilterTool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a compact, mobile-first filter/search/sort tool to the public `/[year]` edition page that narrows the borough listing and the map without leaving the page.

**Architecture:** Pure filter+sort logic in a tested-by-tsc helper (`helpers/applyEventFilters.ts`); a `useEditionFilters` hook owns in-memory state and derives `filteredEvents`; `EditionEventsFilterTool` is a presentational bar + dialog; `EditionPage` wires the filtered list into the borough listing and `EventsMap` while keeping Favorites and the recap count global.

**Tech Stack:** Next.js App Router (client component), React 19, TypeScript, Tailwind v4, shadcn/ui (`dialog`, `switch`, `badge`, `button`, `input`, `label`), `lucide-react`.

**Repo note — no test framework.** Verification per task is `pnpm tsc:ci` + `pnpm exec eslint <files>`; the final task adds `pnpm build` + a manual dev-server checklist. There is no unit-test runner, so "tests" are type checks, lint, and manual behaviour checks. Follow the component comment-banner convention in every file (see CLAUDE.md). Indentation 2-space, single quotes in JS, double quotes in JSX, `if(x)` with no space, explicit return types on non-trivial arrows.

---

## File Structure

- **Create** `src/helpers/applyEventFilters.ts` — pure functions + `FilterState` type + `DEFAULT_FILTERS`: filtering, sorting, active-count, default check, text normalization.
- **Create** `src/hooks/public/useEditionFilters.ts` — React hook owning filter state and deriving `filteredEvents`.
- **Rewrite** `src/components/EditionEventsFilterTool/EditionEventsFilterTool.tsx` — presentational bar + dialog.
- **Modify** `src/app/(public)/[year]/page.tsx` — call the hook, feed `filteredEvents` to the borough listing + `EventsMap`, render empty state, pass props to the tool.

---

### Task 1: Pure filter/sort helper

**Files:**
- Create: `src/helpers/applyEventFilters.ts`

- [ ] **Step 1: Write the helper module**

```ts
/* Module imports -------------------------------------- */

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';

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

export const DEFAULT_FILTERS: FilterState = {
  search: '',
  dayOnly: true,
  hidePast: true,
  sortField: 'none',
  sortDir: 'asc',
};

/* Text normalization ---------------------------------- */
// Diacritic- and case-insensitive folding for accent-tolerant search.
export const normalizeText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/* Festival-night window ------------------------------- */
// Keep events whose start falls in [dayOfFestival 06:00, next day 06:00).
const isInFestivalNight = (start: Date, feteDeLaMusiqueDay: Date): boolean => {
  const windowStart: Date = new Date(feteDeLaMusiqueDay);
  windowStart.setHours(6, 0, 0, 0);
  const windowEnd: Date = new Date(windowStart);
  windowEnd.setDate(windowEnd.getDate() + 1);
  const startMs: number = start.getTime();
  return startMs >= windowStart.getTime() && startMs < windowEnd.getTime();
};

/* Past detection -------------------------------------- */
const isPast = (event: Event, now: Date): boolean => {
  if(event.endTime !== undefined) {
    return event.endTime.getTime() < now.getTime();
  }
  // No end time: past only once the start date is strictly before today.
  const startDay: Date = new Date(event.startTime);
  startDay.setHours(0, 0, 0, 0);
  const today: Date = new Date(now);
  today.setHours(0, 0, 0, 0);
  return startDay.getTime() < today.getTime();
};

/* Search ---------------------------------------------- */
const eventMatchesSearch = (event: Event, search: string): boolean => {
  const query: string = normalizeText(search.trim());
  if(query.length === 0) {
    return true;
  }
  const parts: string[] = [
    event.name ?? '',
    ...(event.artists ?? []),
    ...(event.genres ?? []),
    event.location.name,
    event.location.addressStr ?? '',
    event.description ?? '',
  ];
  return normalizeText(parts.join('  ')).includes(query);
};

/* Combined predicate ---------------------------------- */
export const eventMatchesFilters = (
  event: Event,
  filters: FilterState,
  feteDeLaMusiqueDay: Date,
  now: Date,
): boolean => {
  if(filters.dayOnly && !isInFestivalNight(event.startTime, feteDeLaMusiqueDay)) {
    return false;
  }
  if(filters.hidePast && isPast(event, now)) {
    return false;
  }
  if(!eventMatchesSearch(event, filters.search)) {
    return false;
  }
  return true;
};

/* Comparator ------------------------------------------ */
export const compareEvents = (
  sortField: SortField,
  sortDir: SortDir,
): ((a: Event, b: Event) => number) => {
  if(sortField === 'none') {
    return (): number => 0;
  }
  const direction: number = sortDir === 'asc' ? 1 : -1;
  return (a: Event, b: Event): number => {
    if(sortField === 'favorites') {
      return ((a.favoriteCount ?? 0) - (b.favoriteCount ?? 0)) * direction;
    }
    // start | end — events with no end time sort last regardless of direction.
    const timeA: number | undefined = sortField === 'start'
      ? a.startTime.getTime()
      : a.endTime?.getTime();
    const timeB: number | undefined = sortField === 'start'
      ? b.startTime.getTime()
      : b.endTime?.getTime();
    if(timeA === undefined && timeB === undefined) {
      return 0;
    }
    if(timeA === undefined) {
      return 1;
    }
    if(timeB === undefined) {
      return -1;
    }
    return (timeA - timeB) * direction;
  };
};

/* Apply ----------------------------------------------- */
// Filter then sort the flat list. Grouping by borough afterwards preserves
// this order within each section (reduce keeps insertion order), so the sort
// applies within boroughs while section order stays canonical.
export const applyEventFilters = (
  events: Event[],
  filters: FilterState,
  feteDeLaMusiqueDay: Date,
  now: Date,
): Event[] => {
  const filtered: Event[] = events.filter(
    (event: Event): boolean => eventMatchesFilters(event, filters, feteDeLaMusiqueDay, now),
  );
  if(filters.sortField === 'none') {
    return filtered;
  }
  return [...filtered].sort(compareEvents(filters.sortField, filters.sortDir));
};

/* Bar helpers ----------------------------------------- */
// Active narrowing filters drive the "Filtres & tri" badge. Sort reorders, it
// does not hide, so it does not count.
export const countActiveFilters = (filters: FilterState): number =>
  (filters.dayOnly ? 1 : 0) +
  (filters.hidePast ? 1 : 0) +
  (filters.search.trim().length > 0 ? 1 : 0);

// Drives visibility of the bar-level reset control.
export const isDefaultFilters = (filters: FilterState): boolean =>
  filters.search === DEFAULT_FILTERS.search &&
  filters.dayOnly === DEFAULT_FILTERS.dayOnly &&
  filters.hidePast === DEFAULT_FILTERS.hidePast &&
  filters.sortField === DEFAULT_FILTERS.sortField &&
  filters.sortDir === DEFAULT_FILTERS.sortDir;
```

- [ ] **Step 2: Type-check and lint**

Run: `pnpm tsc:ci && pnpm exec eslint src/helpers/applyEventFilters.ts`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/helpers/applyEventFilters.ts
git commit -m "Add pure event filter/sort helper for the edition filter tool

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `useEditionFilters` hook

**Files:**
- Create: `src/hooks/public/useEditionFilters.ts`

- [ ] **Step 1: Write the hook**

```ts
'use client';

/* Framework imports ----------------------------------- */
import { useCallback, useMemo, useRef, useState } from 'react';

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
export const useEditionFilters = (
  events: Event[],
  feteDeLaMusiqueDay: Date,
): UseEditionFiltersResult => {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  // Capture "now" once at mount; hide-past does not tick live (reload refreshes).
  const nowRef = useRef<Date>(new Date());

  const filteredEvents = useMemo<Event[]>(
    () => applyEventFilters(events, filters, feteDeLaMusiqueDay, nowRef.current),
    [
      events,
      filters,
      feteDeLaMusiqueDay,
    ],
  );

  const reset = useCallback(
    (): void => {
      setFilters(DEFAULT_FILTERS);
    },
    [],
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

- [ ] **Step 2: Type-check and lint**

Run: `pnpm tsc:ci && pnpm exec eslint src/hooks/public/useEditionFilters.ts`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/public/useEditionFilters.ts
git commit -m "Add useEditionFilters hook owning filter state + derived list

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: `EditionEventsFilterTool` component (bar + dialog)

**Files:**
- Modify (full rewrite): `src/components/EditionEventsFilterTool/EditionEventsFilterTool.tsx`

Notes for the implementer:
- Equal control heights: search wrapper, reset button, and Filtres button are all `h-9`; the clear ✕ is positioned **inside** the input so it never changes the row height.
- The dialog is a full-screen sheet on mobile (`max-sm:*` overrides) and a centered modal on desktop (default shadcn `DialogContent`).
- Sort field/direction use `Button` toggles (no `toggle-group` dependency). Direction buttons are disabled when `sortField === 'none'`.
- All UI strings are French.

- [ ] **Step 1: Write the component**

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React, { useState } from 'react';

/* Module imports -------------------------------------- */
import { cn } from 'lib/utils';
import { isDefaultFilters } from 'helpers/applyEventFilters';

/* Component imports ----------------------------------- */
import { Search, X, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { Input } from 'components/ui/input';
import { Button } from 'components/ui/button';
import { Badge } from 'components/ui/badge';
import { Switch } from 'components/ui/switch';
import { Label } from 'components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from 'components/ui/dialog';

/* Type imports ---------------------------------------- */
import type { FilterState, SortField, SortDir } from 'helpers/applyEventFilters';

/* Local constants ------------------------------------- */
const SORT_FIELDS: Array<{ value: SortField; label: string }> = [
  { value: 'none', label: 'Aucun' },
  { value: 'start', label: 'Début' },
  { value: 'end', label: 'Fin' },
  { value: 'favorites', label: 'Favoris' },
];

const SORT_DIRS: Array<{ value: SortDir; label: string }> = [
  { value: 'asc', label: 'Croissant' },
  { value: 'desc', label: 'Décroissant' },
];

/* EditionEventsFilterTool component prop types -------- */
interface EditionEventsFilterToolProps {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  onReset: () => void;
  activeCount: number;
  resultCount: number;
}

/* EditionEventsFilterTool component ------------------- */
const EditionEventsFilterTool: React.FC<EditionEventsFilterToolProps> = (
  {
    filters,
    onChange,
    onReset,
    activeCount,
    resultCount,
  },
) => {
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);

  const showReset: boolean = !isDefaultFilters(filters);
  const hasSearch: boolean = filters.search.length > 0;
  const sortDisabled: boolean = filters.sortField === 'none';

  return (
    <section className="w-full max-w-screen lg:max-w-5xl px-2 mx-auto lg:px-0 py-3">
      <div className="flex items-center gap-2">
        {/* Search (clear ✕ sits inside so the row height stays h-9) */}
        <div className="relative flex-1 min-w-0">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            inputMode="search"
            placeholder="Rechercher un concert, un artiste, un lieu…"
            aria-label="Rechercher un événement"
            value={filters.search}
            onChange={
              (event: React.ChangeEvent<HTMLInputElement>): void => {
                onChange({ ...filters, search: event.target.value });
              }
            }
            className="h-9 pl-8 pr-8 [&::-webkit-search-cancel-button]:appearance-none"
          />
          {
            hasSearch &&
              <button
                type="button"
                aria-label="Effacer la recherche"
                onClick={
                  (): void => {
                    onChange({ ...filters, search: '' });
                  }
                }
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
          }
        </div>

        {/* Bar-level reset — only when state differs from defaults */}
        {
          showReset &&
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Réinitialiser les filtres"
              title="Réinitialiser"
              onClick={onReset}
              className="shrink-0"
            >
              <RotateCcw className="size-4" />
            </Button>
        }

        {/* Filtres & tri trigger */}
        <Button
          type="button"
          variant="outline"
          onClick={
            (): void => {
              setDialogOpen(true);
            }
          }
          className="shrink-0"
        >
          <SlidersHorizontal className="size-4" />
          <span className="hidden sm:inline">Filtres &amp; tri</span>
          {
            activeCount > 0 &&
              <Badge variant="secondary" className="ml-1 px-1.5">
                {activeCount}
              </Badge>
          }
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className={cn(
            'flex flex-col gap-0 p-0',
            'max-sm:top-0 max-sm:left-0 max-sm:h-dvh max-sm:w-full max-sm:max-w-full',
            'max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:border-0',
          )}
        >
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle>Filtres &amp; tri</DialogTitle>
          </DialogHeader>

          <div className="flex flex-1 flex-col gap-6 overflow-auto px-4 py-4">
            {/* Affichage */}
            <div className="flex flex-col gap-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Affichage
              </p>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="filter-day-only" className="flex flex-col items-start gap-0.5">
                  <span>Uniquement la nuit du 21 juin</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    Masque les autres dates
                  </span>
                </Label>
                <Switch
                  id="filter-day-only"
                  checked={filters.dayOnly}
                  onCheckedChange={
                    (checked: boolean): void => {
                      onChange({ ...filters, dayOnly: checked });
                    }
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="filter-hide-past" className="flex flex-col items-start gap-0.5">
                  <span>Masquer les événements passés</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    Déjà terminés
                  </span>
                </Label>
                <Switch
                  id="filter-hide-past"
                  checked={filters.hidePast}
                  onCheckedChange={
                    (checked: boolean): void => {
                      onChange({ ...filters, hidePast: checked });
                    }
                  }
                />
              </div>
            </div>

            {/* Trier par */}
            <div className="flex flex-col gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Trier par
              </p>
              <div className="flex flex-wrap gap-2">
                {
                  SORT_FIELDS.map(
                    (field): React.ReactNode => (
                      <Button
                        key={field.value}
                        type="button"
                        size="sm"
                        variant={filters.sortField === field.value ? 'default' : 'outline'}
                        onClick={
                          (): void => {
                            onChange({ ...filters, sortField: field.value });
                          }
                        }
                      >
                        {field.label}
                      </Button>
                    ),
                  )
                }
              </div>
              <div className="flex flex-wrap gap-2">
                {
                  SORT_DIRS.map(
                    (dir): React.ReactNode => (
                      <Button
                        key={dir.value}
                        type="button"
                        size="sm"
                        disabled={sortDisabled}
                        variant={filters.sortDir === dir.value ? 'default' : 'outline'}
                        onClick={
                          (): void => {
                            onChange({ ...filters, sortDir: dir.value });
                          }
                        }
                      >
                        {dir.label}
                      </Button>
                    ),
                  )
                }
              </div>
            </div>
          </div>

          <DialogFooter className="border-t px-4 py-3">
            <Button type="button" variant="ghost" onClick={onReset}>
              Réinitialiser
            </Button>
            <Button
              type="button"
              onClick={
                (): void => {
                  setDialogOpen(false);
                }
              }
            >
              {`Voir ${resultCount} résultat${resultCount !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};

/* Export EditionEventsFilterTool component ------------ */
export default EditionEventsFilterTool;
```

- [ ] **Step 2: Type-check and lint**

Run: `pnpm tsc:ci && pnpm exec eslint src/components/EditionEventsFilterTool/EditionEventsFilterTool.tsx`
Expected: no errors. If lint flags the `.map` arrow return type, the `: React.ReactNode` annotation shown already satisfies it; mirror a neighbouring file if anything else trips.

- [ ] **Step 3: Commit**

```bash
git add src/components/EditionEventsFilterTool/EditionEventsFilterTool.tsx
git commit -m "Build EditionEventsFilterTool bar + filters/sort dialog

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Wire the tool into the edition page

**Files:**
- Modify: `src/app/(public)/[year]/page.tsx`

The page already computes `viewEvents` and `feteDeLaMusiqueDay`. Add the hook (before the early returns, alongside the other hooks), feed `filteredEvents` to the borough listing and `EventsMap`, render an empty state, and pass props to the tool. `FavoritesSection` and `EventsRecap` keep receiving `viewEvents`.

- [ ] **Step 1: Add imports**

In the Module imports banner, add:

```tsx
import { useEditionFilters } from 'hooks/public/useEditionFilters';
```

(`EditionEventsFilterTool` is already imported.)

- [ ] **Step 2: Call the hook before the early returns**

Immediately after the `useEffect(...)` block that mirrors header state (around line 109, before `const editionNotFound`), insert:

```tsx
  const {
    filters,
    setFilters,
    reset: resetFilters,
    activeCount,
    filteredEvents,
  } = useEditionFilters(viewEvents, feteDeLaMusiqueDay);
```

- [ ] **Step 3: Replace the filter-tool render + borough listing + map**

Replace this block:

```tsx
        {
          viewEvents.length > 0 &&
            <EditionEventsFilterTool />
        }
        {
          Object.entries(reduceEventsByCategory(viewEvents))
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
```

with:

```tsx
        <EditionEventsFilterTool
          filters={filters}
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
```

- [ ] **Step 4: Point the map at the filtered set**

Change the `EventsMap` render:

```tsx
          <EventsMap events={filteredEvents} />
```

(Leave `<EventsRecap events={viewEvents} />` and `<FavoritesSection events={viewEvents} ... />` unchanged — they stay global.)

- [ ] **Step 5: Add the `Button` import**

The empty state uses `Button`. In the Component imports banner add:

```tsx
import { Button } from 'components/ui/button';
```

- [ ] **Step 6: Type-check, lint, build**

Run: `pnpm tsc:ci && pnpm exec eslint "src/app/(public)/[year]/page.tsx" && pnpm build`
Expected: all pass. (If `pnpm build` needs `DATABASE_URL`, it is already in `.env.local`.)

- [ ] **Step 7: Commit**

```bash
git add "src/app/(public)/[year]/page.tsx"
git commit -m "Wire EditionEventsFilterTool into the edition page

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Manual verification (dev server)

**Files:** none (verification only).

- [ ] **Step 1: Run the dev server and check behaviour**

Run: `pnpm dev`, open `http://localhost:3000/<a published year>`.

Verify:
- [ ] At first load the badge on "Filtres & tri" reads **2** (dayOnly + hidePast); no reset (⟲) shown; only festival-night, non-past events appear.
- [ ] Typing in search narrows the listing live (no debounce); accent test: `cafe` matches `Café`. The ✕ clears the text; the ⟲ reset appears whenever state differs from defaults and restores the first-load view.
- [ ] Toggling "Uniquement la nuit du 21 juin" off reveals other-date events; toggling "Masquer les événements passés" off reveals ended events. Badge count updates.
- [ ] Sort by Début/Fin/Favoris reorders events **within each borough section**; borough section order is unchanged. Switching to Aucun restores original order. Direction buttons are disabled while field = Aucun.
- [ ] The map markers reflect the filtered set; the recap ("N événements cette année") and the Favoris section stay global (unfiltered).
- [ ] Empty result shows the "Aucun événement…" block with a working reset.
- [ ] Dialog is a full-screen sheet on a ~360px viewport and a centered modal on desktop. All bar controls are the same height (no vertical jitter when ✕/⟲ appear).
- [ ] Dark mode looks correct.

- [ ] **Step 2: Final lint sweep**

Run: `pnpm lint`
Expected: no errors in the files touched (ignore any noise from `.claude/worktrees/.../.next/` per CLAUDE.md; scope-check with `pnpm exec eslint src/...` if needed).

---

## Self-Review

- **Spec coverage:** scope (listing + map; favorites/recap global) → Task 4 steps 3–4. Day window → Task 1 `isInFestivalNight`. Hide-past incl. no-end rule → Task 1 `isPast`. Accent/case search over the 6 fields → Task 1 `eventMatchesSearch`. Sort field+dir, within-borough, `none`=current → Task 1 `compareEvents`/`applyEventFilters` + Task 4 grouping. Bar + dialog (full-screen mobile/modal desktop), badge=active narrowing, ✕, ⟲ reset-to-defaults, equal heights → Task 3. Empty state → Task 4. In-memory state → Task 2. All covered.
- **Placeholder scan:** no TBD/TODO; every code step is complete.
- **Type consistency:** `FilterState`, `SortField`, `SortDir`, `DEFAULT_FILTERS`, `applyEventFilters`, `countActiveFilters`, `isDefaultFilters` defined in Task 1 and used with identical names/signatures in Tasks 2–4. Hook returns `{ filters, setFilters, reset, activeCount, filteredEvents }`; page destructures `reset` as `resetFilters` and passes the matching props to the tool (`filters/onChange/onReset/activeCount/resultCount`).
```
