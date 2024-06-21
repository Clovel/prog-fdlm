/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports -------------------------------------- */

/* Component imports ----------------------------------- */

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';

/* EventsRecap component prop types -------------------- */
interface EventsRecapProps {
  events: Event[];
}

/* EventsRecap component ------------------------------- */
const EventsRecap: React.FC<EventsRecapProps> = ({
  events = [],
}) => {
  return (
    <div className="flex flex-col place-items-center min-w-full py-4 lg:py-0">
      <p>
        {events.length}
        {' '}
        événement
        {events.length !== 1 ? 's' : ''}
        {' '}
        cette année.
      </p>
    </div>
  );
};

/* Export EventsRecap component ------------------------ */
export default EventsRecap;
