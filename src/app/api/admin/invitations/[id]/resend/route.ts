/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';
import { z } from 'zod';

/* Module imports (project) ---------------------------- */
import { authorizeApi } from 'auth/apiGuard';
import { resendInvitation } from 'db/mutations/invitations';
import { sendInvitationEmail } from 'auth/email';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* Schema ---------------------------------------------- */
const idSchema = z.string().uuid();

/* POST — regenerate token + resend email (admin only) - */
export const POST = async (
  request: NextRequest,
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
    const result = await resendInvitation(id);
    if(!result.ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    const origin: string = new URL(request.url).origin;
    try {
      await sendInvitationEmail(result.email, `${origin}/invite/${result.rawToken}`, result.role);
    } catch(mailError) {
      console.error('[api/admin/invitations resend] email failed:', mailError);
      return NextResponse.json({ error: 'email_failed', message: "L'e-mail n'a pas pu être renvoyé." }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch(error) {
    console.error('[api/admin/invitations resend] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
