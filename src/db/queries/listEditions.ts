/* Module imports -------------------------------------- */
import { desc, eq } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../index';
import { editions } from '../schema';

/* Type imports ---------------------------------------- */
import type { EditionDto } from './types';

/* Query ----------------------------------------------- */
export const listEditions = async (): Promise<EditionDto[]> => {
  const rows = await db
    .select({
      id: editions.id,
      year: editions.year,
      description: editions.description,
    })
    .from(editions)
    .where(eq(editions.isPublished, true))
    .orderBy(desc(editions.year));
  return rows;
};
