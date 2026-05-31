/* Module imports -------------------------------------- */
import { z } from 'zod';

/* Schemas --------------------------------------------- */
export const postFavoritesSchema = z.object({
  eventIds: z.array(z.uuid()).min(1).max(200),
  anonId: z.uuid().optional(),
});

export const eventIdParamSchema = z.object({
  eventId: z.uuid(),
});

export const claimFavoritesSchema = z.object({
  anonId: z.uuid(),
});

/* Inferred types -------------------------------------- */
export type PostFavoritesInput = z.infer<typeof postFavoritesSchema>;
export type ClaimFavoritesInput = z.infer<typeof claimFavoritesSchema>;
