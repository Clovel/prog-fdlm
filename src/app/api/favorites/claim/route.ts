/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';

/* Module imports (project) ---------------------------- */
import { authorizeApi } from 'auth/apiGuard';
import { claimAnonymousFavorites } from 'db/mutations/favorites';
import { claimFavoritesSchema } from 'validation/favorite';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* POST — fold this device's anonymous favorites into the user --- */
export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const { session, response } = await authorizeApi();
  if(response !== null) {
    return response;
  }
  if(session === null) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch(error) {
    console.error('[api/favorites/claim POST] bad json:', error);
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  const parsed = claimFavoritesSchema.safeParse(body);
  if(!parsed.success) {
    return NextResponse.json({ error: 'invalid_request', issues: parsed.error.issues }, { status: 400 });
  }
  try {
    await claimAnonymousFavorites(session.user.id, parsed.data.anonId);
    return NextResponse.json({ ok: true });
  } catch(error) {
    console.error('[api/favorites/claim POST] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
