/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import EditionsManager from './EditionsManager';

/* Module imports (project) ---------------------------- */
import { requireSession } from 'auth/helpers';

/* EditionsPage component ------------------------------ */
const EditionsPage = async (): Promise<React.ReactElement> => {
  const session = await requireSession();
  const role: string = (session.user as { role?: string }).role ?? 'viewer';
  const canManage: boolean = role === 'admin';

  return <EditionsManager canManage={canManage} />;
};

/* Export EditionsPage component ----------------------- */
export default EditionsPage;
