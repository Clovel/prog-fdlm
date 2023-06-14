'use client';

/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports -------------------------------------- */

/* Component imports ----------------------------------- */
import List from '@mui/material/List';
import EventListItem from './EventListItem';

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';

/* EventList component prop types ---------------------- */
interface EventListProps {
  events: Event[];
}

/* EventList component --------------------------------- */
const EventList: React.FC<EventListProps> = ({ events = []}) => {
  return (
    <List className="min-w-full">
      {
        events.map(
          (event, index, array) => {
            return (
              <EventListItem
                key={`${event.name}-${index}`}
                event={event}
                divider={index < array.length - 1}
              />
            );
          }
        )
      }
    </List>
  );
};

/* Export EventList component -------------------------- */
export default EventList;
