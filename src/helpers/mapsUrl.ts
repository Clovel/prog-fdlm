/* Type imports ---------------------------------------- */
import type { Location } from 'types/Location';

/* Types ----------------------------------------------- */
export type MapsPlatform = 'ios' | 'android' | 'other';

/* Helpers --------------------------------------------- */
/**
 * Detects the platform from the user agent so we can pick the native maps
 * target. Client-only: returns 'other' during SSR (no `navigator`), which
 * keeps the rendered href stable across hydration.
 */
export const getMapsPlatform = (): MapsPlatform => {
  if(typeof navigator === 'undefined') return 'other';

  const ua: string = navigator.userAgent;

  if(/iPad|iPhone|iPod/.test(ua)) return 'ios';
  // iPadOS 13+ reports as desktop Macintosh but is touch-capable.
  if(/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return 'ios';
  if(/Android/.test(ua)) return 'android';

  return 'other';
};

/** Builds the maps search string from the venue name + address. */
export const buildMapsQuery = (location: Location): string => {
  const parts: string[] = [];

  if(location.name.length > 0) parts.push(location.name);
  if(location.addressStr !== undefined && location.addressStr.length > 0) {
    parts.push(location.addressStr);
  }

  return parts.join(', ');
};

/** Builds the per-platform maps URL for an already-built query string. */
export const buildMapsUrl = (query: string, platform: MapsPlatform): string => {
  const encoded: string = encodeURIComponent(query);

  switch(platform) {
    case 'ios':
      return `https://maps.apple.com/?q=${encoded}`;
    case 'android':
      return `geo:0,0?q=${encoded}`;
    default:
      return `https://www.google.com/maps/search/?api=1&query=${encoded}`;
  }
};
