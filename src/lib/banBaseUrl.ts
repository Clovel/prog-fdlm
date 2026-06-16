/* Constants ------------------------------------------- */
/**
 * Default base URL for the BAN geocoding API, served by IGN's Géoplateforme.
 * The legacy `api-adresse.data.gouv.fr` host was decommissioned end of Jan 2026;
 * this endpoint returns identical GeoJSON. Override with GEOCODING_BASE_URL.
 */
export const DEFAULT_BAN_BASE_URL = 'https://data.geopf.fr/geocodage';

/* getBanBaseUrl --------------------------------------- */
/** Resolve the BAN base URL, honouring the GEOCODING_BASE_URL override. */
export const getBanBaseUrl = (): string => process.env.GEOCODING_BASE_URL ?? DEFAULT_BAN_BASE_URL;
