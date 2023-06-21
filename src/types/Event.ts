/* Type imports ---------------------------------------- */
import type React from 'react';
import type { Location } from './Location';
import type { eventCategories } from 'fixtures/eventCategories';

/* Event interface declaration ------------------------- */
export interface EventLink {
  url: string;
  label: string;
}

export interface Event {
  id: string;
  name?: string;
  status?: 'canceled' | 'postponed' | 'rescheduled';
  description?: React.ReactNode;
  category?: typeof eventCategories[number];
  genres?: string[];
  links?: EventLink[];
  location: Location;
  startTime: Date;
  endTime?: Date; /* Might be unknown, might be an all-nighter */
  price?: number | string; /* Might be free */
  artists?: string[];
}

export type EventsByCategoriesKey = Exclude<Event['category'], undefined> | 'Autres';

export type EventsByCategories = {
  [category in EventsByCategoriesKey]: Event[];
};
