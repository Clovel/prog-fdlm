/* Framework imports ----------------------------------- */
import React, { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

/* Module imports -------------------------------------- */
import { cn } from 'lib/utils';
import { useFavorites } from 'components/Favorites/FavoritesProvider';

/* Component imports ----------------------------------- */
import { ChevronDown } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from 'components/ui/collapsible';

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';
import type { MarkerInfo } from 'components/EventsMap/EventsMap';

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

/* EventsMapSection component prop types --------------- */
interface EventsMapSectionProps {
  events: Event[];
}

/* EventsMapSection component -------------------------- */
const EventsMapSection: React.FC<EventsMapSectionProps> = (
  {
    events = [],
  }
) => {
  const { isFavorite } = useFavorites();
  const [ open, setOpen ] = useState<boolean>(true);

  const eventMarkers = useMemo<MarkerInfo[]>(
    () => {
      const markers: MarkerInfo[] = [];
      for(const event of events) {
        const coords = event.location.coords;
        if(coords !== undefined) {
          markers.push({
            id: event.id,
            position: {
              lat: coords.lat,
              lng: coords.lng,
            },
            event,
            isFavorite: isFavorite(event.id),
          });
        }
      }
      return markers;
    },
    [
      events,
      isFavorite,
    ],
  );

  return (
    <section className="w-full max-w-5xl px-4 g:py-8 mx-auto lg:px-0">
      <Collapsible
        open={open}
        onOpenChange={setOpen}
      >
        <CollapsibleTrigger className="w-full">
          <div className=" w-full flex justify-between items-center">
            <h4 className="text-2xl font-semibold tracking-tight py-4">
              Carte des events
            </h4>
            <div className="flex items-center gap-2">
              <span>
                {eventMarkers.length}
                {' '}
                event
                {eventMarkers.length !== 1 ? 's' : ''}
              </span>
              <ChevronDown
                className={
                  cn(
                    'h-5 w-5 transition-transform',
                    open ? 'rotate-180' : 'rotate-0',
                  )
                }
              />
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <EventsMap eventMarkers={eventMarkers} />
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
};

/* Export EventsMapSection component ------------------- */
export default EventsMapSection;
