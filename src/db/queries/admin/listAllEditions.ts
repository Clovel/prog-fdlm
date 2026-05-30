/* Module imports -------------------------------------- */
import { desc, eq } from 'drizzle-orm';

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
  const rows = await db
    .select({
      id: editions.id,
      year: editions.year,
      description: editions.description,
      dayOfFestival: editions.dayOfFestival,
      isPublished: editions.isPublished,
      eventCount: db.$count(events, eq(events.editionId, editions.id)),
      alertCount: db.$count(generalAlerts, eq(generalAlerts.editionId, editions.id)),
    })
    .from(editions)
    .orderBy(desc(editions.year));

  return rows;
};
