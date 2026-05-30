/* Module imports -------------------------------------- */
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';

/* Module imports (project) ---------------------------- */
import { db } from 'db';
import * as schema from 'db/schema';
import { sendResetPasswordEmail } from './email';
import { DEFAULT_ROLE } from './roles';

/* BetterAuth server instance -------------------------- */
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    requireEmailVerification: false,
    minPasswordLength: 12,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async({ user, url }): Promise<void> => {
      await sendResetPasswordEmail(user.email, url);
    },
  },
  user: {
    additionalFields: {
      firstName: { type: 'string', required: true },
      lastName: { type: 'string', required: true },
      role: { type: 'string', required: false, defaultValue: DEFAULT_ROLE, input: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  advanced: {
    database: {
      generateId: 'uuid',
    },
  },
  plugins: [
    nextCookies(),
  ],
});
