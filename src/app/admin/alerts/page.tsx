/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import AlertsManager from './AlertsManager';

/* Module imports (project) ---------------------------- */
import { requireSession } from 'auth/helpers';

/* AlertsPage component -------------------------------- */
const AlertsPage = async (): Promise<React.ReactElement> => {
  const session = await requireSession();
  const role: string = (session.user as { role?: string }).role ?? 'viewer';
  const canManage: boolean = role === 'admin';
  return <AlertsManager canManage={canManage} />;
};

/* Export AlertsPage component ------------------------- */
export default AlertsPage;
