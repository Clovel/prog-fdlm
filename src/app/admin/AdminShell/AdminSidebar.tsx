'use client';

/* Framework imports ----------------------------------- */
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

/* Component imports ----------------------------------- */
import { Separator } from 'components/ui/separator';
import LogoutButton from 'components/LogoutButton/LogoutButton';

/* Module imports -------------------------------------- */
import { cn } from 'lib/utils';
import { adminNavItems } from './navItems';

/* Type imports ---------------------------------------- */
import type { Role } from 'auth/roles';

/* AdminSidebar component prop types ------------------- */
interface AdminSidebarProps {
  role: Role;
}

/* Helpers --------------------------------------------- */
const isActive = (pathname: string, href: string): boolean => {
  if(href === '/admin') {
    return pathname === '/admin';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
};

/* AdminSidebar component ------------------------------ */
const AdminSidebar: React.FC<AdminSidebarProps> = ({ role }) => {
  const pathname = usePathname();
  const items = adminNavItems.filter(
    (item) => item.roles === undefined || item.roles.includes(role),
  );

  return (
    <div className="flex h-full flex-col">
      <nav className="flex flex-col gap-1 p-3">
        {
          items.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive(pathname, item.href)
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })
        }
      </nav>
      <div className="mt-auto">
        <Separator />
        <nav className="flex flex-col gap-1 p-3">
          <Link
            href="/"
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
            Retour au site public
          </Link>
          <LogoutButton />
        </nav>
      </div>
    </div>
  );
};

/* Export AdminSidebar component ----------------------- */
export default AdminSidebar;
