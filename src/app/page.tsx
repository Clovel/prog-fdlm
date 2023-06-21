'use client';

/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports -------------------------------------- */
import { events } from 'fixtures/events';
import { reduceEventsByCategory } from 'helpers/reduceEventsByCategory';
import { sortEventsByCategoryEntries } from 'helpers/orderEventsByCategory';

/* Component imports ----------------------------------- */
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import { InstagramEmbed } from 'react-social-media-embed';
import EventList from '../components/EventList/EventList';

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */

/* HomePage component prop types -------------------- */
interface HomePageProps {}

/* HomePage component ------------------------------- */
const HomePage: React.FC<HomePageProps> = () => {
  return (
    <div className="flex flex-col place-items-center min-w-full py-4 lg:py-0">
      <p>
        Nombre d'events :
        {' '}
        {events.length}
      </p>
      <Alert
        className="lg:my-2 lg:p-2 w-full"
        severity="error"
      >
        <p>
          A cause des orages annoncés pour ce soir, ne nombreux événements en plein air sont annulés ou reprogrammés dans des lieux abrités.
        </p>
        <br />
        <p>
          Par exemple, les évènements suivants ont été reprogrammés :
        </p>
        <ul className="!list-disc list-inside">
          <li>
            Amplitudes, Cmd+O & L'Orangeade : Darwin de 18 et 21h45, IBOAT de 21h et 4h
          </li>
          <li>
            ③⑥①⑤𝘽𝙀𝘽𝙊𝙋 : Les BROC'S Saint Michel, de 16h à 2h
          </li>
          <li>
            WHYNOT, l'Astrodøme et Musique d'Apéritif : Deus Ex Machina, de 19h à 00h
          </li>
        </ul>
        <br />
        <p>
          Pour Darwin, pensez a vous inscrire sur la liste d'attente :
          {' '}
          <a
            href="https://dice.fm/event/yaedr-hh-fte-de-la-musique-et-du-skate-21st-jun-darwin-bordeaux-tickets"
            target="_blank"
            rel="noreferrer noopener"
            className="text-blue-500 hover:underline"
          >
            Billetterie DICE
          </a>
        </p>
      </Alert>
      <Alert
        className="lg:my-2 lg:p-2 w-full"
        severity="warning"
      >
        Les annulations et déplacement des évènements sont en cours de mise à jour.
      </Alert>
      <Alert
        className="lg:my-2 lg:p-2 w-full"
        severity="success"
      >
        Merci beaucoup aux lieux qui accueillent les artistes et les évènements qui ont été annulés à cause de la pluie !
        Sans eux la fête serait annulée !
      </Alert>
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
                  <section className="flex flex-col w-full max-w-screen lg:max-w-5xl px-2 lg:py-8 mx-auto lg:px-0">
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
          Guide des évènements de Feather Webzine
        </Typography>
        <div
          className="mx-auto"
          style={{ maxWidth: 380 }}
        >
          <InstagramEmbed url="https://www.instagram.com/p/CttYam5KAhY/" />
        </div>
      </section>
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
