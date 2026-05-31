'use client';

/* Module imports -------------------------------------- */
import { useQuery } from '@tanstack/react-query';

/* Module imports (project) ---------------------------- */
import { EditionNotFoundError } from './editionNotFound';

/* Type imports ---------------------------------------- */
import type { EditionView, EmbedLinkView, GeneralAlertView } from 'app/(public)/[year]/types';
import type { UseQueryResult } from '@tanstack/react-query';

/* Types ----------------------------------------------- */
export interface EditionPayload {
  edition: EditionView;
  generalAlerts: GeneralAlertView[];
  embedLinks: EmbedLinkView[];
}

/* Fetcher --------------------------------------------- */
const fetchEdition = async (year: string): Promise<EditionPayload> => {
  const response = await fetch(`/api/editions/${year}`);
  // A 400 here means a malformed year param (the only client error these endpoints raise for valid callers); treat it as not-found.
  if(response.status === 404 || response.status === 400) {
    throw new EditionNotFoundError();
  }
  if(!response.ok) {
    throw new Error(`Edition fetch failed: ${response.status}`);
  }
  return await response.json() as EditionPayload;
};

/* Hook ------------------------------------------------ */
export const useEdition = (year: string): UseQueryResult<EditionPayload, Error> => {
  return useQuery({
    queryKey: ['public', 'edition', year],
    queryFn: (): Promise<EditionPayload> => fetchEdition(year),
  });
};
