/* Framework imports ----------------------------------- */
import { useMemo } from 'react';

/* Module imports -------------------------------------- */
import { getMapsPlatform } from './mapsUrl';

/* Type imports ---------------------------------------- */
import type { MapsPlatform } from './mapsUrl';

/* Hooks ----------------------------------------------- */
export const useMapsPlatform = (): MapsPlatform => {
  return useMemo(() => getMapsPlatform(), []);
};
