/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';
import { z } from 'zod';

/* Module imports (project) ---------------------------- */
import { getTopFavoritedEventsForYear } from 'db/queries/topFavorites';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* Schemas --------------------------------------------- */
const paramsSchema = z.object({
  year: z.string().regex(/^\d{4}$/),
});

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

/* Route ----------------------------------------------- */
export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ year: string }> },
): Promise<NextResponse> => {
  const parsedParams = paramsSchema.safeParse(await params);
  if(!parsedParams.success) {
    return NextResponse.json({ error: 'invalid_request', issues: parsedParams.error.issues }, { status: 400 });
  }
  const searchParams: Record<string, string> = Object.fromEntries(new URL(request.url).searchParams);
  const parsedQuery = querySchema.safeParse(searchParams);
  if(!parsedQuery.success) {
    return NextResponse.json({ error: 'invalid_request', issues: parsedQuery.error.issues }, { status: 400 });
  }

  const year: number = Number(parsedParams.data.year);
  try {
    const topEvents = await getTopFavoritedEventsForYear(year, parsedQuery.data.limit);
    if(topEvents === null) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ events: topEvents }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
  } catch(error) {
    console.error(`[api/editions/${year}/top-favorites] internal error:`, error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
