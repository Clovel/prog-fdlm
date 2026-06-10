/* Module imports -------------------------------------- */
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { mcp } from 'better-auth/plugins';

/* Module imports (project) ---------------------------- */
import { db } from 'db';
import * as schema from 'db/schema';
import { sendResetPasswordEmail } from './email';
import { DEFAULT_ROLE } from './roles';

/* Trusted origins ------------------------------------- */
// Comma-separated allowlist of origins whose requests pass the CSRF origin
// check (custom domains, Vercel previews, localhost). BetterAuth already trusts
// its own `baseURL` (BETTER_AUTH_URL) on top of these.
const trustedOrigins: string[] = (process.env.TRUSTED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

/* BetterAuth server instance -------------------------- */
export const auth = betterAuth({
  trustedOrigins,
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
    mcp({ loginPage: '/login' }),
    nextCookies(),
  ],
});
