/* Module imports -------------------------------------- */
import { z } from 'zod';

/* Schemas --------------------------------------------- */
const platformEnum = z.enum(['instagram', 'facebook']);

const coreShape = {
  platform: platformEnum,
  url: z.url('URL invalide'),
  isPublished: z.boolean(),
};

export const createEditionEmbedSchema = z.object({
  ...coreShape,
  editionId: z.uuid(),
});

export const updateEditionEmbedSchema = z.object(coreShape);

export const reorderEmbedsSchema = z.object({
  editionId: z.uuid(),
  orderedIds: z.array(z.uuid()).min(1),
});

/* Inferred types -------------------------------------- */
export type CreateEditionEmbedInput = z.infer<typeof createEditionEmbedSchema>;
export type UpdateEditionEmbedInput = z.infer<typeof updateEditionEmbedSchema>;
export type ReorderEmbedsInput = z.infer<typeof reorderEmbedsSchema>;
