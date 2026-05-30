/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import QueryProvider from './QueryProvider';
import AdminShell from './AdminShell/AdminShell';

/* Module imports (project) ---------------------------- */
import { requireSession } from 'auth/helpers';

/* Type imports ---------------------------------------- */
import type { Role } from 'auth/roles';

/* AdminLayout component prop types -------------------- */
interface AdminLayoutProps {
  children: React.ReactNode;
}

/* AdminLayout component ------------------------------- */
/**
 * Authoritative guard for /admin/*. Redirects to /login when unauthenticated.
 * Any authenticated role may view the backoffice; per-section write gating is
 * enforced server-side in the /api/admin routes. Do NOT call requireRole here
 * with a restrictive set — requireRole redirects to /admin and would loop.
 */
const AdminLayout = async({ children }: AdminLayoutProps): Promise<React.ReactElement> => {
  const session = await requireSession();
  const user = session.user as typeof session.user & {
    firstName?: string;
    lastName?: string;
    role?: string;
  };

  return (
    <QueryProvider>
      <AdminShell
        user={{
          name: user.name,
          email: user.email,
          firstName: user.firstName ?? '',
          lastName: user.lastName ?? '',
          image: user.image ?? null,
          role: (user.role ?? 'viewer') as Role,
        }}
      >
        {children}
      </AdminShell>
    </QueryProvider>
  );
};

/* Export AdminLayout component ------------------------ */
export default AdminLayout;
