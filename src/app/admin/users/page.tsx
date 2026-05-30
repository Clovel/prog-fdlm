/* Framework imports ----------------------------------- */
import React from 'react';
import { redirect } from 'next/navigation';

/* Module imports (project) ---------------------------- */
import { requireSession } from 'auth/helpers';

/* UsersPlaceholderPage component ---------------------- */
const UsersPlaceholderPage = async (): Promise<React.ReactElement> => {
  const session = await requireSession();
  const role: string = (session.user as { role?: string }).role ?? 'viewer';
  if(role !== 'admin') {
    redirect('/admin');
  }
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">Utilisateurs</h1>
      <p className="text-muted-foreground">Bientôt disponible.</p>
    </div>
  );
};

/* Export UsersPlaceholderPage component --------------- */
export default UsersPlaceholderPage;
