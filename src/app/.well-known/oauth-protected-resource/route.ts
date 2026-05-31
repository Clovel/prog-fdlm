/* Module imports (project) ---------------------------- */
import { oAuthProtectedResourceMetadata } from 'better-auth/plugins';
import { auth } from 'auth/config';

/* GET — OAuth protected-resource metadata (RFC 9728) -- */
export const GET = oAuthProtectedResourceMetadata(auth);
