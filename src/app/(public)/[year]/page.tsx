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
import EditionEmbeds from 'components/EditionEmbeds/EditionEmbeds';
import EventsRecap from 'components/EventsRecap/EventsRecap';
import EventCategoryView from 'components/EventCategoryView/EventCategoryView';
import EventsMap from 'components/EventsMap/EventsMap';
import GeneralAlertsBanner from 'components/GeneralAlertsBanner/GeneralAlertsBanner';
import EmptyEditionView from 'components/EmptyEditionView/EmptyEditionView';
import FavoritesProvider from 'components/Favorites/FavoritesProvider';
import FavoritesSection from 'components/Favorites/FavoritesSection';

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';
import type { EditionView, EmbedLinkView, EventSummaryView, GeneralAlertView } from './types';

/* Helpers --------------------------------------------- */
// Thrown by the fetch helpers when an edition is missing. The effect translates it into
// the `editionNotFound` flag so `notFound()` can be called during render (calling it from
// inside an async promise callback would never reach Next's not-found boundary).
class EditionNotFoundError extends Error {}

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

const fetchEdition = async (year: string): Promise<{ edition: EditionView; generalAlerts: GeneralAlertView[]; embedLinks: EmbedLinkView[] }> => {
  const response: Response = await fetch(`/api/editions/${year}`);
  // A 400 here means a malformed year param (the only client error these endpoints raise for valid callers); treat it as not-found.
  if(response.status === 404 || response.status === 400) {
    throw new EditionNotFoundError();
  }
  if(!response.ok) {
    throw new Error(`Edition fetch failed: ${response.status}`);
  }
  return await response.json() as { edition: EditionView; generalAlerts: GeneralAlertView[]; embedLinks: EmbedLinkView[] };
};

const fetchEvents = async (year: string): Promise<EventSummaryView[]> => {
  // The events endpoint caps at limit=200 (its API max). Current editions have ~50 events.
  // If an edition grows beyond 200, switch to keyset pagination via `nextCursor`.
  const response: Response = await fetch(`/api/editions/${year}/events?limit=200`);
  // A 400 here means a malformed year param (the only client error these endpoints raise for valid callers); treat it as not-found.
  if(response.status === 404 || response.status === 400) {
    throw new EditionNotFoundError();
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

  if(!/^\d{4}$/.test(year)) {
    notFound();
  }

  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editionNotFound, setEditionNotFound] = useState<boolean>(false);
  const [edition, setEdition] = useState<EditionView | null>(null);
  const [generalAlerts, setGeneralAlerts] = useState<GeneralAlertView[]>([]);
  const [embedLinks, setEmbedLinks] = useState<EmbedLinkView[]>([]);
  const [summaries, setSummaries] = useState<EventSummaryView[]>([]);

  const { setState: setHeaderState } = useHeader();

  useEffect(
    () => {
      let cancelled: boolean = false;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(true);
      setErrorMessage(null);
      setEditionNotFound(false);
      Promise.all([fetchEdition(year), fetchEvents(year)])
        .then(
          ([editionPayload, eventList]): void => {
            if(cancelled) return;
            setEdition(editionPayload.edition);
            setGeneralAlerts(editionPayload.generalAlerts);
            setEmbedLinks(editionPayload.embedLinks);
            setSummaries(eventList);
            setHeaderState({ year: Number(year), eventsCount: eventList.length });
          },
        )
        .catch(
          (error: unknown): void => {
            if(cancelled) return;
            if(error instanceof EditionNotFoundError) {
              setEditionNotFound(true);
              return;
            }
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

  if(editionNotFound) {
    notFound();
  }
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
  if(edition === null) {
    return null;
  }
  if(viewEvents.length === 0) {
    return (
      <div className="flex flex-col place-items-center min-w-full py-4 lg:py-0">
        <GeneralAlertsBanner alerts={generalAlerts} />
        <EmptyEditionView />
      </div>
    );
  }

  const eventJsonLd: Array<Record<string, unknown>> = viewEvents
    .filter((event: Event): boolean => event.name !== undefined && event.name.length > 0)
    .map(
      (event: Event): Record<string, unknown> => {
        const place: Record<string, unknown> = {
          '@type': 'Place',
          name: event.location.name,
        };
        if(event.location.addressStr !== undefined && event.location.addressStr.length > 0) {
          place.address = event.location.addressStr;
        }
        const eventStatusMap: Record<string, string> = {
          canceled: 'https://schema.org/EventCancelled',
          postponed: 'https://schema.org/EventPostponed',
          rescheduled: 'https://schema.org/EventRescheduled',
        };
        const node: Record<string, unknown> = {
          '@context': 'https://schema.org',
          '@type': 'Event',
          name: event.name,
          startDate: event.startTime.toISOString(),
          eventStatus: event.status !== undefined
            ? eventStatusMap[event.status] ?? 'https://schema.org/EventScheduled'
            : 'https://schema.org/EventScheduled',
          location: place,
        };
        if(event.endTime !== undefined) {
          node.endDate = event.endTime.toISOString();
        }
        return node;
      },
    );

  return (
    <FavoritesProvider editionId={edition.id}>
      <div className="flex flex-col place-items-center min-w-full py-4 lg:py-0">
        {
          eventJsonLd.length > 0 &&
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
            />
        }
        <GeneralAlertsBanner alerts={generalAlerts} />
        <FavoritesSection events={viewEvents} feteDeLaMusiqueDay={feteDeLaMusiqueDay} />
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
        <EditionEmbeds embeds={embedLinks} />
        <section className="w-full max-w-5xl px-4 g:py-8 mx-auto lg:px-0">
          <h4 className="text-2xl font-semibold tracking-tight pb-4">
            Cartes des événements
          </h4>
          {
            process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY !== undefined &&
            process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.length > 0 &&
              <EventsMap events={viewEvents} />
          }
        </section>
      </div>
    </FavoritesProvider>
  );
};

/* Export EditionPage component ------------------------ */
export default EditionPage;
