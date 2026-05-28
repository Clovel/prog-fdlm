'use client';

/* Framework imports ----------------------------------- */
import React, {
  useMemo,
  useState,
} from 'react';

/* Module imports -------------------------------------- */
import { formatPrice } from 'helpers/formatPrice';

/* Component imports ----------------------------------- */
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import EventTime from './EventTime';
import EventListItemDetails from './EventListItemDetails';

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';

/* EventListItem component prop types ------------------ */
interface EventListItemProps {
  event: Event;
}

/* EventListItem component ----------------------------- */
const EventListItem: React.FC<EventListItemProps> = (
  {
    event,
  },
) => {
  const [ open, setOpen ] = useState<boolean>(false);

  const collapsiblePresent: boolean = useMemo<boolean>(
    () => {
      return event.description !== undefined;
    },
    [
      event.description,
    ]
  );

  const titleBlock = (
    <>
      <div className="text-lg font-medium">
        <span className="font-bold">
          {event.name ?? event.location.name}
        </span>
        {
          event.status !== undefined &&
            ' - '
        }
        {
          event.status === 'rescheduled' &&
            <span className="text-orange-600 dark:text-orange-400">
              Reprogrammé
            </span>
        }
        {
          event.status === 'canceled' &&
            <span className="text-red-600 dark:text-red-400">
              Annulé
            </span>
        }
        {
          event.status === 'postponed' &&
            <span className="text-purple-600 dark:text-purple-400">
              Reporté
            </span>
        }
      </div>
      <div className="text-sm">
        <span className="font-semibold">
          {
            event.name !== undefined &&
                event.location.name
          }
        </span>
        <span>
          {
            event.name !== undefined &&
              event.location.addressStr !== undefined &&
                ', '
          }
          {
            event.location.addressStr !== undefined &&
              event.location.addressStr
          }
        </span>
        {
          event.genres !== undefined &&
          event.genres.length > 0 &&
            <p>
              - Genres :
              {' '}
              {event.genres.join(', ')}
            </p>
        }
        {
          event.artists !== undefined &&
          event.artists.length > 0 &&
            <p>
              - Artistes :
              {' '}
              {event.artists.join(', ')}
            </p>
        }
        {
          event.price !== undefined &&
            <p>
              - Prix :
              {' '}
              {formatPrice(event.price)}
            </p>
        }
      </div>
    </>
  );

  return (
    <li className="py-2">
      <Collapsible
        open={open}
        onOpenChange={setOpen}
      >
        <div className="flex items-start justify-between gap-2 px-4">
          {
            collapsiblePresent ?
              <CollapsibleTrigger asChild>
                <div className="flex-1 min-w-0 cursor-pointer rounded-md hover:bg-accent -mx-2 px-2 py-1">
                  {titleBlock}
                </div>
              </CollapsibleTrigger> :
              <div className="flex-1 min-w-0">
                {titleBlock}
              </div>
          }
          <div className="flex items-center gap-2 shrink-0">
            <EventTime
              startTime={event.startTime}
              endTime={event.endTime}
            />
            {
              collapsiblePresent &&
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={open ? 'Replier' : 'Déplier'}
                  >
                    {
                      open ?
                        <ChevronUp className="h-5 w-5" /> :
                        <ChevronDown className="h-5 w-5" />
                    }
                  </Button>
                </CollapsibleTrigger>
            }
          </div>
        </div>
        {
          collapsiblePresent &&
            <CollapsibleContent>
              <EventListItemDetails event={event} />
            </CollapsibleContent>
        }
      </Collapsible>
    </li>
  );
};

/* Export EventListItem component ---------------------- */
export default EventListItem;
