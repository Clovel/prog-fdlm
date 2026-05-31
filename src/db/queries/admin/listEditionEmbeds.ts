/* Module imports -------------------------------------- */
import { asc, eq } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../../index';
import { editionEmbedLinks } from '../../schema';

/* Types ----------------------------------------------- */
export interface AdminEditionEmbedDto {
  id: string;
  platform: 'instagram' | 'facebook';
  url: string;
  isPublished: boolean;
  position: number;
}

/* Query ----------------------------------------------- */
export const listEditionEmbeds = async (editionId: string): Promise<AdminEditionEmbedDto[]> => {
  const rows = await db
    .select({
      id: editionEmbedLinks.id,
      platform: editionEmbedLinks.platform,
      url: editionEmbedLinks.url,
      isPublished: editionEmbedLinks.isPublished,
      position: editionEmbedLinks.position,
    })
    .from(editionEmbedLinks)
    .where(eq(editionEmbedLinks.editionId, editionId))
    .orderBy(asc(editionEmbedLinks.position));
  return rows;
};
