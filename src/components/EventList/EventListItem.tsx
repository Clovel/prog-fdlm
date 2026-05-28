'use client';

/* Framework imports ----------------------------------- */
import React, {
  useMemo,
  useState,
} from 'react';

/* Module imports -------------------------------------- */

/* Component imports ----------------------------------- */
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import EventTime from './EventTime';
import EventTitleBlock from 'components/EventTitleBlock/EventTitleBlock';
import EventRender from 'components/EventRender/EventRender';

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';

/* EventListItem component prop types ------------------ */
interface EventListItemProps {
  event: Event;
}

/* EventListItem component ----------------------------- */
const EventListItem: React.FC<EventListItemProps> = ({ event }) => {
  const [ open, setOpen ] = useState<boolean>(false);

  const collapsiblePresent: boolean = useMemo<boolean>(
    () => {
      return (
        event.description !== undefined ||
        (event.embedLinks !== undefined && event.embedLinks.length > 0) ||
        (event.links !== undefined && event.links.length > 0)
      );
    },
    [
      event.description,
      event.embedLinks,
      event.links,
    ],
  );

  const titleBlock = <EventTitleBlock event={event} />;

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
              <EventRender event={event} />
            </CollapsibleContent>
        }
      </Collapsible>
    </li>
  );
};

/* Export EventListItem component ---------------------- */
export default EventListItem;
