/* Module imports -------------------------------------- */
import { eq, sql } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../index';
import { user } from '../schema';
import { createUserWithCredentials } from '../../auth/createUser';

/* Type imports ---------------------------------------- */
import type { Role } from '../../auth/roles';
import type { CreateUserInput } from 'validation/user';

/* Result types ---------------------------------------- */
export type MutationResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'last_admin' };

/* Helpers --------------------------------------------- */
/** Case-insensitive existence check (emails are stored lowercased). */
export const emailExists = async(email: string): Promise<boolean> => {
  const rows = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email.toLowerCase()))
    .limit(1);
  return rows.length > 0;
};

/* Mutations ------------------------------------------- */
/**
 * Creates a user + credential account (delegates to BetterAuth). The caller is
 * responsible for the duplicate-email pre-check (emailExists -> 409). Returns
 * the new user id. The `sendResetEmail` flag is handled by the route, not here.
 */
export const createUser = async(input: Omit<CreateUserInput, 'sendResetEmail'>): Promise<string> => {
  return createUserWithCredentials({
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    password: input.password,
    role: input.role,
  });
};

/**
 * Changes a user's role. Refuses to demote the final admin (last_admin).
 * Returns not_found if no such user. Runs in a transaction so the admin count
 * and the update are consistent.
 */
export const updateUserRole = async(id: string, role: Role): Promise<MutationResult> => {
  return db.transaction(async(tx): Promise<MutationResult> => {
    const rows = await tx.select({ role: user.role }).from(user).where(eq(user.id, id)).limit(1);
    const target = rows[0];
    if(target === undefined) {
      return { ok: false, reason: 'not_found' };
    }
    const demotingAdmin: boolean = target.role === 'admin' && role !== 'admin';
    if(demotingAdmin) {
      const admins = await tx
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(user)
        .where(eq(user.role, 'admin'));
      if((admins[0]?.count ?? 0) <= 1) {
        return { ok: false, reason: 'last_admin' };
      }
    }
    await tx.update(user).set({ role, updatedAt: sql`NOW()` }).where(eq(user.id, id));
    return { ok: true };
  });
};

/**
 * Deletes a user (sessions/accounts cascade). Refuses to delete the final
 * admin (last_admin). Returns not_found if no such user.
 */
export const deleteUser = async(id: string): Promise<MutationResult> => {
  return db.transaction(async(tx): Promise<MutationResult> => {
    const rows = await tx.select({ role: user.role }).from(user).where(eq(user.id, id)).limit(1);
    const target = rows[0];
    if(target === undefined) {
      return { ok: false, reason: 'not_found' };
    }
    if(target.role === 'admin') {
      const admins = await tx
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(user)
        .where(eq(user.role, 'admin'));
      if((admins[0]?.count ?? 0) <= 1) {
        return { ok: false, reason: 'last_admin' };
      }
    }
    await tx.delete(user).where(eq(user.id, id));
    return { ok: true };
  });
};
