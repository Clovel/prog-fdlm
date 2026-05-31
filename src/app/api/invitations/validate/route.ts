/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';

/* Module imports (project) ---------------------------- */
import { validateInvitation } from 'db/queries/validateInvitation';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* GET — validate an invitation token (public) --------- */
export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const token = new URL(request.url).searchParams.get('token');
  if(token === null || token.length === 0) {
    return NextResponse.json({ valid: false, reason: 'invalid' });
  }
  try {
    const result = await validateInvitation(token);
    return NextResponse.json(result);
  } catch(error) {
    console.error('[api/invitations/validate] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
