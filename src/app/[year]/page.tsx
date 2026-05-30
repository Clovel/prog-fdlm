'use client';

/* Framework imports ----------------------------------- */
import React, { useEffect, useMemo, useState } from 'react';
import { notFound, useParams } from 'next/navigation';

/* Module imports -------------------------------------- */
import { reduceEventsByCategory } from 'helpers/reduceEventsByCategory';
import { sortEventsByCategoryEntries } from 'helpers/orderEventsByCategory';
import { useHeader } from 'app/HeaderContext';

/* Component imports ----------------------------------- */
import { Separator } from 'components/ui/separator';
import { InstagramEmbed } from 'components/embeds';
import EventsRecap from 'components/EventsRecap/EventsRecap';
import EventCategoryView from 'components/EventCategoryView/EventCategoryView';
import EventsMap from 'components/EventsMap/EventsMap';

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';
import type { EditionView, EventSummaryView, GeneralAlertView } from './types';

/* Helpers --------------------------------------------- */
const summaryToEvent = (summary: EventSummaryView): Event => ({
  id: summary.id,
  name: summary.name ?? undefined,
  status: summary.status ?? undefined,
  category: summary.category ?? undefined,
  genres: summary.genres ?? undefined,
  artists: summary.artists ?? undefined,
  price: summary.priceText ?? undefined,
  location: {
    name: summary.location.name,
    addressStr: summary.location.address ?? undefined,
  },
  startTime: new Date(summary.startTime),
  endTime: summary.endTime !== null ? new Date(summary.endTime) : undefined,
  hasDescription: summary.hasDescription,
  linkCount: summary.linkCount,
  embedCount: summary.embedCount,
  alertCount: summary.alertCount,
});

const fetchEdition = async (year: string): Promise<{ edition: EditionView; generalAlerts: GeneralAlertView[] }> => {
  const response: Response = await fetch(`/api/editions/${year}`);
  if(response.status === 404) {
    notFound();
  }
  if(!response.ok) {
    throw new Error(`Edition fetch failed: ${response.status}`);
  }
  return await response.json() as { edition: EditionView; generalAlerts: GeneralAlertView[] };
};

const fetchEvents = async (year: string): Promise<EventSummaryView[]> => {
  const response: Response = await fetch(`/api/editions/${year}/events?limit=200`);
  if(response.status === 404) {
    notFound();
  }
  if(!response.ok) {
    throw new Error(`Events fetch failed: ${response.status}`);
  }
  const body = await response.json() as { events: EventSummaryView[]; nextCursor: string | null };
  return body.events;
};

/* EditionPage component prop types -------------------- */
interface EditionPageProps {}

/* EditionPage component ------------------------------- */
const EditionPage: React.FC<EditionPageProps> = () => {
  const params = useParams<{ year: string }>();
  const year: string = params.year;

  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [edition, setEdition] = useState<EditionView | null>(null);
  const [generalAlerts, setGeneralAlerts] = useState<GeneralAlertView[]>([]);
  const [summaries, setSummaries] = useState<EventSummaryView[]>([]);

  const { setState: setHeaderState } = useHeader();

  useEffect(
    () => {
      let cancelled: boolean = false;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(true);
      setErrorMessage(null);
      Promise.all([fetchEdition(year), fetchEvents(year)])
        .then(
          ([editionPayload, eventList]): void => {
            if(cancelled) return;
            setEdition(editionPayload.edition);
            setGeneralAlerts(editionPayload.generalAlerts);
            setSummaries(eventList);
            setHeaderState({ year: Number(year), eventsCount: eventList.length });
          },
        )
        .catch(
          (error: unknown): void => {
            if(cancelled) return;
            console.error('[EditionPage] load failed:', error);
            setErrorMessage('Impossible de charger les événements.');
          },
        )
        .finally(
          (): void => {
            if(!cancelled) setLoading(false);
          },
        );
      return (): void => {
        cancelled = true;
        setHeaderState({ year: null, eventsCount: null });
      };
    },
    [year, setHeaderState],
  );

  const viewEvents: Event[] = useMemo<Event[]>(
    () => summaries.map(summaryToEvent),
    [summaries],
  );

  const feteDeLaMusiqueDay: Date = useMemo<Date>(
    () => (edition !== null ? new Date(edition.dayOfFestival) : new Date(`${year}-06-21`)),
    [edition, year],
  );

  if(loading) {
    return (
      <div className="flex justify-center w-full py-16">
        <p className="text-muted-foreground">Chargement des événements...</p>
      </div>
    );
  }
  if(errorMessage !== null) {
    return (
      <div className="flex justify-center w-full py-16">
        <p className="text-destructive">{errorMessage}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col place-items-center min-w-full py-4 lg:py-0">
      {
        generalAlerts.length > 0 &&
          <div className="w-full max-w-5xl px-4 mx-auto pb-4">
            <ul className="text-sm text-muted-foreground list-disc pl-4">
              {generalAlerts.map((alert) => (
                <li key={alert.id}>
                  {alert.title !== null ? `${alert.title}: ` : ''}{alert.content}
                </li>
              ))}
            </ul>
          </div>
      }
      {
        Object.entries(reduceEventsByCategory(viewEvents))
          .sort(sortEventsByCategoryEntries)
          .map(
            (categoryEntry, index, array) => {
              const categoryTitle = categoryEntry[0];
              const categoryEvents = categoryEntry[1];
              return (
                <React.Fragment key={`${categoryTitle}-${index}`}>
                  <EventCategoryView
                    categoryTitle={categoryTitle}
                    categoryEvents={categoryEvents}
                    feteDeLaMusiqueDay={feteDeLaMusiqueDay}
                  />
                  {
                    array.length - 1 !== index &&
                      <Separator className="w-full" />
                  }
                </React.Fragment>
              );
            },
          )
      }
      <EventsRecap events={viewEvents} />
      <section className="w-full max-w-5xl px-4 g:py-8 mx-auto lg:px-0">
        <InstagramEmbed url="https://www.instagram.com/p/C8bvNYJI_BV/?img_index=1" />
      </section>
      <section className="w-full max-w-5xl px-4 g:py-8 mx-auto lg:px-0">
        <h4 className="text-2xl font-semibold tracking-tight pb-4">
          Cartes des événements
        </h4>
        {
          process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY !== undefined &&
          process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.length > 0 &&
            <EventsMap events={viewEvents} />
        }
        <InstagramEmbed url="https://www.instagram.com/p/C8bz_zPIUdX/" />
      </section>
    </div>
  );
};

/* Export EditionPage component ------------------------ */
export default EditionPage;
