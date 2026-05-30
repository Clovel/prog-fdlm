/* Framework imports ----------------------------------- */
import React from 'react';

/* AuthLayout component prop types --------------------- */
interface AuthLayoutProps {
  children: React.ReactNode;
}

/* AuthLayout component -------------------------------- */
const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {children}
      </div>
    </main>
  );
};

/* Export AuthLayout component ------------------------- */
export default AuthLayout;
