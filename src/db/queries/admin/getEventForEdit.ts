/* Module imports -------------------------------------- */
import { asc, eq } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../../index';
import { events, eventLinks, eventEmbedLinks, eventAlerts } from '../../schema';

/* Types ----------------------------------------------- */
export interface AdminEventDetail {
  id: string;
  editionId: string;
  name: string | null;
  description: string | null;
  category: string | null;
  status: string | null;
  genres: string[];
  artists: string[];
  priceText: string | null;
  locationName: string;
  locationAddress: string | null;
  startTime: string;
  endTime: string | null;
  links: Array<{ url: string; label: string }>;
  embedLinks: Array<{ platform: 'instagram' | 'facebook'; url: string }>;
  alerts: Array<{ variant: 'default' | 'destructive' | 'warning' | 'success'; title: string | null; content: string }>;
}

/* Query ----------------------------------------------- */
export const getEventForEdit = async (id: string): Promise<AdminEventDetail | null> => {
  const rows = await db.select().from(events).where(eq(events.id, id)).limit(1);
  const ev = rows[0];
  if(ev === undefined) {
    return null;
  }

  const [linkRows, embedRows, alertRows] = await Promise.all([
    db.select({ url: eventLinks.url, label: eventLinks.label }).from(eventLinks).where(eq(eventLinks.eventId, id)).orderBy(asc(eventLinks.position)),
    db.select({ platform: eventEmbedLinks.platform, url: eventEmbedLinks.url }).from(eventEmbedLinks).where(eq(eventEmbedLinks.eventId, id)).orderBy(asc(eventEmbedLinks.position)),
    db.select({ variant: eventAlerts.variant, title: eventAlerts.title, content: eventAlerts.content }).from(eventAlerts).where(eq(eventAlerts.eventId, id)).orderBy(asc(eventAlerts.position)),
  ]);

  return {
    id: ev.id,
    editionId: ev.editionId,
    name: ev.name,
    description: ev.description,
    category: ev.category,
    status: ev.status,
    genres: ev.genres ?? [],
    artists: ev.artists ?? [],
    priceText: ev.priceText,
    locationName: ev.locationName,
    locationAddress: ev.locationAddress,
    startTime: ev.startTime.toISOString(),
    endTime: ev.endTime === null ? null : ev.endTime.toISOString(),
    links: linkRows,
    embedLinks: embedRows.map((r) => ({ platform: r.platform, url: r.url })),
    alerts: alertRows.map((r) => ({ variant: r.variant, title: r.title, content: r.content })),
  };
};
