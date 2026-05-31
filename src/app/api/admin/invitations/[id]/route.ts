/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';
import { z } from 'zod';

/* Module imports (project) ---------------------------- */
import { authorizeApi } from 'auth/apiGuard';
import { revokeInvitation } from 'db/mutations/invitations';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* Schema ---------------------------------------------- */
const idSchema = z.string().uuid();

/* DELETE — revoke an invitation (admin only) ---------- */
export const DELETE = async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> => {
  const { response } = await authorizeApi(['admin']);
  if(response !== null) {
    return response;
  }
  const { id } = await params;
  if(!idSchema.safeParse(id).success) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  try {
    const revoked = await revokeInvitation(id);
    if(!revoked) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch(error) {
    console.error('[api/admin/invitations DELETE] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
