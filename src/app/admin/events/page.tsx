/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import EventsManager from './EventsManager';

/* Module imports (project) ---------------------------- */
import { requireSession } from 'auth/helpers';

/* EventsPage component -------------------------------- */
const EventsPage = async (): Promise<React.ReactElement> => {
  const session = await requireSession();
  const role: string = (session.user as { role?: string }).role ?? 'viewer';
  const canManage: boolean = role === 'admin' || role === 'editor';
  return <EventsManager canManage={canManage} />;
};

/* Export EventsPage component ------------------------- */
export default EventsPage;
