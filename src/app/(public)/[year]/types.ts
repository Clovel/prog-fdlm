/* Type imports ---------------------------------------- */
import type { EventCategory } from 'types/eventCategories';

/* View-layer types ------------------------------------ */
export type AlertVariant = 'default' | 'destructive' | 'warning' | 'success';
export type EventStatus = 'canceled' | 'postponed' | 'rescheduled';

export interface EditionView {
  id: string;
  year: number;
  description: string | null;
  dayOfFestival: string;
}

export interface GeneralAlertView {
  id: string;
  variant: AlertVariant;
  title: string | null;
  content: string;
  position: number;
}

export interface EventSummaryView {
  id: string;
  editionId: string;
  name: string | null;
  category: EventCategory | null;
  status: EventStatus | null;
  genres: string[] | null;
  artists: string[] | null;
  startTime: string;
  endTime: string | null;
  priceText: string | null;
  location: { name: string; address: string | null; coords: { lat: number; lng: number } | null };
  hasDescription: boolean;
  linkCount: number;
  embedCount: number;
  alertCount: number;
}

export interface EventDetailView {
  id: string;
  description: string | null;
  links: Array<{ url: string; label: string }>;
  embedLinks: Array<{ platform: 'instagram' | 'facebook'; url: string }>;
  alerts: Array<{ variant: AlertVariant; title: string | null; content: string }>;
}

// Consolidated public event: summary fields + inlined detail, served by
// `/api/editions/[year]/events/full` and consumed by the edition page.
export interface EventWithDetailView {
  id: string;
  editionId: string;
  name: string | null;
  category: EventCategory | null;
  status: EventStatus | null;
  genres: string[] | null;
  artists: string[] | null;
  startTime: string;
  endTime: string | null;
  priceText: string | null;
  location: { name: string; address: string | null; coords: { lat: number; lng: number } | null };
  description: string | null;
  links: Array<{ url: string; label: string }>;
  embedLinks: Array<{ platform: 'instagram' | 'facebook'; url: string }>;
  alerts: Array<{ variant: AlertVariant; title: string | null; content: string }>;
}

export interface EmbedLinkView {
  id: string;
  platform: 'instagram' | 'facebook';
  url: string;
}
