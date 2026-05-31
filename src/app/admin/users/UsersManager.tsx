'use client';

/* Framework imports ----------------------------------- */
import React, { useState } from 'react';

/* Component imports ----------------------------------- */
import { Button } from 'components/ui/button';
import UsersTable from './UsersTable';
import UserFormDialog from './UserFormDialog';
import InviteUserDialog from './InviteUserDialog';
import InvitationsTable from './InvitationsTable';

/* UsersManager component ------------------------------ */
const UsersManager: React.FC = () => {
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [inviteOpen, setInviteOpen] = useState<boolean>(false);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Utilisateurs</h1>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={(): void => setInviteOpen(true)}>Inviter un utilisateur</Button>
            <Button onClick={(): void => setCreateOpen(true)}>Nouvel utilisateur</Button>
          </div>
        </div>
        <UsersTable />
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Invitations en attente</h2>
        <InvitationsTable />
      </div>

      <UserFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <InviteUserDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
};

/* Export UsersManager component ----------------------- */
export default UsersManager;
