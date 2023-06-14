/* Framework imports ----------------------------------- */

/* Module imports -------------------------------------- */

/* Type imports ---------------------------------------- */
import type {
  Event,
  EventsByCategories,
} from 'types/Event';

/* reduceEventsByCategory helper function -------------- */
export const reduceEventsByCategory = (events: Event[] = []): EventsByCategories => {
  return events.reduce<EventsByCategories>(
    (acc, event) => {
      const category = event.category ?? 'Autres';

      return {
        ...acc,
        [category]: [
          ...(acc[category] ?? []
          ),
          event,
        ],
      };
    },
    {}
  );
};
