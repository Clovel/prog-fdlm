/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports -------------------------------------- */
import { formatPrice } from 'helpers/formatPrice';

/* Component imports ----------------------------------- */
import { Badge } from 'components/ui/badge';

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';

/* EventTitleBlock component prop types ---------------- */
interface EventTitleBlockProps {
  event: Event;
}

/* EventTitleBlock component --------------------------- */
const EventTitleBlock: React.FC<EventTitleBlockProps> = ({ event }) => {
  return (
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
        {
          event.forKids === true &&
            <Badge variant="secondary" className="ml-2 align-middle">
              Jeune public
            </Badge>
        }
      </div>
      <div className="text-sm">
        <span className="font-semibold">
          {
            event.name !== undefined &&
                event.location.name
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
};

/* Export EventTitleBlock component -------------------- */
export default EventTitleBlock;
