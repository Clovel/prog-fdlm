/* Module imports -------------------------------------- */
import { and, eq, sql } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../index';
import { invitations, user } from '../schema';
import { createUserWithCredentials } from '../../auth/createUser';
import { generateInviteToken, hashInviteToken } from '../../auth/inviteToken';

/* Type imports ---------------------------------------- */
import type { Role } from '../../auth/roles';
import type { CreateInvitationInput, AcceptInvitationInput } from 'validation/invitation';

/* Constants ------------------------------------------- */
const EXPIRY_MS: number = 24 * 60 * 60 * 1000;

/* Result types ---------------------------------------- */
export type CreateInvitationResult =
  | { ok: true; id: string; rawToken: string; email: string; role: Role }
  | { ok: false; reason: 'user_exists' | 'already_invited' };

export type ResendResult =
  | { ok: true; rawToken: string; email: string; role: Role }
  | { ok: false; reason: 'not_found' };

export type AcceptResult =
  | { ok: true; email: string }
  | { ok: false; reason: 'invalid' | 'expired' | 'used' | 'revoked' | 'email_taken' };

/* Helpers --------------------------------------------- */
const expiry = (): Date => new Date(Date.now() + EXPIRY_MS);

/* Mutations ------------------------------------------- */
/**
 * Inserts a pending invitation and returns its raw token. Rejects if a user
 * already exists with that email, or a pending invitation already exists.
 * The caller sends the email and deletes the row (deleteInvitationHard) if the
 * send fails — network I/O is kept out of the DB transaction.
 */
export const createInvitation = async (
  input: CreateInvitationInput,
  invitedByUserId: string,
): Promise<CreateInvitationResult> => {
  const email: string = input.email.toLowerCase();
  return db.transaction(async (tx): Promise<CreateInvitationResult> => {
    const existingUser = await tx.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
    if(existingUser.length > 0) {
      return { ok: false, reason: 'user_exists' };
    }
    const pending = await tx
      .select({ id: invitations.id })
      .from(invitations)
      .where(and(eq(invitations.email, email), eq(invitations.status, 'pending')))
      .limit(1);
    if(pending.length > 0) {
      return { ok: false, reason: 'already_invited' };
    }
    const { raw, hash } = generateInviteToken();
    const rows = await tx
      .insert(invitations)
      .values({
        email,
        role: input.role,
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        tokenHash: hash,
        status: 'pending',
        expiresAt: expiry(),
        invitedByUserId,
      })
      .returning({ id: invitations.id });
    const row = rows[0];
    if(row === undefined) {
      throw new Error('createInvitation: insert returned no row');
    }
    return { ok: true, id: row.id, rawToken: raw, email, role: input.role };
  });
};

/** Hard-deletes an invitation (used to roll back when the email send fails). */
export const deleteInvitationHard = async (id: string): Promise<void> => {
  await db.delete(invitations).where(eq(invitations.id, id));
};

/**
 * Regenerates the token + expiry for a pending invitation and returns the new
 * raw token. Returns not_found if the invitation is missing or not pending.
 */
export const resendInvitation = async (id: string): Promise<ResendResult> => {
  return db.transaction(async (tx): Promise<ResendResult> => {
    const rows = await tx
      .select({ email: invitations.email, role: invitations.role, status: invitations.status })
      .from(invitations)
      .where(eq(invitations.id, id))
      .limit(1);
    const row = rows[0];
    if(row === undefined || row.status !== 'pending') {
      return { ok: false, reason: 'not_found' };
    }
    const { raw, hash } = generateInviteToken();
    await tx
      .update(invitations)
      .set({ tokenHash: hash, expiresAt: expiry(), updatedAt: sql`NOW()` })
      .where(eq(invitations.id, id));
    return { ok: true, rawToken: raw, email: row.email, role: row.role as Role };
  });
};

/** Revokes an invitation by id (any status). Returns false if not found. */
export const revokeInvitation = async (id: string): Promise<boolean> => {
  const rows = await db
    .update(invitations)
    .set({ status: 'revoked', updatedAt: sql`NOW()` })
    .where(eq(invitations.id, id))
    .returning({ id: invitations.id });
  return rows.length > 0;
};

/**
 * Accepts an invitation: re-validates the token, ensures the email is still
 * free, creates the user with the invited role, and marks the invitation
 * accepted — all in one transaction so a double-submit cannot create two users.
 */
export const acceptInvitation = async (input: AcceptInvitationInput): Promise<AcceptResult> => {
  const hash: string = hashInviteToken(input.token);
  return db.transaction(async (tx): Promise<AcceptResult> => {
    const rows = await tx
      .select({
        id: invitations.id,
        email: invitations.email,
        role: invitations.role,
        status: invitations.status,
        expiresAt: invitations.expiresAt,
      })
      .from(invitations)
      .where(eq(invitations.tokenHash, hash))
      .limit(1);
    const row = rows[0];
    if(row === undefined) {
      return { ok: false, reason: 'invalid' };
    }
    if(row.status === 'accepted') {
      return { ok: false, reason: 'used' };
    }
    if(row.status === 'revoked') {
      return { ok: false, reason: 'revoked' };
    }
    if(row.expiresAt.getTime() <= Date.now()) {
      return { ok: false, reason: 'expired' };
    }
    const taken = await tx.select({ id: user.id }).from(user).where(eq(user.email, row.email)).limit(1);
    if(taken.length > 0) {
      return { ok: false, reason: 'email_taken' };
    }
    await createUserWithCredentials({
      email: row.email,
      firstName: input.firstName,
      lastName: input.lastName,
      password: input.password,
      role: row.role as Role,
    });
    await tx.update(invitations).set({ status: 'accepted', updatedAt: sql`NOW()` }).where(eq(invitations.id, row.id));
    return { ok: true, email: row.email };
  });
};
