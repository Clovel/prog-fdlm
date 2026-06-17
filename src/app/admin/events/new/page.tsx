/* Framework imports ----------------------------------- */
import React from 'react';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';

/* Component imports ----------------------------------- */
import EventForm from '../EventForm';

/* Module imports (project) ---------------------------- */
import { requireRole } from 'auth/helpers';
import { db } from 'db';
import { editions } from 'db/schema';

/* Type imports ---------------------------------------- */
import type { EventFormValues } from 'validation/event';

/* Blank form values ----------------------------------- */
const blankValues = (): EventFormValues => ({
  name: '',
  description: '',
  category: undefined,
  status: undefined,
  genres: [],
  artists: [],
  priceText: '',
  locationName: '',
  locationAddress: '',
  latitude: undefined,
  longitude: undefined,
  forKids: false,
  startTime: '',
  endTime: '',
  links: [],
  embedLinks: [],
  alerts: [],
});

/* NewEventPage component ------------------------------ */
const NewEventPage = async (
  { searchParams }: { searchParams: Promise<{ edition?: string }> },
): Promise<React.ReactElement> => {
  await requireRole('admin', 'editor');
  const { edition: editionId } = await searchParams;
  if(editionId === undefined) {
    notFound();
  }
  const rows = await db.select({ id: editions.id, year: editions.year }).from(editions).where(eq(editions.id, editionId)).limit(1);
  const ed = rows[0];
  if(ed === undefined) {
    notFound();
  }
  return <EventForm editionId={ed.id} editionYear={ed.year} initialValues={blankValues()} />;
};

/* Export NewEventPage component ----------------------- */
export default NewEventPage;
