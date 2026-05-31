/* Module imports -------------------------------------- */
import { randomBytes, createHash } from 'crypto';

/* Helpers --------------------------------------------- */
/** SHA-256 hex of a raw token, for storage and lookup. */
export const hashInviteToken = (raw: string): string => {
  return createHash('sha256').update(raw).digest('hex');
};

/** Generates a high-entropy URL-safe token and its SHA-256 hex hash. Only the
 *  hash is persisted; the raw token travels solely in the invitation email. */
export const generateInviteToken = (): { raw: string; hash: string } => {
  const raw: string = randomBytes(32).toString('base64url');
  const hash: string = hashInviteToken(raw);
  return { raw, hash };
};
