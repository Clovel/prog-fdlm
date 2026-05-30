/* Module imports -------------------------------------- */
import { and, asc, eq, gt, ilike, inArray, or, sql } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../index';
import { editions, events, eventLinks, eventEmbedLinks, eventAlerts } from '../schema';

/* Type imports ---------------------------------------- */
import type { EventSummaryDto, EventStatus } from './types';
import type { EventCategory } from 'types/eventCategories';

/* Cursor encoding ------------------------------------- */
interface Cursor {
  startTime: string;
  id: string;
}

export const encodeCursor = (c: Cursor): string =>
  Buffer.from(JSON.stringify(c), 'utf-8').toString('base64url');

export const decodeCursor = (raw: string): Cursor | null => {
  try {
    const json: string = Buffer.from(raw, 'base64url').toString('utf-8');
    const parsed: unknown = JSON.parse(json);
    if(
      typeof parsed === 'object' && parsed !== null &&
      'startTime' in parsed && typeof (parsed as Record<string, unknown>).startTime === 'string' &&
      'id' in parsed && typeof (parsed as Record<string, unknown>).id === 'string'
    ) {
      return parsed as Cursor;
    }
    return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch(_) {
    return null;
  }
};

/* Query inputs ---------------------------------------- */
export interface ListEditionEventsInput {
  year: number;
  category?: EventCategory;
  q?: string;
  genre?: string;
  status?: EventStatus;
  ids?: string[];
  cursor?: string;
  limit: number;
}

export interface ListEditionEventsResult {
  events: EventSummaryDto[];
  nextCursor: string | null;
}

/* Query ----------------------------------------------- */
export const listEditionEvents = async (input: ListEditionEventsInput): Promise<ListEditionEventsResult | null> => {
  const editionRows = await db
    .select({ id: editions.id })
    .from(editions)
    .where(eq(editions.year, input.year))
    .limit(1);
  const edition = editionRows[0];
  if(edition === undefined) {
    return null;
  }

  const cursor: Cursor | null = input.cursor !== undefined ? decodeCursor(input.cursor) : null;

  const linkCountSql = sql<number>`(SELECT COUNT(*)::int FROM ${eventLinks} WHERE ${eventLinks.eventId} = ${events.id})`;
  const embedCountSql = sql<number>`(SELECT COUNT(*)::int FROM ${eventEmbedLinks} WHERE ${eventEmbedLinks.eventId} = ${events.id})`;
  const alertCountSql = sql<number>`(SELECT COUNT(*)::int FROM ${eventAlerts} WHERE ${eventAlerts.eventId} = ${events.id})`;
  const hasDescriptionSql = sql<boolean>`(${events.description} IS NOT NULL AND ${events.description} <> '')`;

  const filters = [
    eq(events.editionId, edition.id),
  ];
  if(input.category !== undefined) {
    filters.push(eq(events.category, input.category));
  }
  if(input.status !== undefined) {
    filters.push(eq(events.status, input.status));
  }
  if(input.genre !== undefined && input.genre.length > 0) {
    filters.push(sql`${events.genres} @> ARRAY[${input.genre}]::text[]`);
  }
  if(input.q !== undefined && input.q.length > 0) {
    const like: string = `%${input.q}%`;
    const qFilter = or(
      ilike(events.name, like),
      ilike(events.locationName, like),
      sql`array_to_string(${events.artists}, ' ') ILIKE ${like}`,
    );
    if(qFilter !== undefined) filters.push(qFilter);
  }
  if(input.ids !== undefined && input.ids.length > 0) {
    filters.push(inArray(events.id, input.ids));
  }
  if(cursor !== null) {
    filters.push(
      or(
        gt(events.startTime, new Date(cursor.startTime)),
        and(eq(events.startTime, new Date(cursor.startTime)), gt(events.id, cursor.id)),
      )!,
    );
  }

  const rows = await db
    .select({
      id: events.id,
      editionId: events.editionId,
      name: events.name,
      category: events.category,
      status: events.status,
      genres: events.genres,
      artists: events.artists,
      startTime: events.startTime,
      endTime: events.endTime,
      priceText: events.priceText,
      locationName: events.locationName,
      locationAddress: events.locationAddress,
      linkCount: linkCountSql,
      embedCount: embedCountSql,
      alertCount: alertCountSql,
      hasDescription: hasDescriptionSql,
    })
    .from(events)
    .where(and(...filters))
    .orderBy(asc(events.startTime), asc(events.id))
    .limit(input.limit + 1);

  const hasMore: boolean = rows.length > input.limit;
  const page = hasMore ? rows.slice(0, input.limit) : rows;
  const last = page[page.length - 1];
  const nextCursor: string | null =
    hasMore && last !== undefined
      ? encodeCursor({ startTime: last.startTime.toISOString(), id: last.id })
      : null;

  const summaries: EventSummaryDto[] = page.map(
    (row) => ({
      id: row.id,
      editionId: row.editionId,
      name: row.name,
      category: row.category as EventCategory | null,
      status: row.status,
      genres: row.genres,
      artists: row.artists,
      startTime: row.startTime.toISOString(),
      endTime: row.endTime === null ? null : row.endTime.toISOString(),
      priceText: row.priceText,
      location: {
        name: row.locationName,
        address: row.locationAddress,
      },
      hasDescription: row.hasDescription,
      linkCount: row.linkCount,
      embedCount: row.embedCount,
      alertCount: row.alertCount,
    }),
  );

  return { events: summaries, nextCursor };
};
