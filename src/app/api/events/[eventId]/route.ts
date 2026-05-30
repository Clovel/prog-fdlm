/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';
import { z } from 'zod';

/* Module imports (project) ---------------------------- */
import { getEventDetail } from 'db/queries';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* Schema ---------------------------------------------- */
const paramsSchema = z.object({
  eventId: z.string().uuid(),
});

/* Route ----------------------------------------------- */
export const GET = async (
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
): Promise<NextResponse> => {
  const raw = await params;
  const parsed = paramsSchema.safeParse(raw);
  if(!parsed.success) {
    return NextResponse.json({ error: 'invalid_request', issues: parsed.error.issues }, { status: 400 });
  }
  try {
    const detail = await getEventDetail(parsed.data.eventId);
    if(detail === null) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ event: detail }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
  } catch(error) {
    console.error(`[api/events/${parsed.data.eventId}] internal error:`, error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
