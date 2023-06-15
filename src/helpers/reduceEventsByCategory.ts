/* Framework imports ----------------------------------- */

/* Module imports -------------------------------------- */

/* Type imports ---------------------------------------- */
import type {
  Event,
  EventsByCategories,
} from 'types/Event';

/* reduceEventsByCategory helper function -------------- */
export const reduceEventsByCategory = (events: Event[] = []): Partial<EventsByCategories> => {
  return events.reduce<Partial<EventsByCategories>>(
    (acc, event) => {
      const category: keyof EventsByCategories = event.category ?? 'Autres';

      return {
        ...acc,
        [category]: [
          ...(acc[category] ?? []
          ),
          event,
        ],
      };
    },
    {},
  );
};
