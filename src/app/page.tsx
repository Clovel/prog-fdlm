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
import { sortEventsByCategoryEntries } from 'helpers/orderEventsByCategory';

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */

/* HomePage component prop types -------------------- */
interface HomePageProps {}

/* HomePage component ------------------------------- */
const HomePage: React.FC<HomePageProps> = () => {
  return (
    <div className="flex flex-col place-items-center min-w-full">
      <p>
        Nombre d'events:
        {' '}
        {events.length}
      </p>
      {
        Object.entries(
          reduceEventsByCategory(events)
        )
          .sort(sortEventsByCategoryEntries)
          .map(
            (categoryEntry, index, array) => {
              const categoryTitle = categoryEntry[0];

              return (
                <React.Fragment key={`${categoryTitle}-${index}`}>
                  <section className="w-full max-w-5xl px-2 lg:py-8 mx-auto lg:px-0">
                    <Typography
                      variant="h4"
                      className="py-4"
                    >
                      {categoryTitle}
                    </Typography>
                    <EventList events={categoryEntry[1]} />
                  </section>
                  {
                    array.length - 1 !== index &&
                      <Divider className="w-full" />
                  }
                </React.Fragment>
              );
            },
          )
      }
      <section className="w-full max-w-5xl px-4 g:py-8 mx-auto lg:px-0">
        <Typography
          variant="h4"
          className="pb-4"
        >
          Cartes des événements
        </Typography>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="inline"
          src="https://agendaculturel.emstorage.fr/fete-de-la-musique-a-bordeaux-2023-20230608161506.jpg"
          alt="Carte de l'agenda culturel de Bordeaux"
          // width={800}
          loading="lazy"
        />
      </section>
    </div>
  );
};

/* Export HomePage component ------------------------ */
export default HomePage;
