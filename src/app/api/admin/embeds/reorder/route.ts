/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';

/* Module imports (project) ---------------------------- */
import { authorizeApi } from 'auth/apiGuard';
import { reorderEditionEmbeds } from 'db/mutations/editionEmbeds';
import { reorderEmbedsSchema } from 'validation/editionEmbed';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* POST — reorder an edition's embeds (admin only) ----- */
export const POST = async(request: NextRequest): Promise<NextResponse> => {
  const { response } = await authorizeApi(['admin']);
  if(response !== null) {
    return response;
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch(error) {
    console.error('[api/admin/embeds/reorder POST] bad json:', error);
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  const parsed = reorderEmbedsSchema.safeParse(body);
  if(!parsed.success) {
    return NextResponse.json({ error: 'invalid_request', issues: parsed.error.issues }, { status: 400 });
  }
  try {
    const ok = await reorderEditionEmbeds(parsed.data.editionId, parsed.data.orderedIds);
    if(!ok) {
      return NextResponse.json({ error: 'invalid_request', message: 'orderedIds ne correspond pas aux embeds de cette édition' }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch(error) {
    console.error('[api/admin/embeds/reorder POST] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
