/* Framework imports ----------------------------------- */
import {
  Bell,
  Calendar,
  LayoutDashboard,
  Mic2,
  Share2,
  Users,
} from 'lucide-react';

/* Type imports ---------------------------------------- */
import type { LucideIcon } from 'lucide-react';
import type { Role } from 'auth/roles';

/* Nav item model -------------------------------------- */
export interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** When set, only these roles see the item. Undefined = all authenticated roles. */
  roles?: Role[];
}

export const adminNavItems: AdminNavItem[] = [
  { href: '/admin', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/admin/editions', label: 'Éditions', icon: Calendar },
  { href: '/admin/events', label: 'Événements', icon: Mic2 },
  { href: '/admin/alerts', label: 'Alertes', icon: Bell },
  { href: '/admin/embeds', label: 'Réseaux', icon: Share2, roles: ['admin'] },
  { href: '/admin/users', label: 'Utilisateurs', icon: Users, roles: ['admin'] },
];
