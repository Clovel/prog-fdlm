/* Module imports -------------------------------------- */
import { and, eq, inArray } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../index';
import { favorites, events } from '../schema';

/* Mutations ------------------------------------------- */
/**
 * Adds favorites for the user. Filters out ids that don't exist (so a stale or
 * foreign id can't abort the batch) and ignores already-favorited rows.
 */
export const addFavorites = async (userId: string, eventIds: string[]): Promise<void> => {
  if(eventIds.length === 0) {
    return;
  }
  const existing = await db
    .select({ id: events.id })
    .from(events)
    .where(inArray(events.id, eventIds));
  const validIds: string[] = existing.map((row) => row.id);
  if(validIds.length === 0) {
    return;
  }
  await db
    .insert(favorites)
    .values(validIds.map((eventId) => ({ userId, eventId })))
    .onConflictDoNothing({ target: [favorites.userId, favorites.eventId] });
};

/** Removes one favorite for the user. No-op if it doesn't exist. */
export const removeFavorite = async (userId: string, eventId: string): Promise<void> => {
  await db
    .delete(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.eventId, eventId)));
};
