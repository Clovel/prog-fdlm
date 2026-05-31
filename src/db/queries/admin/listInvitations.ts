/* Module imports -------------------------------------- */
import { desc, ne, eq } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../../index';
import { invitations, user } from '../../schema';

/* Type imports ---------------------------------------- */
import type { Role } from 'auth/roles';

/* Types ----------------------------------------------- */
export interface AdminInvitationDto {
  id: string;
  email: string;
  role: Role;
  firstName: string | null;
  lastName: string | null;
  status: 'pending' | 'accepted' | 'revoked';
  expiresAt: string;
  isExpired: boolean;
  invitedByEmail: string | null;
  createdAt: string;
}

/* Query ----------------------------------------------- */
export const listInvitations = async (): Promise<AdminInvitationDto[]> => {
  const rows = await db
    .select({
      id: invitations.id,
      email: invitations.email,
      role: invitations.role,
      firstName: invitations.firstName,
      lastName: invitations.lastName,
      status: invitations.status,
      expiresAt: invitations.expiresAt,
      createdAt: invitations.createdAt,
      invitedByEmail: user.email,
    })
    .from(invitations)
    .leftJoin(user, eq(invitations.invitedByUserId, user.id))
    .where(ne(invitations.status, 'accepted'))
    .orderBy(desc(invitations.createdAt));

  const now: number = Date.now();
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    role: r.role as Role,
    firstName: r.firstName,
    lastName: r.lastName,
    status: r.status as AdminInvitationDto['status'],
    expiresAt: r.expiresAt.toISOString(),
    isExpired: r.status === 'pending' && r.expiresAt.getTime() <= now,
    invitedByEmail: r.invitedByEmail,
    createdAt: r.createdAt.toISOString(),
  }));
};
