'use client';

/* Framework imports ----------------------------------- */
import React, {
  useMemo,
  useState,
} from 'react';

/* Module imports -------------------------------------- */

/* Component imports ----------------------------------- */
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from 'components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from 'components/ui/collapsible';
import EventTime from './EventTime';
import EventTitleBlock from 'components/EventTitleBlock/EventTitleBlock';
import EventRender from 'components/EventRender/EventRender';

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';

/* EventListItem component prop types ------------------ */
interface EventListItemProps {
  event: Event;
  feteDeLaMusiqueDay: Date;
}

/* EventListItem component ----------------------------- */
const EventListItem: React.FC<EventListItemProps> = (
  {
    event,
    feteDeLaMusiqueDay,
  },
) => {
  const [ open, setOpen ] = useState<boolean>(false);

  const collapsiblePresent: boolean = useMemo<boolean>(
    () => {
      return (
        event.description !== undefined ||
        (event.alerts !== undefined && event.alerts.length > 0) ||
        (event.embedLinks !== undefined && event.embedLinks.length > 0) ||
        (event.links !== undefined && event.links.length > 0)
      );
    },
    [
      event.description,
      event.alerts,
      event.embedLinks,
      event.links,
    ],
  );

  return (
    <li className="py-2">
      <Collapsible
        open={open}
        onOpenChange={setOpen}
        disabled={!collapsiblePresent}
      >
        <CollapsibleTrigger asChild disabled={!collapsiblePresent}>
          <div className="flex items-center justify-between gap-2 px-4 cursor-pointer rounded-md hover:bg-accent">
            <div className="flex-1 min-w-0 -mx-2 px-2 py-1">
            <EventTitleBlock event={event} />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <EventTime
                startTime={event.startTime}
                endTime={event.endTime}
                feteDeLaMusiqueDay={feteDeLaMusiqueDay}
              />
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
            </div>
          </div>
        </CollapsibleTrigger>
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
