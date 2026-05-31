/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';
import { z } from 'zod';

/* Module imports (project) ---------------------------- */
import { getSession } from 'auth/helpers';
import { removeFavorite, removeAnonymousFavorite } from 'db/mutations/favorites';
import { eventIdParamSchema } from 'validation/favorite';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* DELETE — remove one favorite (authed user, or anonymous device) --- */
export const DELETE = async (
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
): Promise<NextResponse> => {
  const parsed = eventIdParamSchema.safeParse(await params);
  if(!parsed.success) {
    return NextResponse.json({ error: 'invalid_request', issues: parsed.error.issues }, { status: 400 });
  }
  try {
    const session = await getSession();
    if(session !== null) {
      await removeFavorite(session.user.id, parsed.data.eventId);
      return NextResponse.json({ ok: true });
    }
    const rawAnonId: string | null = new URL(request.url).searchParams.get('anonId');
    const anonParsed = z.uuid().safeParse(rawAnonId);
    if(!anonParsed.success) {
      return NextResponse.json({ error: 'invalid_request', message: 'anonId requis' }, { status: 400 });
    }
    await removeAnonymousFavorite(anonParsed.data, parsed.data.eventId);
    return NextResponse.json({ ok: true });
  } catch(error) {
    console.error('[api/favorites DELETE] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
