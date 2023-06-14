/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';

/* Events fixture -------------------------------------- */
export const events: Event[] = [
  {
    id: '1',
    name: 'Concert Open air Souyetek',
    location: {
      name: 'Quai Des Sports (face À La Porte De La Monnaie)',
      addressStr: 'Quai Des Sports, Bordeaux, France',
    },
    startTime: new Date('2021-06-21T16:00:00+02:00'),
  },
  {
    id: '2',
    name: 'Concert au Garage Moderne',
    location: {
      name: 'Le Garage Moderne',
      addressStr: '1 Rue Des Étrangers, Bordeaux, France',
    },
    startTime: new Date('2021-06-21T15:00:00+02:00'),
  },
];
