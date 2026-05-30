/* Module imports -------------------------------------- */
import { asc } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../../index';
import { user } from '../../schema';

/* Type imports ---------------------------------------- */
import type { Role } from 'auth/roles';

/* Types ----------------------------------------------- */
export interface AdminUserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  createdAt: string;
}

/* Query ----------------------------------------------- */
export const listUsers = async (): Promise<AdminUserDto[]> => {
  const rows = await db
    .select({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(asc(user.createdAt), asc(user.id));

  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    firstName: r.firstName,
    lastName: r.lastName,
    role: r.role as Role,
    createdAt: r.createdAt.toISOString(),
  }));
};
