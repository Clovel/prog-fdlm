/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';
import { z } from 'zod';

/* Module imports (project) ---------------------------- */
import { authorizeApi } from 'auth/apiGuard';
import { getSession } from 'auth/helpers';
import { listUserFavorites } from 'db/queries';
import { addFavorites, addAnonymousFavorites } from 'db/mutations/favorites';
import { postFavoritesSchema } from 'validation/favorite';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* Schema ---------------------------------------------- */
const editionIdSchema = z.uuid();

/* GET — list the current user's favorites for an edition --- */
export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const { session, response } = await authorizeApi();
  if(response !== null) {
    return response;
  }
  if(session === null) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const editionId: string | null = new URL(request.url).searchParams.get('editionId');
  if(editionId === null || !editionIdSchema.safeParse(editionId).success) {
    return NextResponse.json({ error: 'invalid_request', message: 'editionId requis' }, { status: 400 });
  }
  try {
    const eventIds: string[] = await listUserFavorites(session.user.id, editionId);
    return NextResponse.json({ eventIds });
  } catch(error) {
    console.error('[api/favorites GET] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};

/* POST — add favorites (authed user, or anonymous device) --- */
export const POST = async (request: NextRequest): Promise<NextResponse> => {
  let body: unknown;
  try {
    body = await request.json();
  } catch(error) {
    console.error('[api/favorites POST] bad json:', error);
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  const parsed = postFavoritesSchema.safeParse(body);
  if(!parsed.success) {
    return NextResponse.json({ error: 'invalid_request', issues: parsed.error.issues }, { status: 400 });
  }
  try {
    const session = await getSession();
    if(session !== null) {
      await addFavorites(session.user.id, parsed.data.eventIds);
      return NextResponse.json({ ok: true }, { status: 201 });
    }
    if(parsed.data.anonId === undefined) {
      return NextResponse.json({ error: 'invalid_request', message: 'anonId requis' }, { status: 400 });
    }
    await addAnonymousFavorites(parsed.data.anonId, parsed.data.eventIds);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch(error) {
    console.error('[api/favorites POST] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
