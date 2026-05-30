/* Framework imports ----------------------------------- */
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

/* Module imports (project) ---------------------------- */
import { auth } from './config';
import { isRole } from './roles';

/* Type imports ---------------------------------------- */
import type { Role } from './roles';
import type { AuthSession } from './helpers';

/* Type declarations ----------------------------------- */
export interface AuthorizeResult {
  session: AuthSession | null;
  response: NextResponse | null;
}

/* Helper ---------------------------------------------- */
/**
 * API-route authorization. Returns `{ session }` on success, or `{ response }`
 * carrying a 401 (no session) / 403 (role not allowed). Pass no roles (or an
 * empty array) to require only an authenticated session.
 */
export const authorizeApi = async(allowedRoles: Role[] = []): Promise<AuthorizeResult> => {
  const session: AuthSession | null = await auth.api.getSession({ headers: await headers() });
  if(session === null) {
    return { session: null, response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };
  }
  if(allowedRoles.length > 0) {
    const role: string = session.user.role as string;
    if(!isRole(role) || !allowedRoles.includes(role)) {
      return { session: null, response: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
    }
  }
  return { session, response: null };
};
