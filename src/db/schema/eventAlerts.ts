/* Module imports -------------------------------------- */
import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  integer,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';

/* Module imports (project) ---------------------------- */
import { events } from './events';
import { alertVariantEnum } from './enums';

/* Table definition ------------------------------------ */
export const eventAlerts = pgTable(
  'event_alerts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
    variant: alertVariantEnum('variant').notNull(),
    title: text('title'),
    content: text('content').notNull(),
    position: integer('position').notNull(),
  },
  (table) => ({
    eventPositionUq: uniqueIndex('event_alerts_event_position_uq').on(table.eventId, table.position),
    positionCheck: check('event_alerts_position_check', sql`position >= 0`),
  }),
);

export type EventAlertRow = typeof eventAlerts.$inferSelect;
export type EventAlertInsert = typeof eventAlerts.$inferInsert;
