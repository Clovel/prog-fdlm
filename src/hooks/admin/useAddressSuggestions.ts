'use client';

/* Module imports -------------------------------------- */
import { useQuery } from '@tanstack/react-query';

/* Type imports ---------------------------------------- */
import type { UseQueryResult } from '@tanstack/react-query';
import type { AddressSuggestion } from 'app/api/geocode/autocomplete/route';

/* Constants ------------------------------------------- */
const MIN_QUERY_LENGTH = 3;

/* Fetcher --------------------------------------------- */
const fetchSuggestions = async (q: string): Promise<AddressSuggestion[]> => {
  const res = await fetch(`/api/geocode/autocomplete?q=${encodeURIComponent(q)}`, { cache: 'no-store' });
  if(!res.ok) {
    return [];
  }
  const body = await res.json() as { results: AddressSuggestion[] };
  return body.results;
};

/* useAddressSuggestions ------------------------------- */
export const useAddressSuggestions = (query: string): UseQueryResult<AddressSuggestion[], Error> => {
  const q = query.trim();
  return useQuery({
    queryKey: ['geocode-autocomplete', q],
    queryFn: (): Promise<AddressSuggestion[]> => fetchSuggestions(q),
    enabled: q.length >= MIN_QUERY_LENGTH,
    staleTime: 60_000,
  });
};
