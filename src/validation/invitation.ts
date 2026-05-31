/* Module imports -------------------------------------- */
import { z } from 'zod';

/* Module imports (project) ---------------------------- */
import { roleSchema } from 'auth/roles';

/* Schemas --------------------------------------------- */
export const createInvitationSchema = z.object({
  email: z.email(),
  role: roleSchema,
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(1),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  password: z.string().min(12, '12 caractères minimum'),
});

/* Inferred types -------------------------------------- */
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
