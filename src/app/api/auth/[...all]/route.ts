/* Module imports (project) ---------------------------- */
import { toNextJsHandler } from 'better-auth/next-js';

import { auth } from 'auth/config';

/* Route ----------------------------------------------- */
export const { GET, POST } = toNextJsHandler(auth);
