'use client';

/* Framework imports ----------------------------------- */
import React, { useMemo, useState } from 'react';

/* Module imports -------------------------------------- */
import { cn } from 'lib/utils';

/* Component imports ----------------------------------- */
import { ChevronDown, Star } from 'lucide-react';
import { Button } from 'components/ui/button';
import { useFavorites } from 'components/Favorites/FavoritesProvider';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from 'components/ui/collapsible';
import EventTime from './EventTime';
import EventTitleBlock from 'components/EventTitleBlock/EventTitleBlock';
import EventRender from 'components/EventRender/EventRender';
import MapsLink from 'components/MapsLink/MapsLink';

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';

/* EventListItem component prop types ------------------ */
interface EventListItemProps {
  event: Event;
  feteDeLaMusiqueDay: Date;
}

/* Helpers --------------------------------------------- */
// The consolidated list payload carries the full detail, so collapsible
// presence is decided directly from the event's own content — no count proxies.
const hasExpandableContent = (event: Event): boolean => {
  if(event.description !== undefined && event.description.length > 0) return true;
  if(event.links !== undefined && event.links.length > 0) return true;
  if(event.embedLinks !== undefined && event.embedLinks.length > 0) return true;
  if(event.alerts !== undefined && event.alerts.length > 0) return true;
  return false;
};

/* EventListItem component ----------------------------- */
const EventListItem: React.FC<EventListItemProps> = (
  {
    event,
    feteDeLaMusiqueDay,
  },
) => {
  const [open, setOpen] = useState<boolean>(false);

  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite: boolean = isFavorite(event.id);

  const handleToggleFavorite = (mouseEvent: React.MouseEvent): void => {
    mouseEvent.stopPropagation();
    toggleFavorite(event.id);
  };

  const collapsiblePresent: boolean = useMemo<boolean>(
    () => hasExpandableContent(event),
    [event],
  );

  return (
    <li className="py-2">
      <Collapsible
        open={open}
        onOpenChange={setOpen}
        disabled={!collapsiblePresent}
      >
        <div className="flex items-start justify-between gap-2 px-4 rounded-md hover:bg-accent">
          {/* Only the title block is the disclosure trigger — the favorite and
              expand controls are real sibling <button>s (a button cannot legally
              nest other buttons, which previously forced this trigger to be a
              <div>, tripping the aria-allowed-attr / keyboard-access audits). */}
          <div className="flex flex-1 min-w-0 flex-col gap-1">
            <CollapsibleTrigger asChild disabled={!collapsiblePresent}>
              <button
                type="button"
                className={
                  cn(
                    'min-w-0 -mx-2 px-2 py-1 text-left rounded-md text-foreground',
                    collapsiblePresent ? 'cursor-pointer' : 'cursor-default',
                  )
                }
              >
                <EventTitleBlock event={event} />
              </button>
            </CollapsibleTrigger>
            {
              event.location.addressStr !== undefined &&
              event.location.addressStr.length > 0 &&
                <div className="-mx-2 px-2">
                  <MapsLink location={event.location} variant="inline" />
                </div>
            }
          </div>
          <div className="flex flex-col items-end justify-start">
            <div className="flex items-center justify-center">
              {
                event.favoriteCount !== undefined &&
                event.favoriteCount > 0 &&
                  <span
                    className="text-xs tabular-nums text-muted-foreground"
                    aria-label={`${event.favoriteCount} personne(s) ont mis cet événement en favori`}
                  >
                    {event.favoriteCount}
                  </span>
              }
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleFavorite}
                aria-label={
                  favorite ?
                    'Retirer des favoris' :
                    'Ajouter aux favoris'
                }
                aria-pressed={favorite}
              >
                <Star
                  className={
                    cn(
                      'h-5 w-5',
                      favorite
                        ? 'fill-amber-400 text-amber-400 dark:fill-amber-300 dark:text-amber-300'
                        : 'text-muted-foreground',
                    )
                  }
                />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={
                  (): void => {
                    if(collapsiblePresent) {
                      setOpen((previous) => !previous);
                    }
                  }
                }
                aria-label={
                  open ?
                    'Replier' :
                    'Déplier'
                }
              >
                <ChevronDown
                  className={
                    cn(
                      'h-5 w-5 transition-transform',
                      open ? 'rotate-180' : 'rotate-0',
                    )
                  }
                />
              </Button>
            </div>
            <div className="flex gap-2 shrink-0">
              <EventTime
                startTime={event.startTime}
                endTime={event.endTime}
                feteDeLaMusiqueDay={feteDeLaMusiqueDay}
              />
            </div>
          </div>
        </div>
        {
          collapsiblePresent &&
            <CollapsibleContent>
              <EventRender event={event} />
            </CollapsibleContent>
        }
      </Collapsible>
    </li>
  );
};

/* Export EventListItem component ---------------------- */
export default EventListItem;
