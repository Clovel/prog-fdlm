/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';
import { z } from 'zod';

/* Module imports (project) ---------------------------- */
import { listEditionEvents } from 'db/queries';
import { eventCategories } from 'types/eventCategories';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* Schema ---------------------------------------------- */
const paramsSchema = z.object({
  year: z.string().regex(/^\d{4}$/),
});

const querySchema = z.object({
  category: z.enum(eventCategories as readonly [string, ...string[]]).optional(),
  q: z.string().trim().max(200).optional(),
  genre: z.string().trim().max(80).optional(),
  status: z.enum(['canceled', 'postponed', 'rescheduled']).optional(),
  ids: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

const uuidRegex: RegExp = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* Route ----------------------------------------------- */
export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ year: string }> },
): Promise<NextResponse> => {
  const rawParams = await params;
  const parsedParams = paramsSchema.safeParse(rawParams);
  if(!parsedParams.success) {
    return NextResponse.json({ error: 'invalid_request', issues: parsedParams.error.issues }, { status: 400 });
  }

  const url: URL = new URL(request.url);
  const searchParams: Record<string, string> = Object.fromEntries(url.searchParams);
  const parsedQuery = querySchema.safeParse(searchParams);
  if(!parsedQuery.success) {
    return NextResponse.json({ error: 'invalid_request', issues: parsedQuery.error.issues }, { status: 400 });
  }

  let ids: string[] | undefined;
  if(parsedQuery.data.ids !== undefined && parsedQuery.data.ids.length > 0) {
    ids = parsedQuery.data.ids.split(',').map((s) => s.trim());
    if(ids.length > 200) {
      return NextResponse.json({ error: 'invalid_request', issues: [{ message: 'ids too long' }] }, { status: 400 });
    }
    for(const id of ids) {
      if(!uuidRegex.test(id)) {
        return NextResponse.json({ error: 'invalid_request', issues: [{ message: `invalid uuid: ${id}` }] }, { status: 400 });
      }
    }
  }

  const year: number = Number(parsedParams.data.year);

  try {
    const result = await listEditionEvents({
      year,
      category: parsedQuery.data.category as never,
      q: parsedQuery.data.q,
      genre: parsedQuery.data.genre,
      status: parsedQuery.data.status,
      ids,
      cursor: parsedQuery.data.cursor,
      limit: parsedQuery.data.limit,
    });
    if(result === null) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
  } catch(error) {
    console.error(`[api/editions/${year}/events] internal error:`, error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
