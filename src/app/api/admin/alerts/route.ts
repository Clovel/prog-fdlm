/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';
import { z } from 'zod';

/* Module imports (project) ---------------------------- */
import { authorizeApi } from 'auth/apiGuard';
import { listEditionAlerts } from 'db/queries/admin/listEditionAlerts';
import { createGeneralAlert } from 'db/mutations/generalAlerts';
import { createGeneralAlertSchema } from 'validation/generalAlert';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* Schema ---------------------------------------------- */
const editionIdSchema = z.uuid();

/* GET — list one edition's alerts (any auth role) ----- */
export const GET = async(request: NextRequest): Promise<NextResponse> => {
  const { response } = await authorizeApi();
  if(response !== null) {
    return response;
  }
  const editionId = new URL(request.url).searchParams.get('editionId');
  if(editionId === null || !editionIdSchema.safeParse(editionId).success) {
    return NextResponse.json({ error: 'invalid_request', message: 'editionId requis' }, { status: 400 });
  }
  try {
    const alerts = await listEditionAlerts(editionId);
    return NextResponse.json({ alerts });
  } catch(error) {
    console.error('[api/admin/alerts GET] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};

/* POST — create an alert (admin only) ----------------- */
export const POST = async(request: NextRequest): Promise<NextResponse> => {
  const { response } = await authorizeApi(['admin']);
  if(response !== null) {
    return response;
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch(error) {
    console.error('[api/admin/alerts POST] bad json:', error);
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  const parsed = createGeneralAlertSchema.safeParse(body);
  if(!parsed.success) {
    return NextResponse.json({ error: 'invalid_request', issues: parsed.error.issues }, { status: 400 });
  }
  try {
    const alert = await createGeneralAlert(parsed.data);
    return NextResponse.json({ alert }, { status: 201 });
  } catch(error) {
    console.error('[api/admin/alerts POST] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
