/* Module imports -------------------------------------- */
import { asc, eq } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../index';
import { events, eventLinks, eventEmbedLinks, eventAlerts } from '../schema';

/* Type imports ---------------------------------------- */
import type { EventDetailDto } from './types';

/* Query ----------------------------------------------- */
export const getEventDetail = async (eventId: string): Promise<EventDetailDto | null> => {
  const eventRows = await db
    .select({
      id: events.id,
      editionId: events.editionId,
      description: events.description,
    })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  const event = eventRows[0];
  if(event === undefined) {
    return null;
  }

  const [linkRows, embedRows, alertRows] = await Promise.all([
    db
      .select({ url: eventLinks.url, label: eventLinks.label, position: eventLinks.position })
      .from(eventLinks)
      .where(eq(eventLinks.eventId, eventId))
      .orderBy(asc(eventLinks.position)),
    db
      .select({ platform: eventEmbedLinks.platform, url: eventEmbedLinks.url, position: eventEmbedLinks.position })
      .from(eventEmbedLinks)
      .where(eq(eventEmbedLinks.eventId, eventId))
      .orderBy(asc(eventEmbedLinks.position)),
    db
      .select({ variant: eventAlerts.variant, title: eventAlerts.title, content: eventAlerts.content, position: eventAlerts.position })
      .from(eventAlerts)
      .where(eq(eventAlerts.eventId, eventId))
      .orderBy(asc(eventAlerts.position)),
  ]);

  return {
    id: event.id,
    editionId: event.editionId,
    description: event.description,
    links: linkRows.map(({ url, label }) => ({ url, label })),
    embedLinks: embedRows.map(({ platform, url }) => ({ platform, url })),
    alerts: alertRows.map(({ variant, title, content }) => ({ variant, title, content })),
  };
};
