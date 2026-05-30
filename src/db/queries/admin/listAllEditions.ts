/* Module imports -------------------------------------- */
import { desc, sql } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../../index';
import { editions, events, generalAlerts } from '../../schema';

/* Types ----------------------------------------------- */
export interface AdminEditionDto {
  id: string;
  year: number;
  description: string | null;
  dayOfFestival: string;
  isPublished: boolean;
  eventCount: number;
  alertCount: number;
}

/* Query ----------------------------------------------- */
export const listAllEditions = async (): Promise<AdminEditionDto[]> => {
  const eventCountSql = sql<number>`(SELECT COUNT(*)::int FROM ${events} WHERE ${events.editionId} = ${editions.id})`;
  const alertCountSql = sql<number>`(SELECT COUNT(*)::int FROM ${generalAlerts} WHERE ${generalAlerts.editionId} = ${editions.id})`;

  const rows = await db
    .select({
      id: editions.id,
      year: editions.year,
      description: editions.description,
      dayOfFestival: editions.dayOfFestival,
      isPublished: editions.isPublished,
      eventCount: eventCountSql,
      alertCount: alertCountSql,
    })
    .from(editions)
    .orderBy(desc(editions.year));

  return rows;
};
