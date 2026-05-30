/* Framework imports ----------------------------------- */
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

/* Module imports (project) ---------------------------- */
import { auth } from './config';

/* Type imports ---------------------------------------- */
import type { Role } from './roles';

/* Type declarations ----------------------------------- */
export type AuthSession = typeof auth.$Infer.Session;

/* Helpers --------------------------------------------- */
/** Returns the current session, or null when unauthenticated. */
export const getSession = async(): Promise<AuthSession | null> => {
  return auth.api.getSession({ headers: await headers() });
};

/** Returns the session, or redirects to /login when unauthenticated. */
export const requireSession = async(): Promise<AuthSession> => {
  const session: AuthSession | null = await getSession();
  if(session === null) {
    redirect('/login');
  }
  return session;
};

/**
 * Requires an authenticated user whose role is in `roles`. Redirects to /login
 * if unauthenticated, or to /admin if authenticated but not permitted. Built
 * for Spec 3's per-section gating; in Spec 2 the /admin landing allows any role.
 */
export const requireRole = async(...roles: Role[]): Promise<AuthSession> => {
  const session: AuthSession = await requireSession();
  const role = session.user.role as Role;
  if(!roles.includes(role)) {
    redirect('/admin');
  }
  return session;
};
