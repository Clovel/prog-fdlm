/* Module imports -------------------------------------- */
import { eq, sql } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../index';
import { events, eventLinks, eventEmbedLinks, eventAlerts } from '../schema';

/* Type imports ---------------------------------------- */
import type { CreateEventInput, UpdateEventInput } from 'validation/event';

/* Helpers --------------------------------------------- */
const emptyToNull = (value: string | undefined | null): string | null => {
  if(value === undefined || value === null || value.length === 0) {
    return null;
  }
  return value;
};

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const insertChildren = async (tx: Tx, eventId: string, input: CreateEventInput | UpdateEventInput): Promise<void> => {
  if(input.links.length > 0) {
    await tx.insert(eventLinks).values(
      input.links.map((l, i) => ({ eventId, url: l.url, label: l.label, position: i })),
    );
  }
  if(input.embedLinks.length > 0) {
    await tx.insert(eventEmbedLinks).values(
      input.embedLinks.map((e, i) => ({ eventId, platform: e.platform, url: e.url, position: i })),
    );
  }
  if(input.alerts.length > 0) {
    await tx.insert(eventAlerts).values(
      input.alerts.map((a, i) => ({
        eventId,
        variant: a.variant,
        title: emptyToNull(a.title),
        content: a.content,
        position: i,
      })),
    );
  }
};

const coreValues = (input: CreateEventInput | UpdateEventInput): Partial<typeof events.$inferInsert> => ({
  name: emptyToNull(input.name),
  description: emptyToNull(input.description),
  category: input.category ?? null,
  status: input.status ?? null,
  genres: input.genres.length > 0 ? input.genres : null,
  artists: input.artists.length > 0 ? input.artists : null,
  priceText: emptyToNull(input.priceText),
  locationName: input.locationName,
  locationAddress: emptyToNull(input.locationAddress),
  startTime: new Date(input.startTime),
  endTime: input.endTime === undefined || input.endTime === null ? null : new Date(input.endTime),
});

/* Mutations ------------------------------------------- */
export const createEventWithChildren = async (input: CreateEventInput): Promise<string> => {
  return db.transaction(async (tx) => {
    const rows = await tx
      .insert(events)
      .values({ editionId: input.editionId, ...coreValues(input) } as typeof events.$inferInsert)
      .returning({ id: events.id });
    const row = rows[0];
    if(row === undefined) {
      throw new Error('createEvent: insert returned no row');
    }
    await insertChildren(tx, row.id, input);
    return row.id;
  });
};

export const updateEventWithChildren = async (id: string, input: UpdateEventInput): Promise<string | null> => {
  return db.transaction(async (tx) => {
    const rows = await tx
      .update(events)
      .set({ ...coreValues(input), updatedAt: sql`NOW()` })
      .where(eq(events.id, id))
      .returning({ id: events.id });
    const row = rows[0];
    if(row === undefined) {
      return null;
    }
    await tx.delete(eventLinks).where(eq(eventLinks.eventId, id));
    await tx.delete(eventEmbedLinks).where(eq(eventEmbedLinks.eventId, id));
    await tx.delete(eventAlerts).where(eq(eventAlerts.eventId, id));
    await insertChildren(tx, id, input);
    return row.id;
  });
};

export const deleteEvent = async (id: string): Promise<boolean> => {
  const rows = await db.delete(events).where(eq(events.id, id)).returning({ id: events.id });
  return rows.length > 0;
};
