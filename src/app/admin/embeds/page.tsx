/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import EmbedsManager from './EmbedsManager';

/* Module imports (project) ---------------------------- */
import { requireRole } from 'auth/helpers';

/* EmbedsPage component -------------------------------- */
const EmbedsPage = async (): Promise<React.ReactElement> => {
  await requireRole('admin');
  return <EmbedsManager />;
};

/* Export EmbedsPage component ------------------------- */
export default EmbedsPage;
