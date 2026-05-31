'use client';

/* Module imports -------------------------------------- */
import { useQuery } from '@tanstack/react-query';

/* Type imports ---------------------------------------- */
import type { UseQueryResult } from '@tanstack/react-query';
import type { TopFavoritedEvent } from 'db/queries/topFavorites';

/* Fetcher --------------------------------------------- */
const fetchTopFavorites = async (year: number, limit: number): Promise<TopFavoritedEvent[]> => {
  const res = await fetch(`/api/editions/${year}/top-favorites?limit=${limit}`, { cache: 'no-store' });
  if(!res.ok) {
    throw new Error(`Failed to load top favorites: ${res.status}`);
  }
  const body = await res.json() as { events: TopFavoritedEvent[] };
  return body.events;
};

/* Hook ------------------------------------------------ */
export const useTopFavorites = (
  year: number | null,
  limit: number = 5,
): UseQueryResult<TopFavoritedEvent[], Error> => {
  return useQuery({
    queryKey: ['admin', 'top-favorites', year, limit],
    queryFn: (): Promise<TopFavoritedEvent[]> => {
      if(year === null) {
        throw new Error('no year');
      }
      return fetchTopFavorites(year, limit);
    },
    enabled: year !== null,
  });
};
