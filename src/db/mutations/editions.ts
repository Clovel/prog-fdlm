/* Module imports -------------------------------------- */
import { eq, sql } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../index';
import { editions } from '../schema';

/* Type imports ---------------------------------------- */
import type { CreateEditionInput, UpdateEditionInput } from 'validation/edition';
import type { Edition } from '../schema';

/* Helpers --------------------------------------------- */
const normalizeDescription = (description: string | undefined): string | null => {
  if(description === undefined || description.length === 0) {
    return null;
  }
  return description;
};

/* Mutations ------------------------------------------- */
export const createEdition = async (input: CreateEditionInput): Promise<Edition> => {
  const rows = await db
    .insert(editions)
    .values({
      year: input.year,
      description: normalizeDescription(input.description),
      dayOfFestival: input.dayOfFestival,
      isPublished: input.isPublished,
    })
    .returning();
  const row = rows[0];
  if(row === undefined) {
    throw new Error('createEdition: insert returned no row');
  }
  return row;
};

export const updateEdition = async (id: string, input: UpdateEditionInput): Promise<Edition | null> => {
  const rows = await db
    .update(editions)
    .set({
      description: normalizeDescription(input.description),
      dayOfFestival: input.dayOfFestival,
      isPublished: input.isPublished,
      updatedAt: sql`NOW()`,
    })
    .where(eq(editions.id, id))
    .returning();
  return rows[0] ?? null;
};

export const deleteEdition = async (id: string): Promise<boolean> => {
  const rows = await db
    .delete(editions)
    .where(eq(editions.id, id))
    .returning({ id: editions.id });
  return rows.length > 0;
};

export const editionYearExists = async (year: number): Promise<boolean> => {
  const rows = await db
    .select({ id: editions.id })
    .from(editions)
    .where(eq(editions.year, year))
    .limit(1);
  return rows.length > 0;
};
