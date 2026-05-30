/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports (project) ---------------------------- */
import { requireSession } from 'auth/helpers';

/* AdminLayout component prop types -------------------- */
interface AdminLayoutProps {
  children: React.ReactNode;
}

/* AdminLayout component ------------------------------- */
/**
 * Authoritative guard for /admin/*. Redirects to /login when there is no valid
 * session. In Spec 2 any authenticated role may proceed; Spec 3 adds per-section
 * role gating via requireRole(). Do NOT call requireRole here with a restrictive
 * set — that would risk a redirect loop (requireRole redirects to /admin).
 */
const AdminLayout = async({ children }: AdminLayoutProps): Promise<React.ReactElement> => {
  await requireSession();
  return (
    <main className="flex-1 w-full max-w-3xl mx-auto p-6">
      {children}
    </main>
  );
};

/* Export AdminLayout component ------------------------ */
export default AdminLayout;
