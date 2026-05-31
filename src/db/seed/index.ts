/**
 * Seed bootstrap script. Imports the on-disk fixtures and populates the DB.
 *
 * Run once after the first deploy. Re-running it on an existing DB will
 * overwrite event-row content and any link/embed/alert content at matching
 * positions (Strategy B: position-keyed upsert + trailing delete). Child
 * row UUIDs are preserved across re-seeds. Backoffice edits to seeded
 * events will be overwritten if this script is re-run.
 *
 * Use `pnpm db:reset` (drop + migrate + seed) only in development.
 */

/* Framework imports ----------------------------------- */
import { and, eq, sql } from 'drizzle-orm';
import React from 'react';

/* Module imports (project) ---------------------------- */
import { db } from '../index';
import { geocodeAddress } from 'lib/geocode';

/* Type helpers ---------------------------------------- */
/** Transaction client — same interface as `db` but scoped to a transaction. */
type Tx = Parameters<typeof db.transaction>[0] extends (tx: infer T) => unknown ? T : never;
import {
  editions,
  events,
  eventLinks,
  eventEmbedLinks,
  eventAlerts,
} from '../schema';
import { normalizeToParis } from './normalizeTime';
import { events as events2023 } from 'fixtures/events-2023';
import { events as events2024 } from 'fixtures/events-2024';

/* Type imports ---------------------------------------- */
import type { Event, EventLink, EventEmbedLink, EventAlert } from 'types/Event';

/* Local types ----------------------------------------- */
type GeoColumns = Pick<
  typeof events.$inferInsert,
  | 'latitude'
  | 'longitude'
  | 'geocodedAddress'
  | 'geocodeStatus'
  | 'geocodeScore'
  | 'geocodedAt'
  | 'formattedAddress'
>;

type GeoClassification = 'geocoded-ok' | 'geocoded-failed' | 'skipped-cached' | 'skipped-no-address';

interface GeoResolution {
  geo: GeoColumns;
  classification: GeoClassification;
}

/* External variables ---------------------------------- */
interface EditionSeed {
  year: number;
  description: string | null;
  dayOfFestival: string;
  fixture: Event[];
}

const EDITIONS: EditionSeed[] = [
  {
    year: 2023,
    description: null,
    dayOfFestival: '2023-06-21',
    fixture: events2023,
  },
  {
    year: 2024,
    description: null,
    dayOfFestival: '2024-06-21',
    fixture: events2024,
  },
];

/* Helpers --------------------------------------------- */

/**
 * Determine the 7 geocode columns for a seed event row.
 *
 * Resolution order:
 * 1. No address → all 7 null (skipped-no-address, no BAN call).
 * 2. Existing row already geocoded with the same address → reuse as-is (skipped-cached, no BAN call).
 * 3. Otherwise → call BAN, map ok/failed per mutation convention (geocoded-ok / geocoded-failed).
 */
const resolveSeedGeocode = async(
  normAddr: string | null,
  existing: GeoColumns | undefined,
  eventLegacyId: string,
): Promise<GeoResolution> => {
  const nullGeo: GeoColumns = {
    latitude: null,
    longitude: null,
    geocodedAddress: null,
    geocodeStatus: null,
    geocodeScore: null,
    geocodedAt: null,
    formattedAddress: null,
  };

  /* Branch 1: no address. */
  if(normAddr === null) {
    return { geo: nullGeo, classification: 'skipped-no-address' };
  }

  /* Branch 2: already geocoded ok with the same address — reuse unchanged. */
  if(
    existing !== undefined &&
    existing.geocodeStatus === 'ok' &&
    existing.geocodedAddress === normAddr
  ) {
    return {
      geo: {
        latitude: existing.latitude,
        longitude: existing.longitude,
        geocodedAddress: existing.geocodedAddress,
        geocodeStatus: existing.geocodeStatus,
        geocodeScore: existing.geocodeScore,
        geocodedAt: existing.geocodedAt,
        formattedAddress: existing.formattedAddress,
      },
      classification: 'skipped-cached',
    };
  }

  /* Branch 3: call BAN. */
  const result = await geocodeAddress(normAddr);
  if(result.status === 'ok') {
    return {
      geo: {
        latitude: result.lat,
        longitude: result.lng,
        geocodedAddress: normAddr,
        geocodeStatus: 'ok',
        geocodeScore: result.score,
        geocodedAt: new Date(),
        formattedAddress: result.formattedAddress ?? null,
      },
      classification: 'geocoded-ok',
    };
  }

  /* Failed — log a warning then store the failure. */
  console.warn(
    `[seed] geocode failed for "${normAddr}" (event ${eventLegacyId})`,
  );
  return {
    geo: {
      latitude: null,
      longitude: null,
      geocodedAddress: null,
      geocodeStatus: 'failed',
      geocodeScore: result.score ?? null,
      geocodedAt: new Date(),
      formattedAddress: null,
    },
    classification: 'geocoded-failed',
  };
};

