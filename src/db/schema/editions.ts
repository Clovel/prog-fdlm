/* Module imports -------------------------------------- */
import {
  pgTable,
  uuid,
  integer,
  text,
  date,
  timestamp,
} from 'drizzle-orm/pg-core';

/* Table definition ------------------------------------ */
export const editions = pgTable('editions', {
  id: uuid('id').primaryKey().defaultRandom(),
  year: integer('year').notNull().unique(),
  description: text('description'),
  dayOfFestival: date('day_of_festival').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/* Inferred types -------------------------------------- */
export type Edition = typeof editions.$inferSelect;
export type EditionInsert = typeof editions.$inferInsert;
