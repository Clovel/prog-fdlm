/* Module imports -------------------------------------- */
import { eq } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../index';
import { invitations } from '../schema';
import { hashInviteToken } from 'auth/inviteToken';

/* Type imports ---------------------------------------- */
import type { Role } from 'auth/roles';

/* Types ----------------------------------------------- */
export type InvitationValidation =
  | { valid: true; email: string; role: Role; firstName: string | null; lastName: string | null }
  | { valid: false; reason: 'invalid' | 'expired' | 'used' | 'revoked' };

/* Query ----------------------------------------------- */
export const validateInvitation = async (rawToken: string): Promise<InvitationValidation> => {
  if(rawToken.length === 0) {
    return { valid: false, reason: 'invalid' };
  }
  const hash: string = hashInviteToken(rawToken);
  const rows = await db
    .select({
      email: invitations.email,
      role: invitations.role,
      firstName: invitations.firstName,
      lastName: invitations.lastName,
      status: invitations.status,
      expiresAt: invitations.expiresAt,
    })
    .from(invitations)
    .where(eq(invitations.tokenHash, hash))
    .limit(1);

  const row = rows[0];
  if(row === undefined) {
    return { valid: false, reason: 'invalid' };
  }
  if(row.status === 'accepted') {
    return { valid: false, reason: 'used' };
  }
  if(row.status === 'revoked') {
    return { valid: false, reason: 'revoked' };
  }
  if(row.expiresAt.getTime() <= Date.now()) {
    return { valid: false, reason: 'expired' };
  }
  return {
    valid: true,
    email: row.email,
    role: row.role as Role,
    firstName: row.firstName,
    lastName: row.lastName,
  };
};
