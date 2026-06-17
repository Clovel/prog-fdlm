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
