/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import QueryProvider from 'components/QueryProvider/QueryProvider';
import Header from 'components/Header/Header';
import Copyright from 'components/Copyright/Copyright';

/* Type imports ---------------------------------------- */
import type { Viewport } from 'next';

/* Viewport -------------------------------------------- */
/**
 * Draw edge-to-edge under the notch / status bar so the header background can
 * fill the safe area. The header pads by env(safe-area-inset-top) to keep its
 * text below the notch, and the footer pads by env(safe-area-inset-bottom) to
 * clear the home indicator. Scoped to the public layout so the admin shell's
 * h-screen layout is unaffected.
 */
export const viewport: Viewport = {
  viewportFit: 'cover',
};

/* PublicLayout component prop types ------------------- */
interface PublicLayoutProps {
  children: React.ReactNode;
}

/* PublicLayout component ------------------------------ */
const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  return (
    <QueryProvider>
      <Header showEventsCount={true} />
      <main className="flex-1 min-h-full flex flex-col items-center">
        {children}
      </main>
      <footer className="flex flex-col justify-center h-14 pb-[env(safe-area-inset-bottom)]">
        <Copyright />
      </footer>
    </QueryProvider>
  );
};

/* Export PublicLayout component ----------------------- */
export default PublicLayout;
