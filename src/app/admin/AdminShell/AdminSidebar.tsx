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
  collapsed?: boolean;
  onNavigate?: () => void;
}

/* Helpers --------------------------------------------- */
const isActive = (pathname: string, href: string): boolean => {
  if(href === '/admin') {
    return pathname === '/admin';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
};

/* AdminSidebar component ------------------------------ */
const AdminSidebar: React.FC<AdminSidebarProps> = (
  {
    role,
    collapsed = false,
    onNavigate,
  },
) => {
  const pathname = usePathname();
  const items = adminNavItems.filter(
    (item) => item.roles === undefined || item.roles.includes(role),
  );

  return (
    <div className="flex h-full flex-col">
      <nav className={cn('flex flex-col gap-1', collapsed ? 'p-2' : 'p-3')}>
        {
          items.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                aria-label={item.label}
                onClick={onNavigate}
                className={cn(
                  'flex items-center rounded-md py-2 text-sm font-medium transition-colors',
                  collapsed ? 'justify-center px-2' : 'gap-2 px-3',
                  isActive(pathname, item.href)
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span className={collapsed ? 'sr-only' : undefined}>{item.label}</span>
              </Link>
            );
          })
        }
      </nav>
      <div className="mt-auto">
        <Separator />
        <nav className={cn('flex flex-col gap-1', collapsed ? 'p-2' : 'p-3')}>
          <Link
            href="/"
            title={collapsed ? 'Retour au site public' : undefined}
            aria-label="Retour au site public"
            onClick={onNavigate}
            className={cn(
              'flex items-center rounded-md py-2 text-sm font-medium transition-colors',
              collapsed ? 'justify-center px-2' : 'gap-2 px-3',
              'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
            <span className={collapsed ? 'sr-only' : undefined}>Retour au site public</span>
          </Link>
          <LogoutButton collapsed={collapsed} onLogout={onNavigate} />
        </nav>
      </div>
    </div>
  );
};

/* Export AdminSidebar component ----------------------- */
export default AdminSidebar;
