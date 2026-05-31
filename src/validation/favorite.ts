/* Module imports -------------------------------------- */
import { z } from 'zod';

/* Schemas --------------------------------------------- */
export const postFavoritesSchema = z.object({
  eventIds: z.array(z.uuid()).min(1).max(200),
});

export const eventIdParamSchema = z.object({
  eventId: z.uuid(),
});

/* Inferred types -------------------------------------- */
export type PostFavoritesInput = z.infer<typeof postFavoritesSchema>;
