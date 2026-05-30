/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';

/* Module imports (project) ---------------------------- */
import { listEditions } from 'db/queries';

/* Route ----------------------------------------------- */
export const GET = async (): Promise<NextResponse> => {
  try {
    const list = await listEditions();
    return NextResponse.json(
      { editions: list },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      },
    );
  } catch(error) {
    console.error('[api/editions] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
