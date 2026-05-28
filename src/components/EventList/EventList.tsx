'use client';

/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import EventListItem from './EventListItem';

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';

/* EventList component prop types ---------------------- */
interface EventListProps {
  events: Event[];
  feteDeLaMusiqueDay: Date;
}

/* EventList component --------------------------------- */
const EventList: React.FC<EventListProps> = (
  {
    events = [],
    feteDeLaMusiqueDay,
  },
) => {
  return (
    <ul className="min-w-full divide-y divide-border">
      {
        events.map(
          (event, index) => (
            <EventListItem
              key={`${event.name ?? event.location.name}-${index}`}
              event={event}
              feteDeLaMusiqueDay={feteDeLaMusiqueDay}
            />
          )
        )
      }
    </ul>
  );
};

/* Export EventList component -------------------------- */
export default EventList;
