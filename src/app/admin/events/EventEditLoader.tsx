'use client';

/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import EventForm from './EventForm';

/* Module imports (project) ---------------------------- */
import { useEventQuery } from 'hooks/admin/useAdminEvents';
import { toParisInput } from 'lib/festivalTime';

/* Type imports ---------------------------------------- */
import type { EventFormValues } from 'validation/event';
import type { AdminEventDetail } from 'db/queries/admin/getEventForEdit';

/* EventEditLoader component prop types ---------------- */
interface EventEditLoaderProps {
  eventId: string;
  editionYear: number;
}

/* Helpers --------------------------------------------- */
const toFormValues = (d: AdminEventDetail): EventFormValues => ({
  name: d.name ?? '',
  description: d.description ?? '',
  category: d.category ?? undefined,
  status: (d.status ?? undefined) as EventFormValues['status'],
  genres: d.genres,
  artists: d.artists,
  priceText: d.priceText ?? '',
  locationName: d.locationName,
  locationAddress: d.locationAddress ?? '',
  startTime: toParisInput(new Date(d.startTime)),
  endTime: d.endTime === null ? '' : toParisInput(new Date(d.endTime)),
  links: d.links,
  embedLinks: d.embedLinks.map((e) => ({ platform: e.platform, url: e.url })),
  alerts: d.alerts.map((a) => ({ variant: a.variant, title: a.title ?? '', content: a.content })),
});

/* EventEditLoader component --------------------------- */
const EventEditLoader: React.FC<EventEditLoaderProps> = ({ eventId, editionYear }) => {
  const query = useEventQuery(eventId);

  if(query.isLoading) {
    return <p className="text-muted-foreground">Chargement…</p>;
  }
  if(query.isError || query.data === undefined) {
    return <p className="text-destructive">Impossible de charger l&apos;événement.</p>;
  }

  const detail = query.data;
  return (
    <EventForm
      editionId={detail.editionId}
      editionYear={editionYear}
      eventId={detail.id}
      initialValues={toFormValues(detail)}
    />
  );
};

/* Export EventEditLoader component -------------------- */
export default EventEditLoader;
