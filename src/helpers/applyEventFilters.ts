/* Module imports -------------------------------------- */
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';

/* Filter state types ---------------------------------- */
export type SortField = 'none' | 'start' | 'end' | 'favorites';
export type SortDir = 'asc' | 'desc';

export interface FilterState {
  search: string;
  dayOnly: boolean;
  hidePast: boolean;
  showForKids: boolean;
  sortField: SortField;
  sortDir: SortDir;
}

const FESTIVAL_TZ = 'Europe/Paris';
const pad2 = (value: number): string => String(value).padStart(2, '0');

export const DEFAULT_FILTERS = (feteDeLaMusiqueDay: Date, now: Date): FilterState => ({
  search: '',
  dayOnly: (now.getTime() >= new Date(feteDeLaMusiqueDay).getTime()),
  hidePast: true,
  showForKids: false,
  sortField: 'none',
  sortDir: 'desc',
});

/* Text normalization ---------------------------------- */
// Diacritic- and case-insensitive folding for accent-tolerant search.
export const normalizeText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/* Festival-night window ------------------------------- */
// Keep events whose start falls in [dayOfFestival 06:00, next day 06:00) in
// Europe/Paris. feteDeLaMusiqueDay is a date-only 'YYYY-MM-DD' DB column (UTC
// midnight): read its calendar day via UTC getters, interpret 06:00 as a Paris
// wall-clock instant. Building wall-clock STRINGS (not Date.UTC values) is what
// makes fromZonedTime timezone-stable across server (UTC) and client (Paris).
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
const parisDayStartMs = (instant: Date): number => {
  const dayStr: string = formatInTimeZone(instant, FESTIVAL_TZ, 'yyyy-MM-dd');
  return fromZonedTime(`${dayStr}T00:00:00`, FESTIVAL_TZ).getTime();
};

const isPast = (event: Event, now: Date): boolean => {
  if(event.endTime !== undefined) {
    return event.endTime.getTime() < now.getTime();
  }
  return parisDayStartMs(event.startTime) < parisDayStartMs(now);
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
  if(!filters.showForKids && event.forKids === true) {
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
    // Zero comparator preserves insertion order: Array.prototype.sort is stable (ES2019+).
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
// Number of filters the user has changed from their defaults — drives the
// "Filtres & tri" badge. Counting deviations (not absolute state) keeps the
// badge intuitive across mixed-polarity toggles: "hide past" defaults on and
// "show jeune public" defaults off, so counting either absolute state would
// make the badge non-zero at rest and *drop* when a reveal toggle is enabled.
// Sort reorders, it does not hide, so it does not count.
export const countActiveFilters = (
  filters: FilterState,
  feteDeLaMusiqueDay: Date,
  now: Date,
): number => {
  const defaults = DEFAULT_FILTERS(feteDeLaMusiqueDay, now);
  return (
    (filters.search.trim() !== defaults.search ? 1 : 0) +
    (filters.dayOnly !== defaults.dayOnly ? 1 : 0) +
    (filters.hidePast !== defaults.hidePast ? 1 : 0) +
    (filters.showForKids !== defaults.showForKids ? 1 : 0)
  );
};

// Drives visibility of the bar-level reset control.
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
    filters.showForKids === defaultFilters.showForKids &&
    filters.sortField === defaultFilters.sortField &&
    filters.sortDir === defaultFilters.sortDir
  );
};
