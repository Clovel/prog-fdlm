'use client';

/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports -------------------------------------- */

/* Component imports ----------------------------------- */
import ThemeRegistry from 'components/Theme/ThemeRegistry/ThemeRegistry';
import Copyright from 'components/Copyright/Copyright';

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */

/* MainLayout component prop types --------------------- */
interface MainLayoutProps {
  children: React.ReactNode;
}

/* MainLayout component -------------------------------- */
const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <ThemeRegistry>
      <body className="flex flex-col min-h-screen">
        <header className="flex-0 z-10 w-full items-center justify-between font-mono text-sm flex flex-col lg:flex-row lg:px-24 lg:py-8">
          <p className="left-0 top-0 w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 p-2 lg:dark:bg-zinc-800/30">
            Liste des événements de la fête de la musique à Bordeaux
          </p>
          <div className="hidden lg:flex invisible lg:visible fixed left-0 h-48 w-full justify-center from-white via-white dark:from-black dark:via-black lg:static lg:h-auto lg:w-auto lg:bg-none">
            <a
              className="pointer-events-none flex place-items-center gap-2 p-8 lg:pointer-events-auto lg:p-0"
              href="https://github.com/Clovel"
              target="_blank"
              rel="noopener noreferrer"
            >
              By Clovis Durand
            </a>
          </div>
        </header>
        <main className="flex-1 min-h-full flex flex-col items-center lg:p-24 lg:pt-8">
          {children}
        </main>
        <footer className="flex flex-col justify-center h-14">
          <Copyright />
        </footer>
      </body>
    </ThemeRegistry>
  );
};

/* Export MainLayout component ------------------------- */
export default MainLayout;
