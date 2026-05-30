'use client';

/* Framework imports ----------------------------------- */
import React from 'react';
import { useRouter } from 'next/navigation';

/* Component imports ----------------------------------- */
import { Button } from 'components/ui/button';

/* Module imports (project) ---------------------------- */
import { authClient } from 'auth/client';

/* LogoutButton component prop types ------------------- */
interface LogoutButtonProps {}

/* LogoutButton component ------------------------------ */
const LogoutButton: React.FC<LogoutButtonProps> = () => {
  const router = useRouter();

  const handleLogout = async (): Promise<void> => {
    await authClient.signOut();
    router.push('/login');
  };

  return (
    <Button
      variant="outline"
      onClick={(): void => {
        void handleLogout();
      }}
    >
      Se déconnecter
    </Button>
  );
};

/* Export LogoutButton component ----------------------- */
export default LogoutButton;
