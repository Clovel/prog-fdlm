/* Type imports ---------------------------------------- */
import type { EventWithDetailView } from 'app/(public)/[year]/types';

/* Builder --------------------------------------------- */
// Schema.org Event[] nodes for the edition. Pure and serializable so it can run
// in the Server Component and be emitted into the initial HTML for SEO.
const EVENT_STATUS_MAP: Record<string, string> = {
  canceled: 'https://schema.org/EventCancelled',
  postponed: 'https://schema.org/EventPostponed',
  rescheduled: 'https://schema.org/EventRescheduled',
};

export const buildEventJsonLd = (
  events: EventWithDetailView[],
): Array<Record<string, unknown>> =>
  events
    .filter((event): boolean => event.name !== null && event.name.length > 0)
    .map(
      (event): Record<string, unknown> => {
        const place: Record<string, unknown> = {
          '@type': 'Place',
          name: event.location.name,
        };
        if(event.location.address !== null && event.location.address.length > 0) {
          place.address = event.location.address;
        }
        const node: Record<string, unknown> = {
          '@context': 'https://schema.org',
          '@type': 'Event',
          name: event.name,
          startDate: new Date(event.startTime).toISOString(),
          eventStatus: event.status !== null
            ? EVENT_STATUS_MAP[event.status] ?? 'https://schema.org/EventScheduled'
            : 'https://schema.org/EventScheduled',
          location: place,
        };
        if(event.endTime !== null) {
          node.endDate = new Date(event.endTime).toISOString();
        }
        return node;
      },
    );
