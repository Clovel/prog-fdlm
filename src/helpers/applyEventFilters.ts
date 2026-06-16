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
    .replace(/[\u0300-\u036f]/g, '')
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
  return normalizeText(parts.join('  ')).includes(query);
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
