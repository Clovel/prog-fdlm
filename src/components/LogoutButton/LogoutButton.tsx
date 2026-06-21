'use client';

/* Framework imports ----------------------------------- */
import React from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

/* Module imports (project) ---------------------------- */
import { cn } from 'lib/utils';
import { authClient } from 'auth/client';

/* LogoutButton component prop types ------------------- */
interface LogoutButtonProps {
  className?: string;
  collapsed?: boolean;
  onLogout?: () => void;
}

/* LogoutButton component ------------------------------ */
const LogoutButton: React.FC<LogoutButtonProps> = (
  {
    className,
    collapsed = false,
    onLogout,
  },
) => {
  const router = useRouter();

  const handleLogout = async (): Promise<void> => {
    await authClient.signOut();
    router.push('/login');
  };

  return (
    <button
      type="button"
      title={collapsed ? 'Se déconnecter' : undefined}
      aria-label="Se déconnecter"
      className={cn(
        'flex w-full items-center rounded-md py-2 text-sm font-medium transition-colors',
        collapsed ? 'justify-center px-2' : 'gap-2 px-3 text-left',
        'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        className,
      )}
      onClick={(): void => {
        onLogout?.();
        void handleLogout();
      }}
    >
      <LogOut className="size-4 shrink-0" aria-hidden="true" />
      <span className={collapsed ? 'sr-only' : undefined}>Se déconnecter</span>
    </button>
  );
};

/* Export LogoutButton component ----------------------- */
export default LogoutButton;
