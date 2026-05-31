/* Module imports -------------------------------------- */
import { and, asc, eq, sql } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../index';
import { editionEmbedLinks } from '../schema';

/* Type imports ---------------------------------------- */
import type { CreateEditionEmbedInput, UpdateEditionEmbedInput } from 'validation/editionEmbed';
import type { EditionEmbedLinkRow } from '../schema';

/* Mutations ------------------------------------------- */
export const createEditionEmbed = async (input: CreateEditionEmbedInput): Promise<EditionEmbedLinkRow> => {
  return db.transaction(async (tx): Promise<EditionEmbedLinkRow> => {
    const maxRows = await tx
      .select({ max: sql<number>`COALESCE(MAX(${editionEmbedLinks.position}), -1)::int` })
      .from(editionEmbedLinks)
      .where(eq(editionEmbedLinks.editionId, input.editionId));
    const nextPosition: number = (maxRows[0]?.max ?? -1) + 1;

    const rows = await tx
      .insert(editionEmbedLinks)
      .values({
        editionId: input.editionId,
        platform: input.platform,
        url: input.url,
        isPublished: input.isPublished,
        position: nextPosition,
      })
      .returning();
    const row = rows[0];
    if(row === undefined) {
      throw new Error('createEditionEmbed: insert returned no row');
    }
    return row;
  });
};

export const updateEditionEmbed = async (id: string, input: UpdateEditionEmbedInput): Promise<EditionEmbedLinkRow | null> => {
  const rows = await db
    .update(editionEmbedLinks)
    .set({
      platform: input.platform,
      url: input.url,
      isPublished: input.isPublished,
      updatedAt: sql`NOW()`,
    })
    .where(eq(editionEmbedLinks.id, id))
    .returning();
  return rows[0] ?? null;
};

export const deleteEditionEmbed = async (id: string): Promise<boolean> => {
  const rows = await db.delete(editionEmbedLinks).where(eq(editionEmbedLinks.id, id)).returning({ id: editionEmbedLinks.id });
  return rows.length > 0;
};

/**
 * Reorder one edition's embeds to match `orderedIds`. Validates the id set
 * matches the edition's embeds exactly, then reassigns positions in two passes
 * in one transaction (the (edition_id, position) UNIQUE + position>=0 CHECK
 * forbid negative temporaries): first into a fresh band above the old max, then
 * down to 0..n-1. Returns false on id-set mismatch (-> 400) or missing edition.
 */
export const reorderEditionEmbeds = async (editionId: string, orderedIds: string[]): Promise<boolean> => {
  return db.transaction(async (tx): Promise<boolean> => {
    const current = await tx
      .select({ id: editionEmbedLinks.id, position: editionEmbedLinks.position })
      .from(editionEmbedLinks)
      .where(eq(editionEmbedLinks.editionId, editionId))
      .orderBy(asc(editionEmbedLinks.position));

    const currentIds = new Set(current.map((r) => r.id));
    if(current.length !== orderedIds.length || !orderedIds.every((id) => currentIds.has(id))) {
      return false;
    }

    const base: number = current.reduce((m, r) => (r.position > m ? r.position : m), -1) + 1;

    for(let i = 0; i < orderedIds.length; i++) {
      const id = orderedIds[i];
      if(id === undefined) { continue; }
      await tx.update(editionEmbedLinks).set({ position: base + i }).where(and(eq(editionEmbedLinks.id, id), eq(editionEmbedLinks.editionId, editionId)));
    }
    for(let i = 0; i < orderedIds.length; i++) {
      const id = orderedIds[i];
      if(id === undefined) { continue; }
      await tx.update(editionEmbedLinks).set({ position: i }).where(and(eq(editionEmbedLinks.id, id), eq(editionEmbedLinks.editionId, editionId)));
    }
    return true;
  });
};
