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
    <div className="flex flex-col place-items-center min-w-full">
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
                    className="w-full max-w-5xl px-4 g:py-8 mx-auto lg:px-0"
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
  );
};

/* Export HomePage component ------------------------ */
export default HomePage;
