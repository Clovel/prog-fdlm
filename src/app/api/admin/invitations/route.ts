/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';

/* Module imports (project) ---------------------------- */
import { authorizeApi } from 'auth/apiGuard';
import { listInvitations } from 'db/queries/admin/listInvitations';
import { createInvitation, deleteInvitationHard } from 'db/mutations/invitations';
import { sendInvitationEmail } from 'auth/email';
import { createInvitationSchema } from 'validation/invitation';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* GET — list non-accepted invitations (admin only) ---- */
export const GET = async (): Promise<NextResponse> => {
  const { response } = await authorizeApi(['admin']);
  if(response !== null) {
    return response;
  }
  try {
    const invitationsList = await listInvitations();
    return NextResponse.json({ invitations: invitationsList });
  } catch(error) {
    console.error('[api/admin/invitations GET] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};

/* POST — create an invitation + send email (admin only) */
export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const { session, response } = await authorizeApi(['admin']);
  if(response !== null || session === null) {
    return response ?? NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch(error) {
    console.error('[api/admin/invitations POST] bad json:', error);
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  const parsed = createInvitationSchema.safeParse(body);
  if(!parsed.success) {
    return NextResponse.json({ error: 'invalid_request', issues: parsed.error.issues }, { status: 400 });
  }
  try {
    const result = await createInvitation(parsed.data, session.user.id);
    if(!result.ok) {
      switch(result.reason) {
        case 'user_exists':
          return NextResponse.json({ error: 'conflict', message: 'Un utilisateur avec cet e-mail existe déjà.' }, { status: 409 });
        case 'already_invited':
          return NextResponse.json({ error: 'conflict', message: 'Une invitation est déjà en attente pour cet e-mail.' }, { status: 409 });
      }
    }
    const origin: string = new URL(request.url).origin;
    try {
      await sendInvitationEmail(result.email, `${origin}/invite/${result.rawToken}`, result.role);
    } catch(mailError) {
      console.error('[api/admin/invitations POST] email failed, rolling back:', mailError);
      await deleteInvitationHard(result.id);
      return NextResponse.json({ error: 'email_failed', message: "L'e-mail d'invitation n'a pas pu être envoyé." }, { status: 502 });
    }
    return NextResponse.json({ invitation: { id: result.id } }, { status: 201 });
  } catch(error) {
    console.error('[api/admin/invitations POST] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
