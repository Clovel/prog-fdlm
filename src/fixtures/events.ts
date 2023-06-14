/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';

/* Events fixture -------------------------------------- */
export const events: Event[] = [
  {
    id: '1',
    name: 'Concert Open air Souyetek',
    category: 'St. Michel',
    genres: [
      'Techno',
      'House',
    ],
    location: {
      name: 'Quai Des Sports (face À La Porte De La Monnaie)',
      // addressStr: 'Quai Des Sports, Bordeaux, France',
    },
    startTime: new Date('2021-06-21T18:00:00+02:00'),
    endTime: new Date('2021-06-22T02:00:00+02:00'),
  },
  {
    id: '2',
    name: 'Concert au Garage Moderne',
    genres: [
      'Afro',
      'Oriental',
      'Electro',
    ],
    startTime: new Date('2021-06-21T17:00:00+02:00'),
    location: {
      name: 'Le Garage Moderne',
      addressStr: '1 Rue Des Étrangers, Bordeaux',
    },
    links: [
      'https://33.agendaculturel.fr/concert/bordeaux/la-fete-de-la-musique-au-garage-moderne.html',
    ],
  },
];
