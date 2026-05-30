/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';

/* Module imports (project) ---------------------------- */
import { authorizeApi } from 'auth/apiGuard';
import { auth } from 'auth/config';
import { listUsers } from 'db/queries/admin/listUsers';
import { createUser, emailExists } from 'db/mutations/users';
import { createUserSchema } from 'validation/user';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* GET — list all users (admin only; PII) -------------- */
export const GET = async (): Promise<NextResponse> => {
  const { response } = await authorizeApi(['admin']);
  if(response !== null) {
    return response;
  }
  try {
    const users = await listUsers();
    return NextResponse.json({ users });
  } catch(error) {
    console.error('[api/admin/users GET] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};

/* POST — create a user (admin only) ------------------- */
export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const { response } = await authorizeApi(['admin']);
  if(response !== null) {
    return response;
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch(error) {
    console.error('[api/admin/users POST] bad json:', error);
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  const parsed = createUserSchema.safeParse(body);
  if(!parsed.success) {
    return NextResponse.json({ error: 'invalid_request', issues: parsed.error.issues }, { status: 400 });
  }
  try {
    if(await emailExists(parsed.data.email)) {
      return NextResponse.json({ error: 'conflict', message: 'Cet e-mail existe déjà.' }, { status: 409 });
    }
    const id = await createUser(parsed.data);
    if(parsed.data.sendResetEmail) {
      try {
        const origin: string = new URL(request.url).origin;
        await auth.api.requestPasswordReset({
          body: { email: parsed.data.email.toLowerCase(), redirectTo: `${origin}/reset-password` },
        });
      } catch(mailError) {
        console.error('[api/admin/users POST] reset email failed (non-fatal):', mailError);
      }
    }
    return NextResponse.json({ user: { id } }, { status: 201 });
  } catch(error) {
    console.error('[api/admin/users POST] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
