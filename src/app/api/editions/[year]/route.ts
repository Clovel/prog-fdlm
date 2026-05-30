/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';
import { z } from 'zod';

/* Module imports (project) ---------------------------- */
import { getEdition } from 'db/queries';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* Schema ---------------------------------------------- */
const paramsSchema = z.object({
  year: z.string().regex(/^\d{4}$/),
});

/* Route ----------------------------------------------- */
export const GET = async (
  _request: NextRequest,
  { params }: { params: Promise<{ year: string }> },
): Promise<NextResponse> => {
  const raw = await params;
  const parsed = paramsSchema.safeParse(raw);
  if(!parsed.success) {
    return NextResponse.json({ error: 'invalid_request', issues: parsed.error.issues }, { status: 400 });
  }
  const year: number = Number(parsed.data.year);
  try {
    const result = await getEdition(year);
    if(result === null) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
  } catch(error) {
    console.error(`[api/editions/${year}] internal error:`, error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
