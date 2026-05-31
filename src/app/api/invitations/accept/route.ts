/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';

/* Module imports (project) ---------------------------- */
import { acceptInvitation } from 'db/mutations/invitations';
import { acceptInvitationSchema } from 'validation/invitation';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* POST — accept an invitation, create the user (public) */
export const POST = async (request: NextRequest): Promise<NextResponse> => {
  let body: unknown;
  try {
    body = await request.json();
  } catch(error) {
    console.error('[api/invitations/accept] bad json:', error);
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  const parsed = acceptInvitationSchema.safeParse(body);
  if(!parsed.success) {
    return NextResponse.json({ error: 'invalid_request', issues: parsed.error.issues }, { status: 400 });
  }
  try {
    const result = await acceptInvitation(parsed.data);
    if(!result.ok) {
      if(result.reason === 'email_taken') {
        return NextResponse.json({ error: 'conflict', message: 'Un compte existe déjà pour cet e-mail.' }, { status: 409 });
      }
      return NextResponse.json({ error: 'invalid_invitation', reason: result.reason, message: 'Cette invitation est invalide ou expirée.' }, { status: 400 });
    }
    return NextResponse.json({ ok: true, email: result.email });
  } catch(error) {
    console.error('[api/invitations/accept] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
