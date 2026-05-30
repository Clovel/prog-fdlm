/* Module imports -------------------------------------- */
import { asc, eq, sql } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../../index';
import { events, eventLinks, eventEmbedLinks, eventAlerts } from '../../schema';

/* Types ----------------------------------------------- */
export interface AdminEventSummary {
  id: string;
  name: string | null;
  category: string | null;
  status: string | null;
  startTime: string;
  endTime: string | null;
  linkCount: number;
  embedCount: number;
  alertCount: number;
}

/* Query ----------------------------------------------- */
export const listEditionEventsAdmin = async (editionId: string): Promise<AdminEventSummary[]> => {
  const linkCountSql = sql<number>`(SELECT COUNT(*)::int FROM ${eventLinks} WHERE ${eventLinks.eventId} = ${events.id})`;
  const embedCountSql = sql<number>`(SELECT COUNT(*)::int FROM ${eventEmbedLinks} WHERE ${eventEmbedLinks.eventId} = ${events.id})`;
  const alertCountSql = sql<number>`(SELECT COUNT(*)::int FROM ${eventAlerts} WHERE ${eventAlerts.eventId} = ${events.id})`;

  const rows = await db
    .select({
      id: events.id,
      name: events.name,
      category: events.category,
      status: events.status,
      startTime: events.startTime,
      endTime: events.endTime,
      linkCount: linkCountSql,
      embedCount: embedCountSql,
      alertCount: alertCountSql,
    })
    .from(events)
    .where(eq(events.editionId, editionId))
    .orderBy(asc(events.startTime), asc(events.id));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    status: r.status,
    startTime: r.startTime.toISOString(),
    endTime: r.endTime === null ? null : r.endTime.toISOString(),
    linkCount: r.linkCount,
    embedCount: r.embedCount,
    alertCount: r.alertCount,
  }));
};
