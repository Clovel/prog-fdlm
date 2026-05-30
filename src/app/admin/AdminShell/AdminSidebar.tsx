'use client';

/* Framework imports ----------------------------------- */
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
    <nav className="flex flex-col gap-1 p-3">
      {
        items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive(pathname, item.href)
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            {item.label}
          </Link>
        ))
      }
    </nav>
  );
};

/* Export AdminSidebar component ----------------------- */
export default AdminSidebar;
