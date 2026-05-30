/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import { Separator } from 'components/ui/separator';
import UserAvatar from 'components/UserAvatar/UserAvatar';
import AdminSidebar from './AdminSidebar';

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
    <div className="flex min-h-screen w-full">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-card">
        <div className="flex items-center gap-3 p-4">
          <UserAvatar src={avatarSrc} initials={initials} alt={user.name} />
          <div className="flex flex-col min-w-0">
            <span className="truncate text-sm font-medium">{user.name}</span>
            <span className="truncate text-xs text-muted-foreground">{user.role}</span>
          </div>
        </div>
        <Separator />
        <div className="flex-1">
          <AdminSidebar role={user.role} />
        </div>
      </aside>
      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex items-center border-b border-border px-6 py-3">
          <span className="text-sm font-semibold">Back-office</span>
        </header>
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

/* Export AdminShell component ------------------------- */
export default AdminShell;
