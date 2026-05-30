/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import DashboardSummary from './DashboardSummary';

/* AdminPage component --------------------------------- */
const AdminPage = (): React.ReactElement => {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Tableau de bord</h1>
      <DashboardSummary />
    </div>
  );
};

/* Export AdminPage component -------------------------- */
export default AdminPage;
