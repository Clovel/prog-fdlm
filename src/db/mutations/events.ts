/* Module imports -------------------------------------- */
import { eq, sql } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../index';
import { events, eventLinks, eventEmbedLinks, eventAlerts } from '../schema';
import { geocodeAddress } from 'lib/geocode';
import { geocodeResultToColumns } from 'db/geocodeColumns';

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

/* Geocode helper -------------------------------------- */
/**
 * Compute the geocode column values for an event address.
 *
 * Decision rules (implemented precisely per spec §7 R2):
 * 1. addr === null   → clear all geocode columns to null; no network call.
 * 2. clientCoords provided (admin picked a BAN suggestion) → trust those coordinates;
 *    skip the network call.
 * 3. addr === previousGeocodedAddress → address unchanged; return {} to leave
 *    geocode columns untouched; no network call.
 * 4. otherwise → call BAN; persist ok/failed result.
 *
 * Never throws. Failed geocode result is valid column data; the write proceeds.
 */
const geocodeColumns = async (
  addr: string | null,
  previousGeocodedAddress: string | null | undefined,
  clientCoords: { lat?: number; lng?: number },
): Promise<Partial<typeof events.$inferInsert>> => {
  if(addr === null) {
    return geocodeResultToColumns(null, null);
  }
  /* Admin picked a BAN suggestion → trust those coordinates; skip the network call. */
  if(clientCoords.lat !== undefined && clientCoords.lng !== undefined) {
    return geocodeResultToColumns(addr, {
      status: 'ok',
      lat: clientCoords.lat,
      lng: clientCoords.lng,
      score: 1,
      formattedAddress: addr,
    });
  }
  if(addr === previousGeocodedAddress) {
    return {};
  }
  const result = await geocodeAddress(addr);
  return geocodeResultToColumns(addr, result);
};

/* Mutations ------------------------------------------- */
export const createEventWithChildren = async (input: CreateEventInput): Promise<string> => {
  const addr = emptyToNull(input.locationAddress);
  const geo = await geocodeColumns(addr, undefined, { lat: input.latitude, lng: input.longitude });
  return db.transaction(async (tx) => {
    const rows = await tx
      .insert(events)
      .values({ editionId: input.editionId, ...coreValues(input), ...geo } as typeof events.$inferInsert)
      .returning({ id: events.id });
    const row = rows[0];
    if(row === undefined) {
      throw new Error('createEvent: insert returned no row');
    }
    await insertChildren(tx, row.id, input);
    return row.id;
  });
};

export const createEventsBatch = async (
  editionId: string,
  items: UpdateEventInput[],
): Promise<string[]> => {
  const prepared: Array<{ item: UpdateEventInput; geo: Partial<typeof events.$inferInsert> }> = [];
  for(const item of items) {
    const addr = emptyToNull(item.locationAddress);
    const geo = await geocodeColumns(addr, undefined, { lat: item.latitude, lng: item.longitude });
    prepared.push({ item, geo });
  }
  return db.transaction(async (tx) => {
    const ids: string[] = [];
    for(const { item, geo } of prepared) {
      const rows = await tx
        .insert(events)
        .values({ editionId, ...coreValues(item), ...geo } as typeof events.$inferInsert)
        .returning({ id: events.id });
      const row = rows[0];
      if(row === undefined) {
        throw new Error('createEventsBatch: insert returned no row');
      }
      await insertChildren(tx, row.id, item);
      ids.push(row.id);
    }
    return ids;
  });
};

export const updateEventWithChildren = async (id: string, input: UpdateEventInput): Promise<string | null> => {
  const existing = (
    await db
      .select({ geocodedAddress: events.geocodedAddress })
      .from(events)
      .where(eq(events.id, id))
  )[0];
  if(existing === undefined) {
    /* Row not found — skip geocoding; transaction will match no row and return null. */
    return db.transaction(async (tx) => {
      const rows = await tx
        .update(events)
        .set({ ...coreValues(input), updatedAt: sql`NOW()` })
        .where(eq(events.id, id))
        .returning({ id: events.id });
      return rows[0]?.id ?? null;
    });
  }
  const addr = emptyToNull(input.locationAddress);
  const geo = await geocodeColumns(addr, existing.geocodedAddress, { lat: input.latitude, lng: input.longitude });
  return db.transaction(async (tx) => {
    const rows = await tx
      .update(events)
      .set({ ...coreValues(input), ...geo, updatedAt: sql`NOW()` })
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
