/* Component imports ----------------------------------- */

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';

/* Events fixture -------------------------------------- */
export const FETE_DE_LA_MUSIQUE_DAY_2026 = new Date('2026-06-21');
export const events: Event[] = [
  {
    id: '1',
    category: 'Centre ville',
    name: `Bordeaux Rock × Flippin Freaks × Les Disques du Paradis`,
    location: {
      name: `Cour d'honneur du Crédit Municipal`,
      addressStr: `29 rue du Mirail, 33000 Bordeaux`,
    },
    startTime: new Date('2026-06-21T19:30:00'),
    genres: [
      'Rock',
      'Garage',
      'Indie',
      'Electro',
    ],
    price: 'Entrée libre',
    artists: [
      'TH Da Freak',
      'Lal Tuna',
      'Straw Dogs',
      'Tacoblaster',
      'Dodudaboum',
    ],
    links: [
      {
        url: 'https://shotgun.live/fr/events/fete-de-la-musique-2026-bordeaux-rock',
        label: 'Billetterie Shotgun',
      },
    ],
    description: `Bordeaux Rock, Flippin Freaks et Les Disques du Paradis unissent leurs forces pour une grande soirée gratuite dans la cour d'honneur du Crédit Municipal.

🚪 Ouverture des portes à 19h00
🎵 Début des concerts à 19h30
🎟️ Entrée libre

Organisé par Bordeaux Rock, Flippin Freaks et Les Disques du Paradis.`,
  },
  {
    id: '2',
    category: 'Mérignac',
    name: `Chœur Hippocantus — Messe en Ré de Dvořák & extraits du Magnificat de Rutter`,
    location: {
      name: `Église Saint-Vincent`,
      addressStr: `Église Saint-Vincent, 33700 Mérignac`,
    },
    startTime: new Date('2026-06-21T00:00:00'),
    genres: [
      'Classique',
      'Choral',
    ],
    artists: [
      'Chœur Hippocantus',
    ],
    alerts: [
      {
        type: 'warning',
        title: 'Horaire à confirmer',
        content: `L'horaire de ce concert n'a pas encore été communiqué.`,
      },
    ],
    links: [
      {
        url: 'https://www.jds.fr/bordeaux/concerts/fete-de-la-musique/fete-de-la-musique-a-bordeaux-177081_A',
        label: 'Annonce sur JDS',
      },
    ],
    description: `Le Chœur Hippocantus interprète la Messe en Ré majeur de Dvořák ainsi que des extraits du Magnificat de Rutter.

Direction : Bastien Penas.
Accompagnement : Florence Chaubin-Guillaume.`,
  },
  {
    id: '3',
    category: 'Centre ville',
    name: `Terrible Truth`,
    location: {
      name: `Grand Théâtre de Bordeaux (à confirmer)`,
      addressStr: `Place de la Comédie, 33000 Bordeaux`,
    },
    startTime: new Date('2026-06-21T00:00:00'),
    alerts: [
      {
        type: 'warning',
        title: 'Informations à vérifier',
        content: `Annonce issue d'un agrégateur (JDS) : le lieu et l'horaire ne sont pas confirmés.`,
      },
    ],
    artists: [
      'Terrible Truth',
    ],
    links: [
      {
        url: 'https://www.jds.fr/bordeaux/concerts/fete-de-la-musique/fete-de-la-musique-a-bordeaux-177081_A',
        label: 'Annonce sur JDS',
      },
    ],
    description: `Concert de Terrible Truth.

⚠️ Annonce repérée via un agrégateur : le lieu exact (Grand Théâtre ?) et l'horaire restent à vérifier.`,
  },
  {
    id: '4',
    name: `Awadis Sound System`,
    location: {
      name: `Lieu à préciser`,
      addressStr: `Bordeaux`,
    },
    startTime: new Date('2026-06-21T00:00:00'),
    genres: [
      'Reggae',
      'Sound system',
    ],
    alerts: [
      {
        type: 'warning',
        title: 'Lieu et horaire à confirmer',
        content: `Le lieu exact et l'horaire de ce sound system n'ont pas encore été publiés.`,
      },
    ],
    artists: [
      'Awadis Sound System',
    ],
    links: [
      {
        url: 'https://www.jds.fr/bordeaux/concerts/fete-de-la-musique/fete-de-la-musique-a-bordeaux-177081_A',
        label: 'Annonce sur JDS',
      },
    ],
    description: `Reggae sound system Awadis.

⚠️ Annonce repérée via un agrégateur : la localisation exacte n'est pas encore publiée.`,
  },
  {
    id: '5',
    category: 'Rive droite',
    name: `Fête de la Musique au M.270`,
    location: {
      name: `M.270 — Maison de Floirac`,
      addressStr: `M.270, 33270 Floirac`,
    },
    startTime: new Date('2026-06-21T00:00:00'),
    genres: [
      'Éclectique',
    ],
    alerts: [
      {
        type: 'warning',
        title: 'Programmation à venir',
        content: `La programmation et les horaires ne sont pas encore publiés.`,
      },
    ],
    links: [
      {
        url: 'https://openagenda.com/en/rive-droite-bordeaux-metropole/events/fete-de-la-musique-3788957',
        label: 'Annonce sur OpenAgenda',
      },
    ],
    description: `Fête de la Musique à la M.270, la maison de Floirac.

Organisé par Rive Droite / Bordeaux Métropole.

⚠️ Programmation et horaires non encore publiés.`,
  },
];
