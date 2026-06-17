'use client';

/* Framework imports ----------------------------------- */
import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

/* Module imports -------------------------------------- */
import { reduceEventsByCategory } from 'helpers/reduceEventsByCategory';
import { sortEventsByCategoryEntries } from 'helpers/orderEventsByCategory';
import { useHeader } from 'app/HeaderContext';
import { useEditionFilters } from 'hooks/public/useEditionFilters';

/* Component imports ----------------------------------- */
import { Button } from 'components/ui/button';
import { Separator } from 'components/ui/separator';
import EditionEmbeds from 'components/EditionEmbeds/EditionEmbeds';
import EventsRecap from 'components/EventsRecap/EventsRecap';
import EventCategoryView from 'components/EventCategoryView/EventCategoryView';
import GeneralAlertsBanner from 'components/GeneralAlertsBanner/GeneralAlertsBanner';
import EmptyEditionView from 'components/EmptyEditionView/EmptyEditionView';
import FavoritesProvider from 'components/Favorites/FavoritesProvider';
import FavoritesSection from 'components/Favorites/FavoritesSection';
import EditionEventsFilterTool from 'components/EditionEventsFilterTool/EditionEventsFilterTool';

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';
import type {
  EditionView,
  EmbedLinkView,
  EventWithDetailView,
  GeneralAlertView,
} from './types';

/* Dynamic imports ------------------------------------- */
// maplibre touches document during render → cannot SSR. Load client-only; the
// placeholder reserves the map's height so its late mount does not shift layout.
const EventsMap = dynamic(
  () => import('components/EventsMap/EventsMap'),
  {
    ssr: false,
    loading: (): React.ReactElement => (
      <div className="h-[600px] w-full overflow-hidden rounded-md border border-border bg-muted/30" />
    ),
  },
);

/* Helpers --------------------------------------------- */
// Maps a consolidated event DTO (full detail inlined) into the render `Event`
// contract. Descriptions/links/embeds/alerts arrive with the list, so nothing
// is fetched per-event on expand.
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

/* EditionAgenda component prop types ------------------ */
interface EditionAgendaProps {
  edition: EditionView;
  generalAlerts: GeneralAlertView[];
  embedLinks: EmbedLinkView[];
  events: EventWithDetailView[];
  serverNowIso: string;
}

/* EditionAgenda component ----------------------------- */
const EditionAgenda: React.FC<EditionAgendaProps> = (
  {
    edition,
    generalAlerts,
    embedLinks,
    events,
    serverNowIso,
  },
) => {
  const { setState: setHeaderState } = useHeader();

  // Server-captured request instant — identical on server render and client
  // hydration, so all time-based filtering renders the same tree on both.
  // useState (lazy init), NOT useMemo: it must be referentially STABLE across
  // re-renders, otherwise the filteredEvents useMemo (keyed on `now`) recomputes
  // every render. serverNowIso never changes for this component's lifetime.
  const [now] = useState<Date>(() => new Date(serverNowIso));

  const viewEvents: Event[] = useMemo<Event[]>(
    () => events.map(dtoToEvent),
    [events],
  );

  const feteDeLaMusiqueDay: Date = useMemo<Date>(
    () => new Date(edition.dayOfFestival),
    [edition.dayOfFestival],
  );

  // Mirror the loaded edition into the shared header; clear on unmount / change.
  useEffect(
    () => {
      setHeaderState({ year: edition.year, eventsCount: events.length });
      return (): void => {
        setHeaderState({ year: null, eventsCount: null });
      };
    },
    [
      edition.year,
      events.length,
      setHeaderState,
    ],
  );

  const {
    filters,
    setFilters,
    reset: resetFilters,
    activeCount,
    filteredEvents,
  } = useEditionFilters(viewEvents, feteDeLaMusiqueDay, now);

  if(viewEvents.length === 0) {
    return (
      <div className="flex flex-col place-items-center min-w-full py-4 lg:py-0">
        <GeneralAlertsBanner alerts={generalAlerts} />
        <EmptyEditionView />
      </div>
    );
  }

  return (
    <FavoritesProvider editionId={edition.id}>
      <div className="flex flex-col place-items-center min-w-full gap-0">
        <GeneralAlertsBanner alerts={generalAlerts} />
        <FavoritesSection events={viewEvents} feteDeLaMusiqueDay={feteDeLaMusiqueDay} />
        <EditionEventsFilterTool
          filters={filters}
          feteDeLaMusiqueDay={feteDeLaMusiqueDay}
          now={now}
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

/* Export EditionAgenda component ---------------------- */
export default EditionAgenda;
