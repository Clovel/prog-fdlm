/* Module imports -------------------------------------- */
import { z } from 'zod';

/* Schemas --------------------------------------------- */
const dayOfFestivalSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date au format AAAA-MM-JJ');
const descriptionSchema = z.string().trim().max(2000).optional();

/** Create: year is set once (immutable afterwards). */
export const createEditionSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  description: descriptionSchema,
  dayOfFestival: dayOfFestivalSchema,
  isPublished: z.boolean().default(true),
});

/** Update: year omitted (immutable). */
export const updateEditionSchema = z.object({
  description: descriptionSchema,
  dayOfFestival: dayOfFestivalSchema,
  isPublished: z.boolean(),
});

/* Inferred types -------------------------------------- */
export type CreateEditionInput = z.infer<typeof createEditionSchema>;
export type UpdateEditionInput = z.infer<typeof updateEditionSchema>;
