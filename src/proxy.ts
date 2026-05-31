/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* Proxy ----------------------------------------------- */
/**
 * Optimistic gate for /admin/*: redirects to /login when no session cookie is
 * present. NOT authoritative — the /admin server layout does the real session
 * check. The proxy runs on the edge and only inspects cookie presence.
 */
export const proxy = (request: NextRequest): NextResponse => {
  const sessionCookie: string | null = getSessionCookie(request);
  if(sessionCookie === null) {
    const loginUrl: URL = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
};

export const config = {
  matcher: ['/admin/:path*'],
};
