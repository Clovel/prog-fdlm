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
// Note: (eventId, url) UNIQUE intentionally omitted — the position-keyed upsert
// (Strategy B) can collide on URL uniqueness when fixture links are reordered mid-seed.
// Duplicate URLs per event are prevented by convention, not by a DB constraint.

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
    positionCheck: check('event_links_position_check', sql`position >= 0`),
  }),
);

export type EventLinkRow = typeof eventLinks.$inferSelect;
export type EventLinkInsert = typeof eventLinks.$inferInsert;
