/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import AdminShellClient from './AdminShellClient';

/* Module imports (project) ---------------------------- */
import { gravatarUrl } from 'auth/gravatar';

/* Type imports ---------------------------------------- */
import type { Role } from 'auth/roles';

/* AdminShell component prop types --------------------- */
interface AdminShellUser {
  name: string;
  email: string;
  firstName: string;
  lastName: string;
  image: string | null;
  role: Role;
}

interface AdminShellProps {
  user: AdminShellUser;
  children: React.ReactNode;
}

/* AdminShell component -------------------------------- */
const AdminShell: React.FC<AdminShellProps> = ({ user, children }) => {
  const initials: string = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  const avatarSrc: string = (user.image !== null && user.image.length > 0)
    ? user.image
    : gravatarUrl(user.email);

  return (
    <AdminShellClient
      user={{
        name: user.name,
        role: user.role,
        initials,
        avatarSrc,
      }}
    >
      {children}
    </AdminShellClient>
  );
};

/* Export AdminShell component ------------------------- */
export default AdminShell;
