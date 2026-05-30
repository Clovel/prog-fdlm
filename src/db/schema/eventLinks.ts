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

/* Table definition ------------------------------------ */
export const eventLinks = pgTable(
  'event_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    label: text('label').notNull(),
    position: integer('position').notNull(),
  },
  (table) => ({
    eventPositionUq: uniqueIndex('event_links_event_position_uq').on(table.eventId, table.position),
    eventUrlUq: uniqueIndex('event_links_event_url_uq').on(table.eventId, table.url),
    positionCheck: check('event_links_position_check', sql`position >= 0`),
  }),
);

export type EventLinkRow = typeof eventLinks.$inferSelect;
export type EventLinkInsert = typeof eventLinks.$inferInsert;
