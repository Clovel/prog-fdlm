/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports -------------------------------------- */
import { dispatchFocusMap } from 'helpers/mapFocus';

/* Component imports ----------------------------------- */
import { MapPinned } from 'lucide-react';
import { Button } from 'components/ui/button';
import CustomEmbed from 'components/CustomEmbed/CustomEmbed';
import DescriptionRender from 'components/DescriptionRender/DescriptionRender';
import EventAlert from 'components/EventAlert/EventAlert';
import MapsLink from 'components/MapsLink/MapsLink';

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';

/* EventRender component prop types -------------------- */
interface EventRenderProps {
  event: Event;
}

/* EventRender component ------------------------------- */
const EventRender: React.FC<EventRenderProps> = (
  {
    event,
  },
) => {
  return (
    <div className="event-description flex flex-col w-full px-4 py-2">
      {
        event.alerts !== undefined &&
        event.alerts.length > 0 &&
          <article className="w-full">
            {
              event.alerts.map(
                (alert, index) => (
                  <EventAlert
                    key={`${alert.type ?? 'default'}-${index}`}
                    alert={alert}
                  />
                ),
              )
            }
          </article>
      }
      {
        event.description !== undefined &&
          <article className="w-full">
            <h6 className="text-base font-semibold text-muted-foreground">
              Description de l'événement :
            </h6>
            <br />
            <div className="text-sm text-muted-foreground">
              <DescriptionRender markdown={event.description} />
            </div>
          </article>
      }
      {
        event.embedLinks !== undefined &&
        event.embedLinks.length > 0 &&
          <article className="flex flex-col w-full mt-4">
            {
              event.embedLinks.map(
                (link, index) => (
                  <CustomEmbed
                    key={`${link.url}-${index}`}
                    url={link.url}
                    type={link.type}
                  />
                ),
              )
            }
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
                        className="inline-block text-blue-600 dark:text-blue-400 underline underline-offset-4"
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
      {
        (
          (event.location.addressStr !== undefined && event.location.addressStr.length > 0) ||
          event.location.coords !== undefined
        ) &&
          <div className="w-full mt-4 flex items-center gap-2">
            {
              event.location.addressStr !== undefined &&
              event.location.addressStr.length > 0 &&
                <MapsLink location={event.location} variant="button" />
            }
            {
              event.location.coords !== undefined &&
                <Button
                  variant="outline"
                  size="sm"
                  className="grow shrink-0"
                  onClick={(): void => dispatchFocusMap(event.id)}
                >
                  <MapPinned className="h-4 w-4" />
                  Voir sur la carte
                </Button>
            }
          </div>
      }
    </div>
  );
};

/* Export EventRender component ------------------------ */
export default EventRender;
