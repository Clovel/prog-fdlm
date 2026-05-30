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
  };
  hasDescription: boolean;
  linkCount: number;
  embedCount: number;
  alertCount: number;
}

export type EventStatus = 'canceled' | 'postponed' | 'rescheduled';

export interface EventDetailDto {
  id: string;
  editionId: string;
  description: string | null;
  links: Array<{ url: string; label: string }>;
  embedLinks: Array<{ platform: 'instagram' | 'facebook'; url: string }>;
  alerts: Array<{ variant: AlertVariant; title: string | null; content: string }>;
}
