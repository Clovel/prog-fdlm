/* Module imports -------------------------------------- */
import { and, eq } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../index';
import { favorites, events } from '../schema';

/* Query ----------------------------------------------- */
/** Returns the event ids the user has favorited within a given edition. */
export const listUserFavorites = async (userId: string, editionId: string): Promise<string[]> => {
  const rows = await db
    .select({ eventId: favorites.eventId })
    .from(favorites)
    .innerJoin(events, eq(favorites.eventId, events.id))
    .where(and(eq(favorites.userId, userId), eq(events.editionId, editionId)));
  return rows.map((row) => row.eventId);
};
