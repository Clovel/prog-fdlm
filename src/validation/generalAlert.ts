/* Module imports -------------------------------------- */
import { z } from 'zod';

/* Schemas --------------------------------------------- */
const variantEnum = z.enum(['default', 'destructive', 'warning', 'success']);

const coreShape = {
  variant: variantEnum,
  title: z.string().trim().max(200).optional(),
  content: z.string().trim().min(1, 'Contenu requis').max(2000),
  isPublished: z.boolean(),
};

export const createGeneralAlertSchema = z.object({
  ...coreShape,
  editionId: z.uuid(),
});

export const updateGeneralAlertSchema = z.object(coreShape);

export const reorderAlertsSchema = z.object({
  editionId: z.uuid(),
  orderedIds: z.array(z.uuid()).min(1),
});

/* Inferred types -------------------------------------- */
export type CreateGeneralAlertInput = z.infer<typeof createGeneralAlertSchema>;
export type UpdateGeneralAlertInput = z.infer<typeof updateGeneralAlertSchema>;
export type ReorderAlertsInput = z.infer<typeof reorderAlertsSchema>;
