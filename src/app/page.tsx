'use client';

/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports -------------------------------------- */
import { events } from 'fixtures/events-2024';
import { reduceEventsByCategory } from 'helpers/reduceEventsByCategory';
import { sortEventsByCategoryEntries } from 'helpers/orderEventsByCategory';

/* Component imports ----------------------------------- */
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import { InstagramEmbed } from 'react-social-media-embed';
import EventsRecap from 'components/EventsRecap/EventsRecap';
import EventCategoryView from 'components/EventCategoryView/EventCategoryView';
import EventsMap from 'components/EventsMap/EventsMap';

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */

/* HomePage component prop types ----------------------- */
interface HomePageProps {}

/* HomePage component ---------------------------------- */
const HomePage: React.FC<HomePageProps> = () => {
  return (
    <div className="flex flex-col place-items-center min-w-full py-4 lg:py-0">
      <EventsRecap events={events} />
      {/* <WeatherAlert /> */}
      {
        Object.entries(
          reduceEventsByCategory(events)
        )
          .sort(sortEventsByCategoryEntries)
          .map(
            (categoryEntry, index, array) => {
              const categoryTitle = categoryEntry[0];
              const categoryEvents = categoryEntry[1];

              return (
                <React.Fragment key={`${categoryTitle}-${index}`}>
                  <EventCategoryView
                    categoryTitle={categoryTitle}
                    categoryEvents={categoryEvents}
                  />
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
        <EventsMap events={events} />
        <InstagramEmbed url="https://www.instagram.com/p/C8bz_zPIUdX/" />
      </section>
    </div>
  );
};

/* Export HomePage component --------------------------- */
export default HomePage;
