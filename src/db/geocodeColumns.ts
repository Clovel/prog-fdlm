/* Type imports (project) ------------------------------ */
import type { events } from './schema';

/* Type imports ---------------------------------------- */
import type { GeocodeResult } from 'lib/geocode';

/* Type exports ---------------------------------------- */
export type GeoColumns = Pick<
  typeof events.$inferInsert,
  | 'latitude'
  | 'longitude'
  | 'geocodedAddress'
  | 'geocodeStatus'
  | 'geocodeScore'
  | 'geocodedAt'
  | 'formattedAddress'
>;

/* geocodeResultToColumns ------------------------------ */
/**
 * Map a geocode outcome to the 7 concrete DB geocode columns.
 * Does NOT implement "unchanged address → skip" — callers own that.
 * Pass result=null only when addr is null (no address to geocode).
 *
 * Branches:
 *  - addr === null              → all 7 columns null (status null too).
 *  - result.status === 'ok'     → write coords, score, formattedAddress.
 *  - result.status === 'failed' → null coords, status 'failed', score if any.
 */
export const geocodeResultToColumns = (addr: string | null, result: GeocodeResult | null): GeoColumns => {
  if(addr === null) {
    return {
      latitude: null,
      longitude: null,
      geocodedAddress: null,
      geocodeStatus: null,
      geocodeScore: null,
      geocodedAt: null,
      formattedAddress: null,
    };
  }
  if(result !== null && result.status === 'ok') {
    return {
      latitude: result.lat,
      longitude: result.lng,
      geocodedAddress: addr,
      geocodeStatus: 'ok',
      geocodeScore: result.score,
      geocodedAt: new Date(),
      formattedAddress: result.formattedAddress ?? null,
    };
  }
  /* status === 'failed': null coords; geocodedAddress stays null so the next
     save will retry (addr !== null !== null). */
  return {
    latitude: null,
    longitude: null,
    geocodedAddress: null,
    geocodeStatus: 'failed',
    geocodeScore: result?.score ?? null,
    geocodedAt: new Date(),
    formattedAddress: null,
  };
};
