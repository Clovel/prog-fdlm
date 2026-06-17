/* Framework imports ----------------------------------- */
import React, { useState } from 'react';

/* Module imports -------------------------------------- */
import { eventCategorySettingsByCategory } from 'types/eventCategories';

/* Component imports ----------------------------------- */
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from 'components/ui/collapsible';
import EventList from '../EventList/EventList';
import { Button } from 'components/ui/button';

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';
import type { EventCategory } from 'types/eventCategories';

/* EventCategoryView component prop types -------------- */
interface EventCategoryViewProps {
  categoryTitleString: EventCategory;
  categoryTitle?: React.ReactNode;
  categoryEvents: Event[];
  feteDeLaMusiqueDay: Date;
}

/* EventCategoryView component ------------------------- */
const EventCategoryView: React.FC<EventCategoryViewProps> = (
  {
    categoryTitleString,
    categoryTitle = categoryTitleString,
    categoryEvents,
    feteDeLaMusiqueDay,
  },
) => {
  const [ open, setOpen ] = useState<boolean>(
    () => {
      try {
        return eventCategorySettingsByCategory[categoryTitleString].openByDefault;
      } catch(error) {
        console.error(`[EventCategoryView] Error getting open state for category ${categoryTitleString} : ${error}`);
        return true;
      }
    }
  );

  return (
    <section className="flex flex-col w-full max-w-screen lg:max-w-5xl px-2 mx-auto lg:px-0">
      <Collapsible
        open={open}
        onOpenChange={setOpen}
      >
        <CollapsibleTrigger className="w-full">
          <div className=" w-full flex justify-between items-center">
            <h4 className="text-2xl font-semibold tracking-tight py-4">
              {categoryTitle}
            </h4>
            <div className="flex items-center gap-2">
              <span>
                {categoryEvents.length}
                {' '}
                event
                {categoryEvents.length !== 1 ? 's' : ''}
              </span>
              <Button variant="ghost" size="icon">
                {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <EventList events={categoryEvents} feteDeLaMusiqueDay={feteDeLaMusiqueDay} />
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
};

/* Export EventCategoryView component ------------------ */
export default EventCategoryView;
