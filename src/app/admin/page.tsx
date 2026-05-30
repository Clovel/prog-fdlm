/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import { Badge } from 'components/ui/badge';
import UserAvatar from 'components/UserAvatar/UserAvatar';
import LogoutButton from 'components/LogoutButton/LogoutButton';

/* Module imports (project) ---------------------------- */
import { requireSession } from 'auth/helpers';
import { gravatarUrl } from 'auth/gravatar';

/* AdminPage component --------------------------------- */
const AdminPage = async(): Promise<React.ReactElement> => {
  const session = await requireSession();
  const user = session.user;

  const firstName: string = (user as { firstName?: string }).firstName ?? '';
  const lastName: string = (user as { lastName?: string }).lastName ?? '';
  const role: string = (user as { role?: string }).role ?? 'viewer';
  const image: string | null | undefined = user.image;

  const initials: string = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  const avatarSrc: string = (image !== null && image !== undefined && image.length > 0)
    ? image
    : gravatarUrl(user.email);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Espace d&apos;administration</h1>
      <div className="flex items-center gap-4">
        <UserAvatar src={avatarSrc} initials={initials} alt={user.name} />
        <div className="flex flex-col">
          <span className="font-medium">{user.name}</span>
          <span className="text-sm text-muted-foreground">{user.email}</span>
        </div>
        <Badge variant="secondary">{role}</Badge>
      </div>
      <p className="text-muted-foreground">
        Le back-office complet arrive prochainement.
      </p>
      <div>
        <LogoutButton />
      </div>
    </div>
  );
};

/* Export AdminPage component -------------------------- */
export default AdminPage;
