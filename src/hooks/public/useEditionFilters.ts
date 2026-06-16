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
    // eslint-disable-next-line react-hooks/refs -- intentional: capture "now" once at mount
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
