/* Module imports -------------------------------------- */
import { eventCategories } from 'fixtures/eventCategories';

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';

/** This function is to be used to `sort` event categories */
export const sortCategories = (
  eventCategory1: string,
  eventCategory2: string,
): number => {
  if(eventCategory1 === 'Autres') {
    return 1;
  }
  if(eventCategory2 === 'Autres') {
    return -1;
  }
  const eventCategory1Index = eventCategories.indexOf(eventCategory1 as typeof eventCategories[number]);
  const eventCategory2Index = eventCategories.indexOf(eventCategory2 as typeof eventCategories[number]);
  return eventCategory1Index - eventCategory2Index;
};

export const sortEventsByCategory = (
  event1: Event,
  event2: Event,
): number => {
  const event1Category: string | undefined = event1.category;
  const event2Category: string | undefined = event2.category;

  if(
    event1Category === undefined ||
    event2Category === undefined
  ) {
    return 0;
  }

  return sortCategories(event1Category, event2Category);
};

export const sortEventsByCategoryEntries = (
  eventCategory1: [string, Event[]],
  eventCategory2: [string, Event[]],
): number => {
  const eventCategory1Name = eventCategory1[0];
  const eventCategory2Name = eventCategory2[0];
  return sortCategories(eventCategory1Name, eventCategory2Name);
};
