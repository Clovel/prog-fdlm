/* Module imports -------------------------------------- */
import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';

/* Module imports (project) ---------------------------- */
import { editions } from './editions';
import { alertVariantEnum } from './enums';

/* Table definition ------------------------------------ */
export const generalAlerts = pgTable(
  'general_alerts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    editionId: uuid('edition_id').notNull().references(() => editions.id, { onDelete: 'cascade' }),
    variant: alertVariantEnum('variant').notNull(),
    title: text('title'),
    content: text('content').notNull(),
    isPublished: boolean('is_published').notNull().default(false),
    position: integer('position').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    editionPositionUq: uniqueIndex('general_alerts_edition_position_uq').on(table.editionId, table.position),
    positionCheck: check('general_alerts_position_check', sql`position >= 0`),
  }),
);

export type GeneralAlertRow = typeof generalAlerts.$inferSelect;
export type GeneralAlertInsert = typeof generalAlerts.$inferInsert;
