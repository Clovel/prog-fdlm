/* Module imports -------------------------------------- */
import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  timestamp,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';

/* Module imports (project) ---------------------------- */
import { editions } from './editions';
import {
  eventCategoryEnum,
  eventStatusEnum,
} from './enums';

/* Table definition ------------------------------------ */
export const events = pgTable(
  'events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    editionId: uuid('edition_id').notNull().references(() => editions.id, { onDelete: 'cascade' }),
    legacyId: text('legacy_id'),
    name: text('name'),
    description: text('description'),
    category: eventCategoryEnum('category'),
    status: eventStatusEnum('status'),
    genres: text('genres').array(),
    artists: text('artists').array(),
    priceText: text('price_text'),
    locationName: text('location_name').notNull(),
    locationAddress: text('location_address'),
    startTime: timestamp('start_time', { withTimezone: true }).notNull(),
    endTime: timestamp('end_time', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    legacyIdUq: uniqueIndex('events_edition_legacy_id_uq')
      .on(table.editionId, table.legacyId)
      .where(sql`legacy_id IS NOT NULL`),
    editionStartTimeIdx: index('events_edition_start_time_idx')
      .on(table.editionId, table.startTime, table.id),
    editionCategoryIdx: index('events_edition_category_idx')
      .on(table.editionId, table.category),
    timeCheck: check(
      'events_time_check',
      sql`end_time IS NULL OR end_time >= start_time`,
    ),
  }),
);

/* Inferred types -------------------------------------- */
export type EventRow = typeof events.$inferSelect;
export type EventInsert = typeof events.$inferInsert;
