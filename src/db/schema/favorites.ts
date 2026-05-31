/* Module imports -------------------------------------- */
import {
  pgTable,
  uuid,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

/* Module imports (project) ---------------------------- */
import { user } from './auth';
import { events } from './events';

/* Table definition ------------------------------------ */
export const favorites = pgTable(
  'favorite',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userEventUq: uniqueIndex('favorite_user_event_uq').on(table.userId, table.eventId),
    userIdIdx: index('favorite_user_id_idx').on(table.userId),
  }),
);

/* Inferred types -------------------------------------- */
export type FavoriteRow = typeof favorites.$inferSelect;
export type FavoriteInsert = typeof favorites.$inferInsert;
