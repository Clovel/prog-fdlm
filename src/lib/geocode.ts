/* Constants ------------------------------------------- */
/** BAN confidence gate — accept results with score >= this value. */
const MIN_GEOCODE_SCORE = 0.5;

/**
 * Default base URL for the BAN geocoding API, served by IGN's Géoplateforme.
 * The legacy `api-adresse.data.gouv.fr` host was decommissioned end of Jan 2026
 * (redirect to IGN being wound down); this endpoint returns identical GeoJSON.
 * Override with GEOCODING_BASE_URL if needed.
 */
const DEFAULT_BASE_URL = 'https://data.geopf.fr/geocodage';

/* Type exports ---------------------------------------- */
export type GeocodeResult =
  | { status: 'ok'; lat: number; lng: number; score: number; formattedAddress?: string }
  | { status: 'failed'; score?: number };

/* Internal types -------------------------------------- */
interface BanFeatureProperties {
  score: number;
  label?: string;
}

interface BanFeature {
  geometry: {
    coordinates: [number, number]; /* [lng, lat] — GeoJSON order */
  };
  properties: BanFeatureProperties;
}

interface BanResponse {
  features: BanFeature[];
}

/* geocodeAddress -------------------------------------- */
/**
 * Geocode a single address string using France's BAN API
 * (`api-adresse.data.gouv.fr`). Server-only — no API key required.
 *
 * Returns a discriminated `GeocodeResult`:
 *  - `status: 'ok'`     — `lat`, `lng`, `score`, optional `formattedAddress`
 *  - `status: 'failed'` — blank/whitespace input, empty result, low score,
 *                         network error, or non-2xx response.
 *
 * Never throws into the caller. All errors are logged and resolve to `'failed'`.
 *
 * BAN GeoJSON note: `coordinates` is `[longitude, latitude]`. We swap to
 * `{ lat, lng }` here — do NOT change the destructuring order.
 */
export const geocodeAddress = async(address: string): Promise<GeocodeResult> => {
  if(address.trim().length === 0) {
    return { status: 'failed' };
  }

  const baseUrl: string = process.env.GEOCODING_BASE_URL ?? DEFAULT_BASE_URL;
  const url = `${baseUrl}/search/?q=${encodeURIComponent(address)}&limit=1&autocomplete=0`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch(err: unknown) {
    console.error('[geocode] Network error fetching BAN:', err);
    return { status: 'failed' };
  }

  if(!response.ok) {
    console.error(`[geocode] BAN returned HTTP ${response.status.toString()} for address: ${address}`);
    return { status: 'failed' };
  }

  let data: BanResponse;
  try {
    data = (await response.json()) as BanResponse;
  } catch(err: unknown) {
    console.error('[geocode] Failed to parse BAN response JSON:', err);
    return { status: 'failed' };
  }

  if(data.features.length === 0) {
    return { status: 'failed' };
  }

  const feature: BanFeature = data.features[0];
  const score: number = feature.properties.score;

  if(score < MIN_GEOCODE_SCORE) {
    console.warn(
      `[geocode] BAN score ${score.toString()} below threshold ${MIN_GEOCODE_SCORE.toString()} for address: ${address}`,
    );
    return { status: 'failed', score };
  }

  /* GeoJSON order is [longitude, latitude] — destructure carefully. */
  const [lng, lat] = feature.geometry.coordinates;

  return {
    status: 'ok',
    lat,
    lng,
    score,
    formattedAddress: feature.properties.label,
  };
};
