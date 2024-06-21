/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports -------------------------------------- */

/* Component imports ----------------------------------- */
import { Typography } from '@mui/material';
import EventList from '../EventList/EventList';

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';

/* EventCategoryView component prop types -------------- */
interface EventCategoryViewProps {
  categoryTitle: React.ReactNode;
  categoryEvents: Event[];
}

/* EventCategoryView component ------------------------- */
const EventCategoryView: React.FC<EventCategoryViewProps> = (
  {
    categoryTitle,
    categoryEvents,
  },
) => {
  return (
    <section className="flex flex-col w-full max-w-screen lg:max-w-5xl px-2 lg:py-8 mx-auto lg:px-0">
      <div className="flex justify-between items-center">
        <Typography
          variant="h4"
          className="py-4"
        >
          {categoryTitle}
        </Typography>
        <span>
          {categoryEvents.length}
          {' '}
          event
          {categoryEvents.length !== 1 ? 's' : ''}
        </span>
      </div>
      <EventList events={categoryEvents} />
    </section>
  );
};

/* Export EventCategoryView component ------------------ */
export default EventCategoryView;
