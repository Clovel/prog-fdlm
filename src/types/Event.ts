/* Type imports ---------------------------------------- */
import type { Location } from './Location';

/* Event interface declaration ------------------------- */
export interface Event {
  id: string;
  name: string;
  location: Location;
  startTime: Date;
  endTime?: Date; /* Might be unknown, might be an all-nighter */
  price?: number; /* Might be free */
}
