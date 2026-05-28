/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import EventList from '../EventList/EventList';

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';

/* EventCategoryView component prop types -------------- */
interface EventCategoryViewProps {
  categoryTitle: React.ReactNode;
  categoryEvents: Event[];
  feteDeLaMusiqueDay: Date;
}

/* EventCategoryView component ------------------------- */
const EventCategoryView: React.FC<EventCategoryViewProps> = (
  {
    categoryTitle,
    categoryEvents,
    feteDeLaMusiqueDay,
  },
) => {
  return (
    <section className="flex flex-col w-full max-w-screen lg:max-w-5xl px-2 lg:py-8 mx-auto lg:px-0">
      <div className="flex justify-between items-center">
        <h4 className="text-2xl font-semibold tracking-tight py-4">
          {categoryTitle}
        </h4>
        <span>
          {categoryEvents.length}
          {' '}
          event
          {categoryEvents.length !== 1 ? 's' : ''}
        </span>
      </div>
      <EventList events={categoryEvents} feteDeLaMusiqueDay={feteDeLaMusiqueDay} />
    </section>
  );
};

/* Export EventCategoryView component ------------------ */
export default EventCategoryView;
