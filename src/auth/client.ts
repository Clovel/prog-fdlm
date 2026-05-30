'use client';

/* Module imports -------------------------------------- */
import { createAuthClient } from 'better-auth/react';

/* BetterAuth browser client --------------------------- */
/**
 * Reads its base URL from the current origin. Used by login, logout, and the
 * password-reset pages. Spec 2 only needs signIn/signOut/requestPasswordReset/
 * resetPassword, so no additional-field inference plugin is required.
 */
export const authClient = createAuthClient();
