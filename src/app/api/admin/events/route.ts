/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';
import { z } from 'zod';

/* Module imports (project) ---------------------------- */
import { authorizeApi } from 'auth/apiGuard';
import { listEditionEventsAdmin } from 'db/queries/admin/listEditionEventsAdmin';
import { createEventWithChildren } from 'db/mutations/events';
import { createEventSchema } from 'validation/event';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* Schema ---------------------------------------------- */
const editionIdSchema = z.string().uuid();

/* GET — list one edition's events (any auth role) ----- */
export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const { response } = await authorizeApi();
  if(response !== null) {
    return response;
  }
  const editionId = new URL(request.url).searchParams.get('editionId');
  if(editionId === null || !editionIdSchema.safeParse(editionId).success) {
    return NextResponse.json({ error: 'invalid_request', message: 'editionId requis' }, { status: 400 });
  }
  try {
    const list = await listEditionEventsAdmin(editionId);
    return NextResponse.json({ events: list });
  } catch(error) {
    console.error('[api/admin/events GET] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};

/* POST — create an event (admin+editor) --------------- */
export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const { response } = await authorizeApi(['admin', 'editor']);
  if(response !== null) {
    return response;
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch(error) {
    console.error('[api/admin/events POST] bad json:', error);
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  const parsed = createEventSchema.safeParse(body);
  if(!parsed.success) {
    return NextResponse.json({ error: 'invalid_request', issues: parsed.error.issues }, { status: 400 });
  }
  try {
    const id = await createEventWithChildren(parsed.data);
    return NextResponse.json({ id }, { status: 201 });
  } catch(error) {
    console.error('[api/admin/events POST] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
