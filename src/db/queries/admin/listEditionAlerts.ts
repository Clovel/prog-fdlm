/* Module imports -------------------------------------- */
import { asc, eq } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../../index';
import { generalAlerts } from '../../schema';

/* Type imports ---------------------------------------- */
import type { AlertVariant } from '../types';

/* Types ----------------------------------------------- */
export interface AdminAlertDto {
  id: string;
  variant: AlertVariant;
  title: string | null;
  content: string;
  isPublished: boolean;
  position: number;
}

/* Query ----------------------------------------------- */
export const listEditionAlerts = async (editionId: string): Promise<AdminAlertDto[]> => {
  const rows = await db
    .select({
      id: generalAlerts.id,
      variant: generalAlerts.variant,
      title: generalAlerts.title,
      content: generalAlerts.content,
      isPublished: generalAlerts.isPublished,
      position: generalAlerts.position,
    })
    .from(generalAlerts)
    .where(eq(generalAlerts.editionId, editionId))
    .orderBy(asc(generalAlerts.position));
  return rows;
};
