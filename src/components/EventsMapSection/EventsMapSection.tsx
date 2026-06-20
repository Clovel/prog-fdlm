/* Framework imports ----------------------------------- */
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import dynamic from 'next/dynamic';

/* Module imports -------------------------------------- */
import { cn } from 'lib/utils';
import { useFavorites } from 'components/Favorites/FavoritesProvider';
import { FOCUS_MAP_EVENT_NAME, isFocusMapEvent } from 'helpers/mapFocus';

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
import type { MapFocusTarget, MarkerInfo } from 'components/EventsMap/EventsMap';

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
  const [ focusTarget, setFocusTarget ] = useState<MapFocusTarget | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const nonceRef = useRef<number>(0);

  // A list event's "Voir sur la carte" broadcasts its id. Expand the section,
  // scroll it into view, and hand the id (with a bumped nonce so re-clicks
  // re-trigger) to EventsMap, which opens the marker popup.
  useEffect(
    () => {
      const handleFocusMap = (event: globalThis.Event): void => {
        if(!isFocusMapEvent(event)) {
          return;
        }
        setOpen(true);
        nonceRef.current += 1;
        setFocusTarget({ id: event.detail.id, nonce: nonceRef.current });
        sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };

      window.addEventListener(FOCUS_MAP_EVENT_NAME, handleFocusMap);
      return (): void => {
        window.removeEventListener(FOCUS_MAP_EVENT_NAME, handleFocusMap);
      };
    },
    [],
  );

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
    <section ref={sectionRef} className="w-full max-w-5xl px-4 g:py-8 mx-auto lg:px-0">
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
        <CollapsibleContent forceMount className="data-[state=closed]:hidden">
          <EventsMap
            eventMarkers={eventMarkers}
            expanded={open}
            focusTarget={focusTarget}
          />
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
};

/* Export EventsMapSection component ------------------- */
export default EventsMapSection;
