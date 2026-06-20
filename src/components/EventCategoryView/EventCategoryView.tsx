/* Framework imports ----------------------------------- */
import React, { useState } from 'react';

/* Module imports -------------------------------------- */
import { cn } from 'lib/utils';
import { eventCategorySettingsByCategory } from 'types/eventCategories';

/* Component imports ----------------------------------- */
import { ChevronDown } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from 'components/ui/collapsible';
import EventList from '../EventList/EventList';

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';

/* EventCategoryView component prop types -------------- */
interface EventCategoryViewProps {
  categoryTitleString: string;
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
      if(categoryTitleString in eventCategorySettingsByCategory) {
        return eventCategorySettingsByCategory[categoryTitleString as keyof typeof eventCategorySettingsByCategory].openByDefault;
      }
      return true;
    },
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
          <EventList
            isFavoritesSection={categoryTitleString === 'Favoris'}
            events={categoryEvents}
            feteDeLaMusiqueDay={feteDeLaMusiqueDay}
          />
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
};

/* Export EventCategoryView component ------------------ */
export default EventCategoryView;
