/* Module imports -------------------------------------- */
import { pgEnum } from 'drizzle-orm/pg-core';

/* Module imports (project) ---------------------------- */
import { eventCategories } from 'types/eventCategories';

/* Enum definitions ------------------------------------ */
/** Mirrors the variants supported by src/components/ui/alert.tsx. */
export const alertVariantEnum = pgEnum('alert_variant', [
  'default',
  'destructive',
  'warning',
  'info',
  'success',
]);

/** Mirrors Event['status'] in src/types/Event.ts. */
export const eventStatusEnum = pgEnum('event_status', [
  'canceled',
  'postponed',
  'rescheduled',
]);

/** Mirrors EventEmbedLinkType in src/types/Event.ts. */
export const embedPlatformEnum = pgEnum('embed_platform', [
  'instagram',
  'facebook',
]);

/**
 * Mirrors `eventCategories` in src/types/eventCategories.ts. Cast is needed
 * because pgEnum's type signature wants a non-empty tuple.
 */
export const eventCategoryEnum = pgEnum(
  'event_category',
  eventCategories as unknown as [string, ...string[]],
);
