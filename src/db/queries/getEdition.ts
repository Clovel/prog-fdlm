/* Module imports -------------------------------------- */
import { and, asc, eq } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../index';
import { editions, editionEmbedLinks, generalAlerts } from '../schema';

/* Type imports ---------------------------------------- */
import type { EditionWithMetaDto, EmbedLinkDto, GeneralAlertDto } from './types';

/* Query ----------------------------------------------- */
export interface GetEditionResult {
  edition: EditionWithMetaDto;
  generalAlerts: GeneralAlertDto[];
  embedLinks: EmbedLinkDto[];
}

export const getEdition = async (year: number): Promise<GetEditionResult | null> => {
  const editionRows = await db
    .select({
      id: editions.id,
      year: editions.year,
      description: editions.description,
      dayOfFestival: editions.dayOfFestival,
      isPublished: editions.isPublished,
    })
    .from(editions)
    .where(eq(editions.year, year))
    .limit(1);

  const edition = editionRows[0];
  if(edition === undefined || !edition.isPublished) {
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

  const embedRows = await db
    .select({
      id: editionEmbedLinks.id,
      platform: editionEmbedLinks.platform,
      url: editionEmbedLinks.url,
    })
    .from(editionEmbedLinks)
    .where(
      and(
        eq(editionEmbedLinks.editionId, edition.id),
        eq(editionEmbedLinks.isPublished, true),
      ),
    )
    .orderBy(asc(editionEmbedLinks.position));

  return {
    edition: {
      id: edition.id,
      year: edition.year,
      description: edition.description,
      dayOfFestival: edition.dayOfFestival,
    },
    generalAlerts: alertRows,
    embedLinks: embedRows,
  };
};
