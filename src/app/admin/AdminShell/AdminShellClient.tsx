'use client';

/* Framework imports ----------------------------------- */
import React, { useState } from 'react';
import { Menu } from 'lucide-react';

/* Component imports ----------------------------------- */
import { Button } from 'components/ui/button';
import { Separator } from 'components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from 'components/ui/sheet';
import UserAvatar from 'components/UserAvatar/UserAvatar';
import AdminSidebar from './AdminSidebar';

/* Module imports -------------------------------------- */
import { cn } from 'lib/utils';

/* Type imports ---------------------------------------- */
import type { Role } from 'auth/roles';

/* AdminShellClient component prop types --------------- */
interface AdminShellClientUser {
  name: string;
  role: Role;
  initials: string;
  avatarSrc: string;
}

interface AdminShellClientProps {
  user: AdminShellClientUser;
  children: React.ReactNode;
}

/* AdminShellClient component -------------------------- */
const AdminShellClient: React.FC<AdminShellClientProps> = ({ user, children }) => {
  const [desktopOpen, setDesktopOpen] = useState<boolean>(true);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  const toggleDesktop = (): void => {
    setDesktopOpen((open) => !open);
  };

  const renderUserSummary = (collapsed: boolean): React.ReactElement => (
    <div
      className={cn(
        'flex items-center gap-3 p-4',
        collapsed && 'justify-center px-2',
      )}
    >
      <UserAvatar src={user.avatarSrc} initials={user.initials} alt={user.name} />
      {
        !collapsed &&
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{user.name}</span>
            <span className="truncate text-xs text-muted-foreground">{user.role}</span>
          </div>
      }
    </div>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <aside
        className={cn(
          'hidden shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200 md:flex',
          desktopOpen ? 'w-60' : 'w-16',
        )}
      >
        {renderUserSummary(!desktopOpen)}
        <Separator />
        <div className="flex-1 overflow-y-auto">
          <AdminSidebar role={user.role} collapsed={!desktopOpen} />
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation du back-office</SheetTitle>
            <SheetDescription>
              Liens de navigation et actions de session du back-office.
            </SheetDescription>
          </SheetHeader>
          <div className="flex h-full flex-col bg-card">
            {renderUserSummary(false)}
            <Separator />
            <div className="flex-1 overflow-y-auto">
              <AdminSidebar
                role={user.role}
                onNavigate={(): void => setMobileOpen(false)}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3 sm:px-6">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            aria-label="Ouvrir la navigation"
            onClick={(): void => setMobileOpen(true)}
          >
            <Menu className="size-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="hidden md:inline-flex"
            aria-label={desktopOpen ? 'Réduire la navigation' : 'Ouvrir la navigation'}
            aria-expanded={desktopOpen}
            onClick={toggleDesktop}
          >
            <Menu className="size-4" aria-hidden="true" />
          </Button>
          <span className="text-sm font-semibold">
            Back-office
          </span>
        </header>
        <main className="flex flex-1 flex-col overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

/* Export AdminShellClient component ------------------- */
export default AdminShellClient;
