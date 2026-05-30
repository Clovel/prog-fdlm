/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import UsersManager from './UsersManager';

/* Module imports (project) ---------------------------- */
import { requireRole } from 'auth/helpers';

/* UsersPage component --------------------------------- */
const UsersPage = async (): Promise<React.ReactElement> => {
  await requireRole('admin');
  return <UsersManager />;
};

/* Export UsersPage component -------------------------- */
export default UsersPage;
