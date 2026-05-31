/* Module imports -------------------------------------- */
import { eq } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../index';
import { editions, events } from '../schema';

/* Query ----------------------------------------------- */
export interface EditionCardData {
  year: number;
  description: string | null;
  dayOfFestival: string; // date-only column ('YYYY-MM-DD')
  eventCount: number;
}

// Returns lightweight share-card data for any edition by year (published or
// not — unpublished editions aren't linked publicly, and an admin previewing a
// link still gets a real card). Returns null when no edition has that year.
export const getEditionCardData = async (year: number): Promise<EditionCardData | null> => {
  const rows = await db
    .select({
      year: editions.year,
      description: editions.description,
      dayOfFestival: editions.dayOfFestival,
      eventCount: db.$count(events, eq(events.editionId, editions.id)),
    })
    .from(editions)
    .where(eq(editions.year, year))
    .limit(1);

  return rows[0] ?? null;
};
