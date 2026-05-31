'use client';

/* Module imports -------------------------------------- */
import { useQuery } from '@tanstack/react-query';

/* Module imports (project) ---------------------------- */
import { EditionNotFoundError } from './editionNotFound';

/* Type imports ---------------------------------------- */
import type { EventWithDetailView } from 'app/(public)/[year]/types';
import type { UseQueryResult } from '@tanstack/react-query';

/* Fetcher --------------------------------------------- */
// Hits the consolidated endpoint: every event with its full detail (description,
// links, embeds, alerts) in one response, so the page needs no per-event fetch.
const fetchEditionEvents = async (year: string): Promise<EventWithDetailView[]> => {
  const response = await fetch(`/api/editions/${year}/events/full`);
  // A 400 here means a malformed year param (the only client error these endpoints raise for valid callers); treat it as not-found.
  if(response.status === 404 || response.status === 400) {
    throw new EditionNotFoundError();
  }
  if(!response.ok) {
    throw new Error(`Events fetch failed: ${response.status}`);
  }
  const body = await response.json() as { events: EventWithDetailView[] };
  return body.events;
};

/* Hook ------------------------------------------------ */
export const useEditionEvents = (year: string): UseQueryResult<EventWithDetailView[], Error> => {
  return useQuery({
    queryKey: ['public', 'edition-events', year],
    queryFn: (): Promise<EventWithDetailView[]> => fetchEditionEvents(year),
  });
};
