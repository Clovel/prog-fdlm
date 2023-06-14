'use client';

/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports -------------------------------------- */
import { events } from 'fixtures/events';

/* Component imports ----------------------------------- */
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import EventList from '../components/EventList/EventList';
import { reduceEventsByCategory } from 'helpers/reduceEventsByCategory';

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */

/* HomePage component prop types -------------------- */
interface HomePageProps {}

/* HomePage component ------------------------------- */
const HomePage: React.FC<HomePageProps> = () => {
  return (
    <>
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 p-2 lg:dark:bg-zinc-800/30">
          Liste des événements de la fête de la musique à Bordeaux
        </p>
        <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:h-auto lg:w-auto lg:bg-none">
          <a
            className="pointer-events-none flex place-items-center gap-2 p-8 lg:pointer-events-auto lg:p-0"
            href="https://github.com/Clovel"
            target="_blank"
            rel="noopener noreferrer"
          >
            By Clovis Durand
          </a>
        </div>
      </div>

      <div className="relative flex flex-col place-items-center min-w-full">
        {
          Object.entries(
            reduceEventsByCategory(events)
          )
            .map(
              (categoryEntry, index, array) => {
                const categoryTitle = categoryEntry[0];

                return (
                  <>
                    <section
                      key={`${categoryTitle}-${index}`}
                      className="w-full max-w-5xl px-4 py-8 mx-auto lg:px-0"
                    >
                      <Typography variant="h3">
                        {categoryTitle}
                      </Typography>
                      <EventList events={categoryEntry[1]} />
                    </section>
                    {
                      array.length - 1 !== index &&
                        <Divider className="w-full" />
                    }
                  </>
                );
              },
            )
        }
      </div>
    </>
  );
};

/* Export HomePage component ------------------------ */
export default HomePage;
