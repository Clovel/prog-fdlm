/* Module imports -------------------------------------- */
import { asc, eq, inArray } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../index';
import { editions, events, eventLinks, eventEmbedLinks, eventAlerts } from '../schema';

/* Type imports ---------------------------------------- */
import type { EventWithDetailDto } from './types';
import type { EventCategory } from 'types/eventCategories';

// Safety cap. The largest historical edition is ~44 events; this bounds the
// consolidated payload. If an edition approaches it, revisit (paginate, or fall
// back to per-event detail fetching).
const MAX_EVENTS = 300;

/* Query ----------------------------------------------- */
// Returns every event of a published edition with its full detail inlined
// (description + links + embeds + alerts), in 4 queries total: 1 for the events,
// then 3 bulk child-row queries grouped in JS. `null` when the edition is
// missing or unpublished; `[]` for a published-but-empty edition.
export const listEditionEventsWithDetail = async (year: number): Promise<EventWithDetailDto[] | null> => {
  const editionRows = await db
    .select({ id: editions.id, isPublished: editions.isPublished })
    .from(editions)
    .where(eq(editions.year, year))
    .limit(1);
  const edition = editionRows[0];
  if(edition === undefined || !edition.isPublished) {
    return null;
  }

  const eventRows = await db
    .select({
      id: events.id,
      editionId: events.editionId,
      name: events.name,
      category: events.category,
      status: events.status,
      genres: events.genres,
      artists: events.artists,
      startTime: events.startTime,
      endTime: events.endTime,
      priceText: events.priceText,
      locationName: events.locationName,
      locationAddress: events.locationAddress,
      latitude: events.latitude,
      longitude: events.longitude,
      geocodeStatus: events.geocodeStatus,
      description: events.description,
    })
    .from(events)
    .where(eq(events.editionId, edition.id))
    .orderBy(asc(events.startTime), asc(events.id))
    .limit(MAX_EVENTS);

  if(eventRows.length === 0) {
    return [];
  }

  const eventIds: string[] = eventRows.map((row) => row.id);

  const [linkRows, embedRows, alertRows] = await Promise.all([
    db
      .select({ eventId: eventLinks.eventId, url: eventLinks.url, label: eventLinks.label, position: eventLinks.position })
      .from(eventLinks)
      .where(inArray(eventLinks.eventId, eventIds))
      .orderBy(asc(eventLinks.eventId), asc(eventLinks.position)),
    db
      .select({ eventId: eventEmbedLinks.eventId, platform: eventEmbedLinks.platform, url: eventEmbedLinks.url, position: eventEmbedLinks.position })
      .from(eventEmbedLinks)
      .where(inArray(eventEmbedLinks.eventId, eventIds))
      .orderBy(asc(eventEmbedLinks.eventId), asc(eventEmbedLinks.position)),
    db
      .select({ eventId: eventAlerts.eventId, variant: eventAlerts.variant, title: eventAlerts.title, content: eventAlerts.content, position: eventAlerts.position })
      .from(eventAlerts)
      .where(inArray(eventAlerts.eventId, eventIds))
      .orderBy(asc(eventAlerts.eventId), asc(eventAlerts.position)),
  ]);

  // Group child rows by event id (rows already arrive ordered by position).
  const linksByEvent = new Map<string, EventWithDetailDto['links']>();
  for(const row of linkRows) {
    const list = linksByEvent.get(row.eventId) ?? [];
    list.push({ url: row.url, label: row.label });
    linksByEvent.set(row.eventId, list);
  }
  const embedsByEvent = new Map<string, EventWithDetailDto['embedLinks']>();
  for(const row of embedRows) {
    const list = embedsByEvent.get(row.eventId) ?? [];
    list.push({ platform: row.platform, url: row.url });
    embedsByEvent.set(row.eventId, list);
  }
  const alertsByEvent = new Map<string, EventWithDetailDto['alerts']>();
  for(const row of alertRows) {
    const list = alertsByEvent.get(row.eventId) ?? [];
    list.push({ variant: row.variant, title: row.title, content: row.content });
    alertsByEvent.set(row.eventId, list);
  }

  return eventRows.map(
    (row): EventWithDetailDto => ({
      id: row.id,
      editionId: row.editionId,
      name: row.name,
      category: row.category as EventCategory | null,
      status: row.status,
      genres: row.genres,
      artists: row.artists,
      startTime: row.startTime.toISOString(),
      endTime: row.endTime === null ? null : row.endTime.toISOString(),
      priceText: row.priceText,
      location: {
        name: row.locationName,
        address: row.locationAddress,
        coords:
          row.geocodeStatus === 'ok' && row.latitude !== null && row.longitude !== null
            ? { lat: row.latitude, lng: row.longitude }
            : null,
      },
      description: row.description,
      links: linksByEvent.get(row.id) ?? [],
      embedLinks: embedsByEvent.get(row.id) ?? [],
      alerts: alertsByEvent.get(row.id) ?? [],
    }),
  );
};
