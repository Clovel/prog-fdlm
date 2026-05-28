/* Framework imports ----------------------------------- */
import React from 'react';

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';

/* EventListItemDetails component prop types ----------- */
interface EventListItemDetailsProps {
  event: Event;
}

/* EventListItemDetails component ---------------------- */
const EventListItemDetails: React.FC<EventListItemDetailsProps> = (
  {
    event,
  }
) => {
  return (
    <div className="event-description flex flex-col w-full px-4 py-2">
      {
        event.description !== undefined &&
          <article className="w-full">
            <h6 className="text-base font-semibold text-muted-foreground">
              Description de l'événement :
            </h6>
            <br />
            <div className="text-sm text-muted-foreground">
              {event.description}
            </div>
          </article>
      }
      {
        event.links !== undefined &&
        event.links.length > 0 &&
          <article className="flex flex-col w-full mt-4">
            <h6 className="text-base font-semibold text-muted-foreground">
              Liens :
            </h6>
            <ul>
              {
                event.links.map(
                  (link, index) => (
                    <li key={`${link.url}-${index}`}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block underline-offset-4 hover:underline"
                      >
                        {link.label}
                      </a>
                    </li>
                  ),
                )
              }
            </ul>
          </article>
      }
    </div>
  );
};

/* Export EventListItemDetails component --------------- */
export default EventListItemDetails;
