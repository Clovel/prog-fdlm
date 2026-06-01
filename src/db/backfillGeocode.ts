/**
 * One-off (repeatable) geocode backfill.
 *
 * Geocodes every event that has an address but no geocode result yet
 * (`geocode_status IS NULL`), updating ONLY the geocode columns. It never
 * touches event content, so it is safe to run against a live, admin-edited DB
 * — unlike `db:seed`, which re-upserts fixture content. Idempotent: rows that
 * already have a status (`ok` or `failed`) are skipped, so re-running only
 * processes newly-added, still-ungeocoded events.
 *
 * Run: `pnpm db:backfill:geocode` (loads .env.local).
 */

/* Module imports -------------------------------------- */
import { and, count, eq, isNotNull, isNull, sql } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from './index';
import { events } from './schema';
import { geocodeResultToColumns } from './geocodeColumns';
import { geocodeAddress } from 'lib/geocode';

/* Main ------------------------------------------------ */
const main = async (): Promise<void> => {
  // Whole-table snapshot first, so a no-op run explains WHY it found nothing
  // (everything addressable is already geocoded) rather than looking broken.
  const summaryRows = await db
    .select({
      total: count(),
      withCoords: sql<number>`count(*) FILTER (WHERE ${events.latitude} IS NOT NULL)::int`,
      withoutAddress: sql<number>`count(*) FILTER (WHERE ${events.locationAddress} IS NULL OR btrim(${events.locationAddress}) = '')::int`,
    })
    .from(events);
  const summary = summaryRows[0] ?? { total: 0, withCoords: 0, withoutAddress: 0 };

  const candidates = await db
    .select({ id: events.id, locationAddress: events.locationAddress })
    .from(events)
    .where(
      and(
        isNull(events.geocodeStatus),
        isNotNull(events.locationAddress),
        sql`btrim(${events.locationAddress}) <> ''`,
      ),
    );

  console.log(
    `[backfill] ${summary.total} events: ${summary.withCoords} with coordinates, ${summary.withoutAddress} without an address, ${candidates.length} awaiting geocode.`,
  );

  if(candidates.length === 0) {
    console.log('[backfill] nothing to do — every event that has an address is already geocoded.');
    process.exit(0);
  }

  let ok = 0;
  let failed = 0;
  for(const row of candidates) {
    const addr: string | null = row.locationAddress;
    if(addr === null || addr.trim().length === 0) {
      continue;
    }
    const result = await geocodeAddress(addr);
    await db
      .update(events)
      .set(geocodeResultToColumns(addr, result))
      .where(eq(events.id, row.id));
    if(result.status === 'ok') {
      ok += 1;
    } else {
      failed += 1;
      console.warn(`[backfill] geocode-failed: "${addr}" (event ${row.id})`);
    }
  }

  console.log(`[backfill] done: ${ok} newly geocoded, ${failed} failed.`);
  process.exit(0);
};

main().catch(
  (error) => {
    console.error('[backfill] failed:', error);
    process.exit(1);
  },
);
