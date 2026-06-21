/* Module imports -------------------------------------- */
import { and, eq } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../index';
import { editions, events } from '../schema';

/* Type declarations ----------------------------------- */
export interface EventShareData {
  year: number;
  name: string | null;
  venueName: string;
  addressStr: string | null;
  startTime: string;
  endTime: string | null;
}

/* Query ----------------------------------------------- */
// Minimal per-event data for the share OG card + metadata. Published editions
// only (mirrors getEventDetail's WHERE).
export const getEventShareData = async(eventId: string): Promise<EventShareData | null> => {
  const rows = await db
    .select({
      year: editions.year,
      name: events.name,
      venueName: events.locationName,
      addressStr: events.locationAddress,
      startTime: events.startTime,
      endTime: events.endTime,
    })
    .from(events)
    .innerJoin(editions, eq(events.editionId, editions.id))
    .where(and(eq(events.id, eventId), eq(editions.isPublished, true)))
    .limit(1);

  const row = rows[0];
  if(row === undefined) {
    return null;
  }

  return {
    year: row.year,
    name: row.name,
    venueName: row.venueName,
    addressStr: row.addressStr,
    startTime: row.startTime.toISOString(),
    endTime: row.endTime !== null ? row.endTime.toISOString() : null,
  };
};
