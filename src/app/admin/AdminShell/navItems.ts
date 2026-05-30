/* Type imports ---------------------------------------- */
import type { Role } from 'auth/roles';

/* Nav item model -------------------------------------- */
export interface AdminNavItem {
  href: string;
  label: string;
  /** When set, only these roles see the item. Undefined = all authenticated roles. */
  roles?: Role[];
}

export const adminNavItems: AdminNavItem[] = [
  { href: '/admin', label: 'Tableau de bord' },
  { href: '/admin/editions', label: 'Éditions' },
  { href: '/admin/events', label: 'Événements' },
  { href: '/admin/alerts', label: 'Alertes' },
  { href: '/admin/users', label: 'Utilisateurs', roles: ['admin'] },
];
