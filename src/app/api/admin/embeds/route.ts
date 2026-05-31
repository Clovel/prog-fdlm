/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';
import { z } from 'zod';

/* Module imports (project) ---------------------------- */
import { authorizeApi } from 'auth/apiGuard';
import { listEditionEmbeds } from 'db/queries/admin/listEditionEmbeds';
import { createEditionEmbed } from 'db/mutations/editionEmbeds';
import { createEditionEmbedSchema } from 'validation/editionEmbed';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* Schema ---------------------------------------------- */
const editionIdSchema = z.uuid();

/* GET — list one edition's embeds (admin only) -------- */
export const GET = async(request: NextRequest): Promise<NextResponse> => {
  const { response } = await authorizeApi(['admin']);
  if(response !== null) {
    return response;
  }
  const editionId = new URL(request.url).searchParams.get('editionId');
  if(editionId === null || !editionIdSchema.safeParse(editionId).success) {
    return NextResponse.json({ error: 'invalid_request', message: 'editionId requis' }, { status: 400 });
  }
  try {
    const embeds = await listEditionEmbeds(editionId);
    return NextResponse.json({ embeds });
  } catch(error) {
    console.error('[api/admin/embeds GET] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};

/* POST — create an embed (admin only) ----------------- */
export const POST = async(request: NextRequest): Promise<NextResponse> => {
  const { response } = await authorizeApi(['admin']);
  if(response !== null) {
    return response;
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch(error) {
    console.error('[api/admin/embeds POST] bad json:', error);
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  const parsed = createEditionEmbedSchema.safeParse(body);
  if(!parsed.success) {
    return NextResponse.json({ error: 'invalid_request', issues: parsed.error.issues }, { status: 400 });
  }
  try {
    const embed = await createEditionEmbed(parsed.data);
    return NextResponse.json({ embed }, { status: 201 });
  } catch(error) {
    console.error('[api/admin/embeds POST] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
