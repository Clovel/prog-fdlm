'use client';

/* Framework imports ----------------------------------- */
import React, { useEffect, useMemo } from 'react';
import { notFound, useParams } from 'next/navigation';

/* Module imports -------------------------------------- */
import { reduceEventsByCategory } from 'helpers/reduceEventsByCategory';
import { sortEventsByCategoryEntries } from 'helpers/orderEventsByCategory';
import { useHeader } from 'app/HeaderContext';
import { useEdition } from 'hooks/public/useEdition';
import { useEditionEvents } from 'hooks/public/useEditionEvents';
import { useEditionFilters } from 'hooks/public/useEditionFilters';
import { EditionNotFoundError } from 'hooks/public/editionNotFound';

/* Component imports ----------------------------------- */
import { Button } from 'components/ui/button';
import { Separator } from 'components/ui/separator';
import EditionEmbeds from 'components/EditionEmbeds/EditionEmbeds';
import EventsRecap from 'components/EventsRecap/EventsRecap';
import EventCategoryView from 'components/EventCategoryView/EventCategoryView';
import EventsMap from 'components/EventsMap/EventsMap';
import GeneralAlertsBanner from 'components/GeneralAlertsBanner/GeneralAlertsBanner';
import EmptyEditionView from 'components/EmptyEditionView/EmptyEditionView';
import FavoritesProvider from 'components/Favorites/FavoritesProvider';
import FavoritesSection from 'components/Favorites/FavoritesSection';
import EditionEventsFilterTool from 'components/EditionEventsFilterTool/EditionEventsFilterTool';

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';
import type { EventWithDetailView } from './types';

/* Helpers --------------------------------------------- */
// Maps a consolidated event DTO (full detail inlined) into the render `Event`
// contract. Descriptions/links/embeds/alerts arrive with the list, so nothing
// is fetched per-event on expand — no "Chargement des détails…" flash.
const dtoToEvent = (dto: EventWithDetailView): Event => ({
  id: dto.id,
  name: dto.name ?? undefined,
  status: dto.status ?? undefined,
  category: dto.category ?? undefined,
  genres: dto.genres ?? undefined,
  artists: dto.artists ?? undefined,
  price: dto.priceText ?? undefined,
  location: {
    name: dto.location.name,
    addressStr: dto.location.address ?? undefined,
    coords: dto.location.coords ?? undefined,
  },
  startTime: new Date(dto.startTime),
  endTime: dto.endTime !== null ? new Date(dto.endTime) : undefined,
  description: dto.description ?? undefined,
  favoriteCount: dto.favoriteCount,
  links: dto.links,
  embedLinks: dto.embedLinks.map(({ platform, url }) => ({ type: platform, url })),
  alerts: dto.alerts.map(
    ({ variant, title, content }) => ({
      type: variant,
      title: title ?? undefined,
      content,
    }),
  ),
});

/* EditionPage component prop types -------------------- */
interface EditionPageProps {}

/* EditionPage component ------------------------------- */
const EditionPage: React.FC<EditionPageProps> = () => {
  const params = useParams<{ year: string }>();
  const year: string = params.year;

  if(!/^\d{4}$/.test(year)) {
    notFound();
  }

  const editionQuery = useEdition(year);
  const eventsQuery = useEditionEvents(year);

  const { setState: setHeaderState } = useHeader();

  const edition = editionQuery.data?.edition ?? null;
  const generalAlerts = editionQuery.data?.generalAlerts ?? [];
  const embedLinks = editionQuery.data?.embedLinks ?? [];

  const viewEvents: Event[] = useMemo<Event[]>(
    () => (eventsQuery.data ?? []).map(dtoToEvent),
    [eventsQuery.data],
  );

  const feteDeLaMusiqueDay: Date = useMemo<Date>(
    () => (edition !== null ? new Date(edition.dayOfFestival) : new Date(`${year}-06-21`)),
    [edition, year],
  );

  // Mirror the loaded edition into the shared header; clear on unmount / year change.
  useEffect(
    () => {
      if(eventsQuery.data !== undefined) {
        setHeaderState({ year: Number(year), eventsCount: eventsQuery.data.length });
      }
      return (): void => {
        setHeaderState({ year: null, eventsCount: null });
      };
    },
    [
      year,
      eventsQuery.data,
      setHeaderState,
    ],
  );

  const {
    filters,
    setFilters,
    reset: resetFilters,
    activeCount,
    filteredEvents,
  } = useEditionFilters(viewEvents, feteDeLaMusiqueDay);

  const editionNotFound: boolean =
    editionQuery.error instanceof EditionNotFoundError ||
    eventsQuery.error instanceof EditionNotFoundError;

  const hasOtherError: boolean =
    (editionQuery.isError && !(editionQuery.error instanceof EditionNotFoundError)) ||
    (eventsQuery.isError && !(eventsQuery.error instanceof EditionNotFoundError));

  const loading: boolean = editionQuery.isPending || eventsQuery.isPending;

  if(editionNotFound) {
    notFound();
  }
  if(hasOtherError) {
    console.error('[EditionPage] load failed:', editionQuery.error ?? eventsQuery.error);
    return (
      <div className="flex justify-center w-full py-16">
        <p className="text-destructive">Impossible de charger les événements.</p>
      </div>
    );
  }
  if(loading) {
    return (
      <div className="flex justify-center w-full py-16">
        <p className="text-muted-foreground">Chargement des événements...</p>
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
      <div className="flex flex-col place-items-center min-w-full gap-0">
        {
          eventJsonLd.length > 0 &&
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
            />
        }
        <GeneralAlertsBanner alerts={generalAlerts} />
        <FavoritesSection events={viewEvents} feteDeLaMusiqueDay={feteDeLaMusiqueDay} />
        <EditionEventsFilterTool
          filters={filters}
          onChange={setFilters}
          onReset={resetFilters}
          activeCount={activeCount}
          resultCount={filteredEvents.length}
        />
        {
          filteredEvents.length === 0
            ? (
              <div className="flex flex-col items-center gap-3 w-full max-w-5xl px-4 py-12 mx-auto text-center">
                <p className="text-muted-foreground">
                  Aucun événement ne correspond à votre recherche.
                </p>
                <Button variant="outline" onClick={resetFilters}>
                  Réinitialiser les filtres
                </Button>
              </div>
            )
            : Object.entries(reduceEventsByCategory(filteredEvents))
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
          <EventsMap events={filteredEvents} />
        </section>
      </div>
    </FavoritesProvider>
  );
};

/* Export EditionPage component ------------------------ */
export default EditionPage;
