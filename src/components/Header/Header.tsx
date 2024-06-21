/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports -------------------------------------- */
import { events } from 'fixtures/events-2024';

/* Component imports ----------------------------------- */
import { Link as MuiLink } from '@mui/material';

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */

/* Header component prop types ------------------------- */
interface HeaderProps {
  showEventsCount?: boolean;
}

/* Header component ------------------------------------ */
const Header: React.FC<HeaderProps> = (
  {
    showEventsCount = false,
  }
) => {
  return (
    <header className="w-full font-mono flex flex-col lg:flex-row items-center justify-between gap-2 lg:p-16">
      <div>
        <p className="w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 p-2 lg:dark:bg-zinc-800/30">
          Liste des événements de la fête de la musique 2024 à Bordeaux
          {
            showEventsCount === true &&
              <>
                <br />
                <br />
                {events.length}
                {' '}
                événement
                {events.length !== 1 ? 's' : ''}
                {' '}
                cette année.
              </>
          }
        </p>
      </div>
      <div>
        <p>
          {'Made with ❤️ by '}
          <MuiLink
            color="inherit"
            href="https://github.com/Clovel"
            target="_blank"
            rel="noopener noreferrer"
          >
            Clovis Durand
          </MuiLink>
        </p>
      </div>
    </header>
  );
};

/* Export Header component ----------------------------- */
export default Header;

/*
        <header className="flex-0 z-10 w-full items-center justify-between font-mono text-sm flex flex-col lg:flex-row lg:px-24 lg:py-8">
          <p className="left-0 top-0 w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 p-2 lg:dark:bg-zinc-800/30">
            Liste des événements de la fête de la musique à Bordeaux
          </p>
          <div className="lg:flex lg:visible fixed lg:left-0 h-48 w-full justify-center from-white via-white dark:from-black dark:via-black lg:static lg:h-auto lg:w-auto lg:bg-none">
            <a
              className="pointer-events-none flex place-items-center gap-2 p-8 lg:pointer-events-auto lg:p-0"
              href="https://github.com/Clovel"
              target="_blank"
              rel="noopener noreferrer"
            >
              Made with ❤️ by Clovis Durand
            </a>
          </div>
        </header>
 */
