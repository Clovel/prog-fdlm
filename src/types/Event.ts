/* Type imports ---------------------------------------- */
import type React from 'react';
import type { Location } from './Location';
import type { EventCategory } from 'types/eventCategories';
import type{ Alert } from 'components/ui/alert';

/* Event interface declaration ------------------------- */
export interface EventLink {
  url: string;
  label: React.ReactNode;
}

export interface EventAlert {
  type: React.ComponentProps<typeof Alert>['variant'];
  title?: string;
  content: string;
}

export type EventEmbedLinkType = 'instagram' | 'facebook';

export interface EventEmbedLink {
  type: EventEmbedLinkType;
  url: string;
}

/**
 * Platform names supported by the social embed script loader. Exact same
 * shape as `EventEmbedLinkType` (both `'instagram' | 'facebook'`); kept as
 * a separate name for readability at hook call sites.
 */
export type SocialEmbedPlatform = EventEmbedLinkType;

export interface Event {
  id: string;
  name?: string;
  status?: 'canceled' | 'postponed' | 'rescheduled';
  alerts?: EventAlert[];
  description?: string;
  category?: EventCategory;
  genres?: string[];
  links?: EventLink[];
  embedLinks?: EventEmbedLink[];
  location: Location;
  startTime: Date;
  endTime?: Date; /* Might be unknown, might be an all-nighter */
  price?: number | string; /* Might be free */
  artists?: string[];
  /** Summary metadata — set when the event came from an API list payload. */
  hasDescription?: boolean;
  linkCount?: number;
  embedCount?: number;
  alertCount?: number;
}

export type EventsByCategoriesKey = Exclude<Event['category'], undefined> | 'Autres';

export type EventsByCategories = {
  [category in EventsByCategoriesKey]: Event[];
};
