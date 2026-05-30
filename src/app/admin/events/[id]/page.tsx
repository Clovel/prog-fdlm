/* Framework imports ----------------------------------- */
import React from 'react';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';

/* Component imports ----------------------------------- */
import EventEditLoader from '../EventEditLoader';

/* Module imports (project) ---------------------------- */
import { requireRole } from 'auth/helpers';
import { db } from 'db';
import { events, editions } from 'db/schema';

/* EditEventPage component ----------------------------- */
const EditEventPage = async (
  { params }: { params: Promise<{ id: string }> },
): Promise<React.ReactElement> => {
  await requireRole('admin', 'editor');
  const { id } = await params;
  const rows = await db
    .select({ year: editions.year })
    .from(events)
    .innerJoin(editions, eq(events.editionId, editions.id))
    .where(eq(events.id, id))
    .limit(1);
  const row = rows[0];
  if(row === undefined) {
    notFound();
  }
  return <EventEditLoader eventId={id} editionYear={row.year} />;
};

/* Export EditEventPage component ---------------------- */
export default EditEventPage;
