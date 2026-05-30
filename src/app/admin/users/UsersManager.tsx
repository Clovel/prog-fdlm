'use client';

/* Framework imports ----------------------------------- */
import React, { useState } from 'react';

/* Component imports ----------------------------------- */
import { Button } from 'components/ui/button';
import UsersTable from './UsersTable';
import UserFormDialog from './UserFormDialog';

/* UsersManager component ------------------------------ */
const UsersManager: React.FC = () => {
  const [createOpen, setCreateOpen] = useState<boolean>(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Utilisateurs</h1>
        <Button onClick={(): void => setCreateOpen(true)}>Nouvel utilisateur</Button>
      </div>

      <UsersTable />

      <UserFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
};

/* Export UsersManager component ----------------------- */
export default UsersManager;
