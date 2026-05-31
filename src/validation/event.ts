/* Module imports -------------------------------------- */
import { z } from 'zod';

/* Module imports (project) ---------------------------- */
import { eventCategories } from 'types/eventCategories';

/* Shared enums ---------------------------------------- */
const categoryEnum = z.enum(eventCategories as unknown as [string, ...string[]]);
const statusEnum = z.enum(['canceled', 'postponed', 'rescheduled']);
const platformEnum = z.enum(['instagram', 'facebook']);
const variantEnum = z.enum(['default', 'destructive', 'warning', 'success']);

/* Shared child schemas (identical for form + API) ----- */
export const eventLinkSchema = z.object({
  url: z.url('URL invalide'),
  label: z.string().trim().min(1, 'Libellé requis').max(200),
});

export const eventEmbedLinkSchema = z.object({
  platform: platformEnum,
  url: z.url('URL invalide'),
});

export const eventAlertSchema = z.object({
  variant: variantEnum,
  title: z.string().trim().max(200).optional(),
  content: z.string().trim().min(1, 'Contenu requis').max(2000),
});

/* Core (shared field set, no datetime) ---------------- */
const coreShape = {
  name: z.string().trim().max(300).optional(),
  description: z.string().max(10000).optional(),
  category: categoryEnum.optional(),
  status: statusEnum.optional(),
  genres: z.array(z.string().trim().min(1)).default([]),
  artists: z.array(z.string().trim().min(1)).default([]),
  priceText: z.string().trim().max(200).optional(),
  locationName: z.string().trim().min(1, 'Lieu requis').max(300),
  locationAddress: z.string().trim().max(500).optional(),
  links: z.array(eventLinkSchema).default([]),
  embedLinks: z.array(eventEmbedLinkSchema).default([]),
  alerts: z.array(eventAlertSchema).default([]),
};

/* Form schema (datetime-local strings) ---------------- */
const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Date/heure requise');
export const eventFormSchema = z.object({
  ...coreShape,
  startTime: localDateTime,
  endTime: z.union([localDateTime, z.literal('')]).optional(),
}).refine(
  (v) => v.endTime === undefined || v.endTime === '' || v.endTime >= v.startTime,
  { message: 'La fin doit être après le début.', path: ['endTime'] },
);
export type EventFormValues = z.infer<typeof eventFormSchema>;

/* API schemas (ISO instants) -------------------------- */
const isoDateTime = z.iso.datetime({ offset: true });
const apiCore = {
  ...coreShape,
  startTime: isoDateTime,
  endTime: isoDateTime.nullable().optional(),
};
const endAfterStart = (v: { startTime: string; endTime?: string | null }): boolean =>
  v.endTime === undefined || v.endTime === null || new Date(v.endTime) >= new Date(v.startTime);

/* Pre-refine objects (exported so .shape is available for MCP tools) */
export const createEventObject = z.object({
  ...apiCore,
  editionId: z.string().uuid(),
});
export const updateEventObject = z.object(apiCore);

export const createEventSchema = createEventObject
  .refine(endAfterStart, { message: 'endTime must be >= startTime', path: ['endTime'] });

export const updateEventSchema = updateEventObject
  .refine(endAfterStart, { message: 'endTime must be >= startTime', path: ['endTime'] });

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;

/* Batch create (one edition, many events) ------------- */
export const createEventsBatchSchema = z.object({
  editionId: z.string().uuid(),
  events: z.array(updateEventSchema).min(1, 'Au moins un évènement requis').max(100, 'Maximum 100 évènements par lot'),
});

export type CreateEventsBatchInput = z.infer<typeof createEventsBatchSchema>;
