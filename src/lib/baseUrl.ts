/* Framework imports ----------------------------------- */
import { headers } from 'next/headers';

/* Base URL resolution --------------------------------- */
// `BETTER_AUTH_URL` is the auth base (emailed links, CSRF). Everything else —
// robots, sitemap, metadata — resolves its base URL here, decoupled from auth.

const FALLBACK_BASE_URL = 'https://prog-fdlm.vercel.app';

/**
 * Canonical, env-derived base URL. Does NOT read request headers, so it is safe
 * in static contexts (e.g. root-layout `metadataBase`). Resolution order:
 * `VERCEL_PROJECT_PRODUCTION_URL` (Vercel sets it automatically) → hardcoded prod.
 */
export const getCanonicalBaseUrl = (): string => {
  const productionUrl: string | undefined = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if(productionUrl !== undefined && productionUrl.length > 0) {
    return `https://${productionUrl}`;
  }
  return FALLBACK_BASE_URL;
};

/**
 * Base URL built from the incoming request (`x-forwarded-proto` + `host`), so
 * per-host surfaces like robots.txt / sitemap.xml emit the host they were
 * crawled at. Falls back to {@link getCanonicalBaseUrl} when `host` is absent.
 */
export const getRequestBaseUrl = async(): Promise<string> => {
  const headerList = await headers();
  const host: string | null = headerList.get('host');
  if(host === null || host.length === 0) {
    return getCanonicalBaseUrl();
  }
  const proto: string = headerList.get('x-forwarded-proto') ?? 'https';
  return `${proto}://${host}`;
};
