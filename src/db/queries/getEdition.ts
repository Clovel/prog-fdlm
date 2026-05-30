/* Module imports -------------------------------------- */
import { and, asc, eq } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../index';
import { editions, generalAlerts } from '../schema';

/* Type imports ---------------------------------------- */
import type { EditionWithMetaDto, GeneralAlertDto } from './types';

/* Query ----------------------------------------------- */
export interface GetEditionResult {
  edition: EditionWithMetaDto;
  generalAlerts: GeneralAlertDto[];
}

export const getEdition = async (year: number): Promise<GetEditionResult | null> => {
  const editionRows = await db
    .select({
      id: editions.id,
      year: editions.year,
      description: editions.description,
      dayOfFestival: editions.dayOfFestival,
    })
    .from(editions)
    .where(eq(editions.year, year))
    .limit(1);

  const edition = editionRows[0];
  if(edition === undefined) {
    return null;
  }

  const alertRows = await db
    .select({
      id: generalAlerts.id,
      variant: generalAlerts.variant,
      title: generalAlerts.title,
      content: generalAlerts.content,
      position: generalAlerts.position,
    })
    .from(generalAlerts)
    .where(
      and(
        eq(generalAlerts.editionId, edition.id),
        eq(generalAlerts.isPublished, true),
      ),
    )
    .orderBy(asc(generalAlerts.position));

  return { edition, generalAlerts: alertRows };
};
