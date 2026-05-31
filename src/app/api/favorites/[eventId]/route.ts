/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';

/* Module imports (project) ---------------------------- */
import { authorizeApi } from 'auth/apiGuard';
import { removeFavorite } from 'db/mutations/favorites';
import { eventIdParamSchema } from 'validation/favorite';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* DELETE — remove one favorite ------------------------ */
export const DELETE = async (
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
): Promise<NextResponse> => {
  const { session, response } = await authorizeApi();
  if(response !== null) {
    return response;
  }
  if(session === null) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const parsed = eventIdParamSchema.safeParse(await params);
  if(!parsed.success) {
    return NextResponse.json({ error: 'invalid_request', issues: parsed.error.issues }, { status: 400 });
  }
  try {
    await removeFavorite(session.user.id, parsed.data.eventId);
    return NextResponse.json({ ok: true });
  } catch(error) {
    console.error('[api/favorites DELETE] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
