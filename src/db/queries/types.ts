/* Type imports ---------------------------------------- */
import type { EventCategory } from 'types/eventCategories';

/* Shared DTO types ------------------------------------ */
export interface EditionDto {
  id: string;
  year: number;
  description: string | null;
}

export interface EditionWithMetaDto extends EditionDto {
  dayOfFestival: string; // ISO date 'YYYY-MM-DD'
}

export interface GeneralAlertDto {
  id: string;
  variant: AlertVariant;
  title: string | null;
  content: string;
  position: number;
}

export type AlertVariant = 'default' | 'destructive' | 'warning' | 'success';

export interface EventSummaryDto {
  id: string;
  editionId: string;
  name: string | null;
  category: EventCategory | null;
  status: EventStatus | null;
  genres: string[] | null;
  artists: string[] | null;
  startTime: string;     // ISO
  endTime: string | null;
  priceText: string | null;
  location: {
    name: string;
    address: string | null;
    coords: { lat: number; lng: number } | null;
  };
  hasDescription: boolean;
  linkCount: number;
  embedCount: number;
  alertCount: number;
  favoriteCount: number;
}

export type EventStatus = 'canceled' | 'postponed' | 'rescheduled';

export interface EmbedLinkDto {
  id: string;
  platform: 'instagram' | 'facebook';
  url: string;
}

export interface EventDetailDto {
  id: string;
  editionId: string;
  description: string | null;
  links: Array<{ url: string; label: string }>;
  embedLinks: Array<{ platform: 'instagram' | 'facebook'; url: string }>;
  alerts: Array<{ variant: AlertVariant; title: string | null; content: string }>;
}

// A full event for the public per-edition page: summary fields + the detail
// (description, links, embeds, alerts) inlined, so the page renders everything
// from one request with no per-event detail fetch. Used by the consolidated
// `/api/editions/[year]/events/full` endpoint; the summary `EventSummaryDto`
// + cursor route stay as the documented, paginated public API.
export interface EventWithDetailDto {
  id: string;
  editionId: string;
  name: string | null;
  category: EventCategory | null;
  status: EventStatus | null;
  genres: string[] | null;
  artists: string[] | null;
  startTime: string;     // ISO
  endTime: string | null;
  priceText: string | null;
  location: {
    name: string;
    address: string | null;
    coords: { lat: number; lng: number } | null;
  };
  description: string | null;
  links: Array<{ url: string; label: string }>;
  embedLinks: Array<{ platform: 'instagram' | 'facebook'; url: string }>;
  alerts: Array<{ variant: AlertVariant; title: string | null; content: string }>;
  favoriteCount: number;
}
