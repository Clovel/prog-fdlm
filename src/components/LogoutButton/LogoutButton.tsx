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
}

/* LogoutButton component ------------------------------ */
const LogoutButton: React.FC<LogoutButtonProps> = ({ className }) => {
  const router = useRouter();

  const handleLogout = async (): Promise<void> => {
    await authClient.signOut();
    router.push('/login');
  };

  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors',
        'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        className,
      )}
      onClick={(): void => {
        void handleLogout();
      }}
    >
      <LogOut className="size-4 shrink-0" aria-hidden="true" />
      Se déconnecter
    </button>
  );
};

/* Export LogoutButton component ----------------------- */
export default LogoutButton;
