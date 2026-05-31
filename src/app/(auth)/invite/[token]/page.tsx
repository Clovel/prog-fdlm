/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import AcceptInviteForm from './AcceptInviteForm';

/* Module imports (project) ---------------------------- */
import { validateInvitation } from 'db/queries/validateInvitation';

/* InvitePage component -------------------------------- */
const InvitePage = async (
  { params }: { params: Promise<{ token: string }> },
): Promise<React.ReactElement> => {
  const { token } = await params;
  const result = await validateInvitation(token);

  if(!result.valid) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6">
        <h1 className="text-xl font-semibold">Invitation invalide</h1>
        <p className="text-sm text-muted-foreground">
          Ce lien d'invitation est invalide, a expiré ou a déjà été utilisé. Demandez à un administrateur de vous en renvoyer un.
        </p>
      </div>
    );
  }

  return (
    <AcceptInviteForm
      token={token}
      email={result.email}
      role={result.role}
      initialFirstName={result.firstName ?? ''}
      initialLastName={result.lastName ?? ''}
    />
  );
};

/* Export InvitePage component ------------------------- */
export default InvitePage;
