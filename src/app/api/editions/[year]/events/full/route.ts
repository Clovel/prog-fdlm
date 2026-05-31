/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';
import { z } from 'zod';

/* Module imports (project) ---------------------------- */
import { listEditionEventsWithDetail } from 'db/queries';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* Schema ---------------------------------------------- */
const paramsSchema = z.object({
  year: z.string().regex(/^\d{4}$/),
});

/* Route ----------------------------------------------- */
// Consolidated public read for the per-edition page: every event with its full
// detail (description, links, embeds, alerts) in one response, so the page
// renders without per-event detail fetches. The summary `/events` route (cursor
// paginated, documented in OpenAPI) is the API for programmatic consumers.
export const GET = async (
  _request: NextRequest,
  { params }: { params: Promise<{ year: string }> },
): Promise<NextResponse> => {
  const rawParams = await params;
  const parsedParams = paramsSchema.safeParse(rawParams);
  if(!parsedParams.success) {
    return NextResponse.json({ error: 'invalid_request', issues: parsedParams.error.issues }, { status: 400 });
  }

  const year: number = Number(parsedParams.data.year);

  try {
    const events = await listEditionEventsWithDetail(year);
    if(events === null) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ events }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
  } catch(error) {
    console.error(`[api/editions/${year}/events/full] internal error:`, error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
