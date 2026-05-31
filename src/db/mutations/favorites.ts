/* Module imports -------------------------------------- */
import { and, eq, inArray, sql } from 'drizzle-orm';

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
    .onConflictDoNothing({
      target: [favorites.userId, favorites.eventId],
      where: sql`user_id IS NOT NULL`,
    });
};

/** Removes one favorite for the user. No-op if it doesn't exist. */
export const removeFavorite = async (userId: string, eventId: string): Promise<void> => {
  await db
    .delete(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.eventId, eventId)));
};

/* Anonymous favorites (device-keyed) ------------------ */
/** Adds favorites for an anonymous device. Mirrors `addFavorites`. */
export const addAnonymousFavorites = async (anonId: string, eventIds: string[]): Promise<void> => {
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
    .values(validIds.map((eventId) => ({ anonId, eventId })))
    .onConflictDoNothing({
      target: [favorites.anonId, favorites.eventId],
      where: sql`anon_id IS NOT NULL`,
    });
};

/** Removes one favorite for an anonymous device. No-op if it doesn't exist. */
export const removeAnonymousFavorite = async (anonId: string, eventId: string): Promise<void> => {
  await db
    .delete(favorites)
    .where(and(eq(favorites.anonId, anonId), eq(favorites.eventId, eventId)));
};

/**
 * On login, fold a device's anonymous favorites into the user's favorites and
 * delete the anonymous rows. Atomic so a row is never counted twice.
 */
export const claimAnonymousFavorites = async (userId: string, anonId: string): Promise<void> => {
  await db.transaction(async (tx) => {
    const anonRows = await tx
      .select({ eventId: favorites.eventId })
      .from(favorites)
      .where(eq(favorites.anonId, anonId));
    const eventIds: string[] = anonRows.map((row) => row.eventId);
    if(eventIds.length === 0) {
      return;
    }
    await tx
      .insert(favorites)
      .values(eventIds.map((eventId) => ({ userId, eventId })))
      .onConflictDoNothing({
        target: [favorites.userId, favorites.eventId],
        where: sql`user_id IS NOT NULL`,
      });
    await tx.delete(favorites).where(eq(favorites.anonId, anonId));
  });
};
