/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';

/* Module imports (project) ---------------------------- */
import { authorizeApi } from 'auth/apiGuard';
import { listAllEditions } from 'db/queries/admin/listAllEditions';
import { createEdition, editionYearExists } from 'db/mutations/editions';
import { createEditionSchema } from 'validation/edition';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* GET — list all editions (any authenticated role) ---- */
export const GET = async (): Promise<NextResponse> => {
  const { response } = await authorizeApi();
  if(response !== null) {
    return response;
  }
  try {
    const editionsList = await listAllEditions();
    return NextResponse.json({ editions: editionsList });
  } catch(error) {
    console.error('[api/admin/editions GET] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};

/* POST — create an edition (admin only) --------------- */
export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const { response } = await authorizeApi(['admin']);
  if(response !== null) {
    return response;
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch(error) {
    console.error('[api/admin/editions POST] bad json:', error);
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  const parsed = createEditionSchema.safeParse(body);
  if(!parsed.success) {
    return NextResponse.json({ error: 'invalid_request', issues: parsed.error.issues }, { status: 400 });
  }
  try {
    if(await editionYearExists(parsed.data.year)) {
      return NextResponse.json({ error: 'conflict', message: 'Cette année existe déjà.' }, { status: 409 });
    }
    const edition = await createEdition(parsed.data);
    return NextResponse.json({ edition }, { status: 201 });
  } catch(error) {
    console.error('[api/admin/editions POST] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
