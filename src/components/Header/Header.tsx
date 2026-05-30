'use client';

/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports -------------------------------------- */
import { useHeader } from 'app/HeaderContext';

/* Component imports ----------------------------------- */
import ThemeToggle from 'components/ThemeToggle/ThemeToggle';

/* Header component prop types ------------------------- */
interface HeaderProps {
  showEventsCount?: boolean;
}

/* Header component ------------------------------------ */
const Header: React.FC<HeaderProps> = (
  {
    showEventsCount = false,
  },
) => {
  const { state } = useHeader();
  const year: number | null = state.year;
  const count: number | null = state.eventsCount;

  return (
    <header className="w-full font-mono flex flex-col lg:flex-row items-center justify-between gap-2 lg:p-16">
      <div>
        <p className="w-full justify-center border-b border-border bg-gradient-to-b from-muted/50 to-transparent pb-6 pt-8 backdrop-blur-2xl lg:rounded-xl lg:border lg:bg-muted/50 lg:p-4 p-2">
          {
            year !== null ?
              `Liste des événements de la fête de la musique ${year} à Bordeaux` :
              'Fête de la musique à Bordeaux'
          }
          {
            showEventsCount === true && count !== null &&
              <>
                <br />
                <br />
                {count}
                {' '}
                événement
                {count !== 1 ? 's' : ''}
                {' '}
                cette année.
              </>
          }
        </p>
      </div>
      <div className="flex items-center gap-2">
        <p>
          {'Made with ❤️ by '}
          <a
            href="https://github.com/Clovel"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 underline-offset-4 hover:underline"
          >
            Clovis Durand
          </a>
        </p>
        <ThemeToggle />
      </div>
    </header>
  );
};

/* Export Header component ----------------------------- */
export default Header;
