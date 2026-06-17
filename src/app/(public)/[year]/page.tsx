/* Framework imports ----------------------------------- */
import type React from 'react';
import { notFound } from 'next/navigation';

/* Module imports (project) ---------------------------- */
import { getEdition, listEditionEventsWithDetail } from 'db/queries';
import { buildEventJsonLd } from 'helpers/buildEventJsonLd';

/* Component imports ----------------------------------- */
import EditionAgenda from './EditionAgenda';

/* Type imports ---------------------------------------- */
import type { GeneralAlertView } from './types';

/* EditionPage component ------------------------------- */
const EditionPage = async(
  { params }: { params: Promise<{ year: string }> },
): Promise<React.ReactElement> => {
  const { year } = await params;
  if(!/^\d{4}$/.test(year)) {
    notFound();
  }

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
      />
    </>
  );
};

/* Export EditionPage component ------------------------ */
export default EditionPage;
