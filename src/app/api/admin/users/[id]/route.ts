/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';
import { z } from 'zod';

/* Module imports (project) ---------------------------- */
import { authorizeApi } from 'auth/apiGuard';
import { updateUserRole, deleteUser } from 'db/mutations/users';
import { updateRoleSchema } from 'validation/user';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* Schema ---------------------------------------------- */
const idSchema = z.string().uuid();
const LAST_ADMIN_MESSAGE = 'Impossible de retirer le dernier administrateur.';

/* PATCH — change a user's role (admin only) ----------- */
export const PATCH = async (
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
  let body: unknown;
  try {
    body = await request.json();
  } catch(error) {
    console.error('[api/admin/users PATCH] bad json:', error);
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  const parsed = updateRoleSchema.safeParse(body);
  if(!parsed.success) {
    return NextResponse.json({ error: 'invalid_request', issues: parsed.error.issues }, { status: 400 });
  }
  try {
    const result = await updateUserRole(id, parsed.data.role);
    if(result.ok) {
      return NextResponse.json({ ok: true });
    }
    switch(result.reason) {
      case 'not_found':
        return NextResponse.json({ error: 'not_found' }, { status: 404 });
      case 'last_admin':
        return NextResponse.json({ error: 'conflict', message: LAST_ADMIN_MESSAGE }, { status: 409 });
    }
  } catch(error) {
    console.error('[api/admin/users PATCH] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};

/* DELETE — delete a user (admin only) ----------------- */
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
    const result = await deleteUser(id);
    if(result.ok) {
      return NextResponse.json({ ok: true });
    }
    switch(result.reason) {
      case 'not_found':
        return NextResponse.json({ error: 'not_found' }, { status: 404 });
      case 'last_admin':
        return NextResponse.json({ error: 'conflict', message: LAST_ADMIN_MESSAGE }, { status: 409 });
    }
  } catch(error) {
    console.error('[api/admin/users DELETE] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
