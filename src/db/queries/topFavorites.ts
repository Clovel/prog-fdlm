/* Module imports -------------------------------------- */
import { asc, desc, eq } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../index';
import { editions, events, favorites } from '../schema';

/* Type imports ---------------------------------------- */
import type { EventCategory } from 'types/eventCategories';

/* Types ----------------------------------------------- */
export interface TopFavoritedEvent {
  id: string;
  name: string | null;
  category: EventCategory | null;
  startTime: string;
  favoriteCount: number;
}

export interface EditionTopFavorites {
  year: number;
  events: TopFavoritedEvent[];
}

/* Internal -------------------------------------------- */
const topForEditionId = async (editionId: string, limit: number): Promise<TopFavoritedEvent[]> => {
  const countExpr = db.$count(favorites, eq(favorites.eventId, events.id));
  const rows = await db
    .select({
      id: events.id,
      name: events.name,
      category: events.category,
      startTime: events.startTime,
      favoriteCount: countExpr,
    })
    .from(events)
    .where(eq(events.editionId, editionId))
    .orderBy(desc(countExpr), asc(events.startTime), asc(events.id))
    .limit(limit);
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category as EventCategory | null,
    startTime: row.startTime.toISOString(),
    favoriteCount: row.favoriteCount,
  }));
};

/* Queries --------------------------------------------- */
/** Top events by favorite count for one published edition, or null if missing/unpublished. */
export const getTopFavoritedEventsForYear = async (
  year: number,
  limit: number,
): Promise<TopFavoritedEvent[] | null> => {
  const editionRows = await db
    .select({ id: editions.id, isPublished: editions.isPublished })
    .from(editions)
    .where(eq(editions.year, year))
    .limit(1);
  const edition = editionRows[0];
  if(edition === undefined || !edition.isPublished) {
    return null;
  }
  return topForEditionId(edition.id, limit);
};

/** Top events per published edition, newest edition first. */
export const listTopFavoritedEventsPerEdition = async (limit: number): Promise<EditionTopFavorites[]> => {
  const published = await db
    .select({ id: editions.id, year: editions.year })
    .from(editions)
    .where(eq(editions.isPublished, true))
    .orderBy(desc(editions.year));
  const result: EditionTopFavorites[] = [];
  for(const ed of published) {
    const topEvents: TopFavoritedEvent[] = await topForEditionId(ed.id, limit);
    result.push({ year: ed.year, events: topEvents });
  }
  return result;
};
