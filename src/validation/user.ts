/* Module imports -------------------------------------- */
import { z } from 'zod';

/* Module imports (project) ---------------------------- */
import { roleSchema } from 'auth/roles';

/* Schemas --------------------------------------------- */
export const createUserSchema = z.object({
  email: z.email(),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  password: z.string().min(12, '12 caractères minimum'),
  role: roleSchema,
  sendResetEmail: z.boolean(),
});

export const updateRoleSchema = z.object({
  role: roleSchema,
});

/* Inferred types -------------------------------------- */
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
