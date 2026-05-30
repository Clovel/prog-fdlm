/* Module imports -------------------------------------- */
import { createHash } from 'crypto';

/* Helpers --------------------------------------------- */
/**
 * Builds a Gravatar URL for an email. `d=404` makes the request fail when the
 * email has no Gravatar, so the UI can fall through to an initials fallback.
 * Server-only — uses Node's crypto.
 */
export const gravatarUrl = (email: string, size = 80): string => {
  const hash: string = createHash('sha256')
    .update(email.trim().toLowerCase())
    .digest('hex');
  return `https://www.gravatar.com/avatar/${hash}?d=404&s=${size}`;
};
