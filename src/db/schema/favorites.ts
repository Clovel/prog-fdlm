/* Module imports -------------------------------------- */
import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  timestamp,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';

/* Module imports (project) ---------------------------- */
import { user } from './auth';
import { events } from './events';

/* Table definition ------------------------------------ */
// A favorite is owned by EITHER an authenticated user (user_id) OR an
// anonymous device (anon_id) — never both, never neither (favorite_owner_chk).
// anon_id is an opaque client-generated UUID kept in the visitor's
// localStorage; it has no FK because there is no anonymous-user table.
export const favorites = pgTable(
  'favorite',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => user.id, { onDelete: 'cascade' }),
    anonId: uuid('anon_id'),
    eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userEventUq: uniqueIndex('favorite_user_event_uq')
      .on(table.userId, table.eventId)
      .where(sql`user_id IS NOT NULL`),
    anonEventUq: uniqueIndex('favorite_anon_event_uq')
      .on(table.anonId, table.eventId)
      .where(sql`anon_id IS NOT NULL`),
    userIdIdx: index('favorite_user_id_idx').on(table.userId),
    eventIdIdx: index('favorite_event_id_idx').on(table.eventId),
    ownerCheck: check('favorite_owner_chk', sql`num_nonnulls(user_id, anon_id) = 1`),
  }),
);

/* Inferred types -------------------------------------- */
export type FavoriteRow = typeof favorites.$inferSelect;
export type FavoriteInsert = typeof favorites.$inferInsert;
