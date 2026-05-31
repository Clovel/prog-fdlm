/* Module imports (project) ---------------------------- */
import { oAuthDiscoveryMetadata } from 'better-auth/plugins';
import { auth } from 'auth/config';

/* GET — OAuth 2.1 authorization-server metadata ------- */
export const GET = oAuthDiscoveryMetadata(auth);
