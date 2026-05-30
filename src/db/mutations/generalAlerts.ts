/* Module imports -------------------------------------- */
import { and, asc, eq, sql } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../index';
import { generalAlerts } from '../schema';

/* Type imports ---------------------------------------- */
import type { CreateGeneralAlertInput, UpdateGeneralAlertInput } from 'validation/generalAlert';
import type { GeneralAlertRow } from '../schema';

/* Helpers --------------------------------------------- */
const emptyToNull = (value: string | undefined): string | null => {
  if(value === undefined || value.length === 0) {
    return null;
  }
  return value;
};

/* Mutations ------------------------------------------- */
export const createGeneralAlert = async (input: CreateGeneralAlertInput): Promise<GeneralAlertRow> => {
  return db.transaction(async (tx) => {
    const maxRows = await tx
      .select({ max: sql<number>`COALESCE(MAX(${generalAlerts.position}), -1)::int` })
      .from(generalAlerts)
      .where(eq(generalAlerts.editionId, input.editionId));
    const nextPosition: number = (maxRows[0]?.max ?? -1) + 1;

    const rows = await tx
      .insert(generalAlerts)
      .values({
        editionId: input.editionId,
        variant: input.variant,
        title: emptyToNull(input.title),
        content: input.content,
        isPublished: input.isPublished,
        position: nextPosition,
      })
      .returning();
    const row = rows[0];
    if(row === undefined) {
      throw new Error('createGeneralAlert: insert returned no row');
    }
    return row;
  });
};

export const updateGeneralAlert = async (id: string, input: UpdateGeneralAlertInput): Promise<GeneralAlertRow | null> => {
  const rows = await db
    .update(generalAlerts)
    .set({
      variant: input.variant,
      title: emptyToNull(input.title),
      content: input.content,
      isPublished: input.isPublished,
      updatedAt: sql`NOW()`,
    })
    .where(eq(generalAlerts.id, id))
    .returning();
  return rows[0] ?? null;
};

export const deleteGeneralAlert = async (id: string): Promise<boolean> => {
  const rows = await db.delete(generalAlerts).where(eq(generalAlerts.id, id)).returning({ id: generalAlerts.id });
  return rows.length > 0;
};

/**
 * Reorder an edition's alerts to match `orderedIds`. Validates the id set
 * matches the edition's alerts exactly, then reassigns positions in two passes
 * inside one transaction (the (edition_id, position) UNIQUE + position>=0 CHECK
 * forbid negative temporaries): first into a fresh band above the old max, then
 * down to 0..n-1. Returns false on id-set mismatch (-> 400) or missing edition.
 */
export const reorderGeneralAlerts = async (editionId: string, orderedIds: string[]): Promise<boolean> => {
  return db.transaction(async (tx) => {
    const current = await tx
      .select({ id: generalAlerts.id, position: generalAlerts.position })
      .from(generalAlerts)
      .where(eq(generalAlerts.editionId, editionId))
      .orderBy(asc(generalAlerts.position));

    const currentIds = new Set(current.map((r) => r.id));
    if(current.length !== orderedIds.length || !orderedIds.every((id) => currentIds.has(id))) {
      return false;
    }

    const base: number = current.reduce((m, r) => (r.position > m ? r.position : m), -1) + 1;

    // Pass 1: shift everyone into a fresh band [base, base+n) — unique, above old max.
    for(let i = 0; i < orderedIds.length; i++) {
      const id = orderedIds[i];
      if(id === undefined) {
        continue;
      }
      await tx
        .update(generalAlerts)
        .set({ position: base + i })
        .where(and(eq(generalAlerts.id, id), eq(generalAlerts.editionId, editionId)));
    }
    // Pass 2: set final positions 0..n-1 (targets below the band → no collision).
    for(let i = 0; i < orderedIds.length; i++) {
      const id = orderedIds[i];
      if(id === undefined) {
        continue;
      }
      await tx
        .update(generalAlerts)
        .set({ position: i })
        .where(and(eq(generalAlerts.id, id), eq(generalAlerts.editionId, editionId)));
    }
    return true;
  });
};
