/* Type imports ---------------------------------------- */
import type React from 'react';
import type { Location } from './Location';

/* Event interface declaration ------------------------- */
export interface Event {
  id: string;
  name?: string;
  description?: React.ReactNode;
  category?: string;
  genres?: string[];
  links?: string[];
  location: Location;
  startTime: Date;
  endTime?: Date; /* Might be unknown, might be an all-nighter */
  price?: number | string; /* Might be free */
  artists?: string[];
}

export interface EventsByCategories {
  [category: string]: Event[];
}