const assertString = (value: unknown, context: string): string => {
  if(typeof value !== 'string') {
    throw new Error(`Expected string for ${context}, got ${typeof value}: ${String(value)}`);
  }
  return value;
};

/**
 * Recursively extract plain text from a React.ReactNode.
 * Used to flatten JSX link labels (e.g. `<span><b>[NSFW]</b> label</span>`)
 * into a plain string suitable for the `event_links.label` text column.
 */
const reactNodeToText = (node: React.ReactNode): string => {
  if(node === null || node === undefined || typeof node === 'boolean') {
    return '';
  }
  if(typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if(Array.isArray(node)) {
    return node.map(reactNodeToText).join('');
  }
  if(React.isValidElement(node)) {
    const element = node as React.ReactElement<{ children?: React.ReactNode }>;
    return reactNodeToText(element.props.children);
  }
  return '';
};

const upsertEdition = async (edition: EditionSeed): Promise<string> => {
  const rows = await db
    .insert(editions)
    .values({
      year: edition.year,
      description: edition.description,
      isPublished: true,
      dayOfFestival: edition.dayOfFestival,
    })
    .onConflictDoUpdate({
      target: editions.year,
      set: {
        description: edition.description,
        isPublished: true,
        dayOfFestival: edition.dayOfFestival,
        updatedAt: sql`NOW()`,
      },
    })
    .returning({ id: editions.id });

  if(rows.length === 0 || rows[0] === undefined) {
    throw new Error(`Failed to upsert edition ${edition.year}`);
  }
  return rows[0].id;
};

const upsertEvent = async (
  tx: Tx,
  fixtureEvent: Event,
  editionId: string,
  geo: GeoColumns,
): Promise<string> => {
  const description: string | null =
    fixtureEvent.description === undefined ? null : assertString(fixtureEvent.description, `event ${fixtureEvent.id} description`);
  const priceText: string | null =
    fixtureEvent.price === undefined ? null : String(fixtureEvent.price);
  const startTime: Date = normalizeToParis(fixtureEvent.startTime);
  const endTime: Date | null =
    fixtureEvent.endTime === undefined ? null : normalizeToParis(fixtureEvent.endTime);

  const rows = await tx
    .insert(events)
    .values({
      editionId,
      legacyId: fixtureEvent.id,
      name: fixtureEvent.name ?? null,
      description,
      category: fixtureEvent.category ?? null,
      status: fixtureEvent.status ?? null,
      genres: fixtureEvent.genres ?? null,
      artists: fixtureEvent.artists ?? null,
      priceText,
      locationName: fixtureEvent.location.name,
      locationAddress: fixtureEvent.location.addressStr ?? null,
      startTime,
      endTime,
      ...geo,
    })
    .onConflictDoUpdate({
      target: [events.editionId, events.legacyId],
      targetWhere: sql`legacy_id IS NOT NULL`,
      set: {
        name: fixtureEvent.name ?? null,
        description,
        category: fixtureEvent.category ?? null,
        status: fixtureEvent.status ?? null,
        genres: fixtureEvent.genres ?? null,
        artists: fixtureEvent.artists ?? null,
        priceText,
        locationName: fixtureEvent.location.name,
        locationAddress: fixtureEvent.location.addressStr ?? null,
        startTime,
        endTime,
        updatedAt: sql`NOW()`,
        ...geo,
      },
    })
    .returning({ id: events.id });

  if(rows.length === 0 || rows[0] === undefined) {
    throw new Error(`Failed to upsert event ${fixtureEvent.id}`);
  }
  return rows[0].id;
};

const syncLinks = async (tx: Tx, eventId: string, links: EventLink[] | undefined): Promise<void> => {
  const list: EventLink[] = links ?? [];
  for(let i = 0; i < list.length; i++) {
    const link: EventLink | undefined = list[i];
    if(link === undefined) continue;
    const label: string = typeof link.label === 'string'
      ? link.label
      : reactNodeToText(link.label);
    await tx
      .insert(eventLinks)
      .values({ eventId, url: link.url, label, position: i })
      .onConflictDoUpdate({
        target: [eventLinks.eventId, eventLinks.position],
        set: { url: link.url, label },
      });
  }
  await tx.execute(
    sql`DELETE FROM event_links WHERE event_id = ${eventId} AND position >= ${list.length}`,
  );
};

const syncEmbedLinks = async (
  tx: Tx,
  eventId: string,
  embedLinks: EventEmbedLink[] | undefined,
): Promise<void> => {
  const list: EventEmbedLink[] = embedLinks ?? [];
  for(let i = 0; i < list.length; i++) {
    const embed: EventEmbedLink | undefined = list[i];
    if(embed === undefined) continue;
    await tx
      .insert(eventEmbedLinks)
      .values({ eventId, platform: embed.type, url: embed.url, position: i })
      .onConflictDoUpdate({
        target: [eventEmbedLinks.eventId, eventEmbedLinks.position],
        set: { platform: embed.type, url: embed.url },
      });
  }
  await tx.execute(
    sql`DELETE FROM event_embed_links WHERE event_id = ${eventId} AND position >= ${list.length}`,
  );
};

const syncAlerts = async (
  tx: Tx,
  eventId: string,
  alerts: EventAlert[] | undefined,
): Promise<void> => {
  const list: EventAlert[] = alerts ?? [];
  const validVariants: readonly string[] = [
    'default', 'destructive', 'warning', 'success',
  ];
  for(let i = 0; i < list.length; i++) {
    const alert: EventAlert | undefined = list[i];
    if(alert === undefined) continue;
    const variant: string = alert.type ?? 'default';
    if(!validVariants.includes(variant)) {
      throw new Error(
        `Unknown alert variant "${variant}" on event ${eventId} position ${i}`,
      );
    }
    await tx
      .insert(eventAlerts)
      .values({
        eventId,
        variant: variant as 'default' | 'destructive' | 'warning' | 'success',
        title: alert.title ?? null,
        content: alert.content,
        position: i,
      })
      .onConflictDoUpdate({
        target: [eventAlerts.eventId, eventAlerts.position],
        set: {
          variant: variant as 'default' | 'destructive' | 'warning' | 'success',
          title: alert.title ?? null,
          content: alert.content,
        },
      });
  }
  await tx.execute(
    sql`DELETE FROM event_alerts WHERE event_id = ${eventId} AND position >= ${list.length}`,
  );
};

/* Main ------------------------------------------------ */
const main = async (): Promise<void> => {
  for(const edition of EDITIONS) {
    const editionId: string = await upsertEdition(edition);
    let upsertedEvents: number = 0;
    let childRows: number = 0;
    let geocodedOk: number = 0;
    let geocodedFailed: number = 0;
    let skippedCached: number = 0;
    let skippedNoAddress: number = 0;

    for(const fixtureEvent of edition.fixture) {
      /* Resolve geocode columns BEFORE the transaction — BAN calls must not run inside db.transaction. */
      const addr: string = (fixtureEvent.location.addressStr ?? '').trim();
      const normAddr: string | null = addr.length > 0 ? addr : null;

      /* Read the existing row's geo columns for idempotency. */
      const existingRows = await db
        .select({
          latitude: events.latitude,
          longitude: events.longitude,
          geocodedAddress: events.geocodedAddress,
          geocodeStatus: events.geocodeStatus,
          geocodeScore: events.geocodeScore,
          geocodedAt: events.geocodedAt,
          formattedAddress: events.formattedAddress,
        })
        .from(events)
        .where(and(eq(events.editionId, editionId), eq(events.legacyId, fixtureEvent.id)));
      const existingRow: GeoColumns | undefined = existingRows[0];

      const { geo, classification } = await resolveSeedGeocode(normAddr, existingRow, fixtureEvent.id);

      switch(classification) {
        case 'geocoded-ok':
          geocodedOk += 1;
          break;
        case 'geocoded-failed':
          geocodedFailed += 1;
          break;
        case 'skipped-cached':
          skippedCached += 1;
          break;
        case 'skipped-no-address':
          skippedNoAddress += 1;
          break;
      }

      await db.transaction(async (tx) => {
        const eventId: string = await upsertEvent(tx, fixtureEvent, editionId, geo);
        await syncLinks(tx, eventId, fixtureEvent.links);
        await syncEmbedLinks(tx, eventId, fixtureEvent.embedLinks);
        await syncAlerts(tx, eventId, fixtureEvent.alerts);
      });
      upsertedEvents += 1;
      childRows +=
        (fixtureEvent.links?.length ?? 0) +
        (fixtureEvent.embedLinks?.length ?? 0) +
        (fixtureEvent.alerts?.length ?? 0);
    }
    console.log(
      `[seed] Edition ${edition.year}: ${upsertedEvents} events upserted, ${childRows} child rows upserted, ${geocodedOk} geocoded, ${skippedCached} cached, ${geocodedFailed} failed, ${skippedNoAddress} without address.`,
    );
  }
  console.log('[seed] Done.');
};

main()
  .catch(
    (error) => {
      console.error('[seed] Failed:', error);
      process.exit(1);
    },
  )
  .finally(
    () => {
      process.exit(0);
    },
  );
