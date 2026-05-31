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
import { embedPlatformEnum } from './enums';

/* Table definition ------------------------------------ */
export const editionEmbedLinks = pgTable(
  'edition_embed_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    editionId: uuid('edition_id').notNull().references(() => editions.id, { onDelete: 'cascade' }),
    platform: embedPlatformEnum('platform').notNull(),
    url: text('url').notNull(),
    isPublished: boolean('is_published').notNull().default(true),
    position: integer('position').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    editionPositionUq: uniqueIndex('edition_embed_links_edition_position_uq').on(table.editionId, table.position),
    positionCheck: check('edition_embed_links_position_check', sql`position >= 0`),
  }),
);

export type EditionEmbedLinkRow = typeof editionEmbedLinks.$inferSelect;
export type EditionEmbedLinkInsert = typeof editionEmbedLinks.$inferInsert;
