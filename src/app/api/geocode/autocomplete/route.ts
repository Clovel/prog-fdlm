/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';

/* Module imports (project) ---------------------------- */
import { authorizeApi } from 'auth/apiGuard';
import { getBanBaseUrl } from 'lib/banBaseUrl';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* Constants ------------------------------------------- */
/** Minimum query length before hitting BAN. */
const MIN_QUERY_LENGTH = 3;
/** Proximity bias toward Bordeaux (FdlM is Bordeaux-only); ranks local hits first. */
const BORDEAUX_LAT = 44.84;
const BORDEAUX_LON = -0.58;

/* Type exports ---------------------------------------- */
export interface AddressSuggestion {
  label: string;
  lat: number;
  lng: number;
  score: number;
  city?: string;
  postcode?: string;
}

/* Internal types -------------------------------------- */
interface BanFeature {
  geometry: { coordinates: [number, number] }; /* [lng, lat] — GeoJSON order */
  properties: { label?: string; score: number; city?: string; postcode?: string };
}

interface BanResponse {
  features: BanFeature[];
}

/* GET — address autocomplete (admin + editor) --------- */
export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const { response } = await authorizeApi(['admin', 'editor']);
  if(response !== null) {
    return response;
  }

  const q = (new URL(request.url).searchParams.get('q') ?? '').trim();
  if(q.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ results: [] });
  }

  const url = `${getBanBaseUrl()}/search/?q=${encodeURIComponent(q)}&limit=5&autocomplete=1&lat=${BORDEAUX_LAT.toString()}&lon=${BORDEAUX_LON.toString()}`;

  let res: Response;
  try {
    res = await fetch(url);
  } catch(err: unknown) {
    console.error('[api/geocode/autocomplete] network error:', err);
    return NextResponse.json({ results: [] });
  }
  if(!res.ok) {
    console.error(`[api/geocode/autocomplete] BAN HTTP ${res.status.toString()} for q: ${q}`);
    return NextResponse.json({ results: [] });
  }

  let data: BanResponse;
  try {
    data = (await res.json()) as BanResponse;
  } catch(err: unknown) {
    console.error('[api/geocode/autocomplete] parse error:', err);
    return NextResponse.json({ results: [] });
  }

  const results: AddressSuggestion[] = data.features
    .map((f): AddressSuggestion => {
      /* GeoJSON order is [longitude, latitude] — destructure carefully. */
      const [lng, lat] = f.geometry.coordinates;
      return {
        label: f.properties.label ?? '',
        lat,
        lng,
        score: f.properties.score,
        city: f.properties.city,
        postcode: f.properties.postcode,
      };
    })
    .filter((s): boolean => s.label.length > 0);

  return NextResponse.json({ results });
};
