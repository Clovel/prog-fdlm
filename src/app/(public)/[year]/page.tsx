/* Framework imports ----------------------------------- */
import type React from 'react';
import { notFound } from 'next/navigation';

/* Module imports (project) ---------------------------- */
import { getEdition, listEditionEventsWithDetail } from 'db/queries';
import { getEventShareData } from 'db/queries/getEventShareData';
import { buildEventJsonLd } from 'helpers/buildEventJsonLd';
import { OG_SITE } from 'lib/shareCard/ogBase';
import { formatInTimeZone } from 'date-fns-tz';
import { fr } from 'date-fns/locale';

/* Component imports ----------------------------------- */
import EditionAgenda from './EditionAgenda';

/* Type imports ---------------------------------------- */
import type { GeneralAlertView } from './types';
import type { Metadata } from 'next';

/* Metadata -------------------------------------------- */
// Per-event OG when a ?event= link is opened; otherwise return {} so the
// edition-level metadata from layout.tsx is inherited. metadataBase (root
// layout) resolves the relative OG image URL to an absolute one for crawlers.
export const generateMetadata = async(
  {
    params,
    searchParams,
  }: {
    params: Promise<{ year: string }>;
    searchParams: Promise<{ event?: string }>;
  },
): Promise<Metadata> => {
  const [{ year }, { event }] = await Promise.all([params, searchParams]);
  if(typeof event !== 'string' || event.length === 0) {
    return {};
  }

  const data = await getEventShareData(event);
  if(data === null || String(data.year) !== year) {
    return {};
  }

  const title = `${data.name ?? data.venueName} — Fête de la Musique ${data.year} à Bordeaux`;
  const dateLabel = formatInTimeZone(new Date(data.startTime), 'Europe/Paris', 'EEEE d MMMM', { locale: fr });
  const description = `${data.venueName} · ${dateLabel}`;
  const image = `/api/og/event/${event}`;

  return {
    title,
    description,
    openGraph: {
      ...OG_SITE,
      title,
      description,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
};

/* EditionPage component ------------------------------- */
const EditionPage = async(
  {
    params,
    searchParams,
  }: {
    params: Promise<{ year: string }>;
    searchParams: Promise<{ event?: string }>;
  },
): Promise<React.ReactElement> => {
  const { year } = await params;
  if(!/^\d{4}$/.test(year)) {
    notFound();
  }
  const { event: focusEventId } = await searchParams;

  const yearNum: number = Number(year);
  const [editionPayload, events] = await Promise.all([
    getEdition(yearNum),
    listEditionEventsWithDetail(yearNum),
  ]);

  if(editionPayload === null || events === null) {
    notFound();
  }

  // getEdition already filters to isPublished:true alerts in its WHERE clause,
  // so we can safely inject isPublished:true when mapping to the view type.
  const generalAlerts: GeneralAlertView[] = editionPayload.generalAlerts.map(
    (alert): GeneralAlertView => ({
      ...alert,
      isPublished: true,
    }),
  );

  const serverNowIso: string = new Date().toISOString();
  const jsonLd: Array<Record<string, unknown>> = buildEventJsonLd(events);

  return (
    <>
      {
        jsonLd.length > 0 &&
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
      }
      <EditionAgenda
        edition={editionPayload.edition}
        generalAlerts={generalAlerts}
        embedLinks={editionPayload.embedLinks}
        events={events}
        serverNowIso={serverNowIso}
        focusEventId={typeof focusEventId === 'string' ? focusEventId : undefined}
      />
    </>
  );
};

/* Export EditionPage component ------------------------ */
export default EditionPage;
