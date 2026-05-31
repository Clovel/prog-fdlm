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
        url: 'https://www.bordeauxrock.com/fete-de-la-musique-2026/',
        label: 'Programmation Bordeaux Rock',
      },
    ],
    description: `Bordeaux Rock, Flippin Freaks et Les Disques du Paradis unissent leurs forces pour une grande soirée gratuite « 100% locavore » dans la cour d'honneur du Crédit Municipal.

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
    startTime: new Date('2026-06-21T17:00:00'),
    genres: [
      'Classique',
      'Choral',
    ],
    price: 'Entrée libre',
    artists: [
      'Chœur Hippocantus',
    ],
    alerts: [
      {
        type: 'warning',
        title: 'Informations à vérifier',
        content: `Annonce issue d'un agrégateur (Agendaculturel) et absente de la programmation officielle de la Ville de Mérignac : l'horaire (17h), l'adresse exacte et la gratuité restent à confirmer.`,
      },
    ],
    links: [
      {
        url: 'https://33.agendaculturel.fr/concert/merignac/choeur-hippocantus-messe-en-re-de-dvorak-et-extraits-du-magn.html',
        label: 'Annonce sur Agendaculturel',
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
  {
    id: '6',
    category: 'Bassins à flot',
    name: `L'Astrodøme fête la musique`,
    location: {
      name: `Les Vivres de l'Art`,
      addressStr: `4 rue Achard, 33300 Bordeaux`,
    },
    startTime: new Date('2026-06-20T17:00:00'),
    endTime: new Date('2026-06-21T01:30:00'),
    genres: [
      'Shoegaze',
      'Post-rock',
      'Post-punk',
      'Psych pop',
    ],
    price: '14 € (normal) / 18 € (soutien) + frais',
    artists: [
      `Bryan's Magic Tears`,
      'Austin TV',
      'La Dispatch',
      'St Franck',
      'Astrodøme DJs',
    ],
    alerts: [
      {
        type: 'warning',
        title: 'Soirée de la veille',
        content: `Cette soirée se tient le samedi 20 juin de 17h jusqu'au dimanche 21 juin 1h30. Lieu (Vivres de l'Art) à reconfirmer.`,
      },
    ],
    links: [
      {
        url: 'https://ypl.me/Rdf',
        label: 'Billetterie',
      },
    ],
    description: `L'Astrodøme investit Les Vivres de l'Art pour une grande soirée à cheval sur la Fête de la Musique : shoegaze, post-rock, post-punk, psych pop et DJ sets en vinyle.

Organisé par L'Astrodøme.`,
  },
  {
    id: '7',
    category: 'Mérignac',
    name: `Concert famille avec Koline`,
    location: {
      name: `Médiathèque Michel Sainte-Marie`,
      addressStr: `Place Charles-de-Gaulle, 33700 Mérignac`,
    },
    startTime: new Date('2026-06-21T15:30:00'),
    genres: [
      'Jeune public',
    ],
    price: 'Entrée libre',
    artists: [
      'Koline',
    ],
    links: [
      {
        url: 'https://www.merignac.com/agenda/fete-de-la-musique-merignac',
        label: 'Programmation Ville de Mérignac',
      },
    ],
    description: `Concert famille avec Koline (voix, guitare, percussions) à la médiathèque Michel Sainte-Marie.

Organisé par la Ville de Mérignac.`,
  },
  {
    id: '8',
    category: 'Mérignac',
    name: `Ensembles du Conservatoire (flûte et accordéon)`,
    location: {
      name: `Place Charles-de-Gaulle`,
      addressStr: `Place Charles-de-Gaulle, 33700 Mérignac`,
    },
    startTime: new Date('2026-06-21T18:00:00'),
    genres: [
      'Classique',
    ],
    price: 'Entrée libre',
    artists: [
      'Ensembles du Conservatoire de Mérignac',
    ],
    links: [
      {
        url: 'https://www.merignac.com/agenda/fete-de-la-musique-merignac',
        label: 'Programmation Ville de Mérignac',
      },
    ],
    description: `Les ensembles du Conservatoire de Mérignac (flûte et accordéon) ouvrent la scène du centre-ville, place Charles-de-Gaulle.

Organisé par la Ville de Mérignac.`,
  },
  {
    id: '9',
    category: 'Mérignac',
    name: `Les Musicales de Fantaisie`,
    location: {
      name: `Domaine de Fantaisie (quartier Eyquems)`,
      addressStr: `Avenue de Fantaisie, 33700 Mérignac`,
    },
    startTime: new Date('2026-06-21T18:30:00'),
    endTime: new Date('2026-06-21T20:30:00'),
    genres: [
      'Chant',
      'Chorale',
    ],
    price: 'Entrée libre',
    alerts: [
      {
        type: 'warning',
        title: 'Adresse à confirmer',
        content: `L'adresse précise du Domaine de Fantaisie (quartier Eyquems) reste à confirmer.`,
      },
    ],
    links: [
      {
        url: 'https://www.merignac.com/agenda/fete-de-la-musique-merignac',
        label: 'Programmation Ville de Mérignac',
      },
    ],
    description: `Démonstrations de chant et de chorale au Domaine de Fantaisie, dans le quartier des Eyquems.

Organisé par la Ville de Mérignac.`,
  },
  {
    id: '10',
    category: 'Mérignac',
    name: `The Arizons`,
    location: {
      name: `Place Charles-de-Gaulle`,
      addressStr: `Place Charles-de-Gaulle, 33700 Mérignac`,
    },
    startTime: new Date('2026-06-21T19:00:00'),
    genres: [
      'Rock',
    ],
    price: 'Entrée libre',
    artists: [
      'The Arizons',
    ],
    links: [
      {
        url: 'https://www.merignac.com/agenda/fete-de-la-musique-merignac',
        label: 'Programmation Ville de Mérignac',
      },
    ],
    description: `Concert rock de The Arizons sur la scène du centre-ville, place Charles-de-Gaulle.

Organisé par la Ville de Mérignac.`,
  },
  {
    id: '11',
    category: 'Bordeaux ouest',
    name: `Bordeaux fête la musique — Parc Bordelais`,
    location: {
      name: `Parc Bordelais (entrée rue du Bocage)`,
      addressStr: `Rue du Bocage, 33200 Bordeaux`,
    },
    startTime: new Date('2026-06-21T19:00:00'),
    endTime: new Date('2026-06-22T00:00:00'),
    genres: [
      'House',
      'Techno',
      'Dub',
      'Afro-caribbean',
    ],
    price: `Entrée libre (billet « Support Your Local Scene » optionnel)`,
    artists: [
      'Bruit Rose',
      'Hill Billy',
      'Nacre',
      'Amplitudes Radio',
      'Heavydance',
      'Helix',
      'Trikar',
      'Papy Takeover',
      'Infinity Hi-Fi × Massive Skankers',
    ],
    alerts: [
      {
        type: 'warning',
        title: 'Informations à vérifier',
        content: `Annonce repérée sur des plateformes de billetterie (DICE / AllEvents) : l'édition 2026, la programmation et l'organisateur (Bruit Rose Music ou L'Orangeade) restent à confirmer.`,
      },
    ],
    links: [
      {
        url: 'https://dice.fm/event/gvqlb-bordeaux-fte-la-musique-electronique-parc-bordelais-21st-jun-parc-bordelais-bordeaux-tickets',
        label: 'Billetterie DICE',
      },
    ],
    description: `Quatre scènes électroniques au Parc Bordelais : house, techno, dub et sons afro-caribéens jusqu'à minuit.

Organisé par Bruit Rose Music / L'Orangeade.`,
  },
  {
    id: '12',
    category: 'Mérignac',
    name: `Karaoké géant et barbecue`,
    location: {
      name: `MJC CLAL (quartier Chemin-Long)`,
      addressStr: `Quartier Chemin-Long, 33700 Mérignac`,
    },
    startTime: new Date('2026-06-21T19:30:00'),
    genres: [
      'Karaoké',
    ],
    price: 'Entrée libre',
    alerts: [
      {
        type: 'warning',
        title: 'Adresse à confirmer',
        content: `L'adresse précise de la MJC CLAL (quartier Chemin-Long) reste à confirmer.`,
      },
    ],
    links: [
      {
        url: 'https://www.merignac.com/agenda/fete-de-la-musique-merignac',
        label: 'Programmation Ville de Mérignac',
      },
    ],
    description: `Karaoké géant et barbecue à la MJC CLAL, dans le quartier Chemin-Long.

Organisé par la Ville de Mérignac et la MJC CLAL.`,
  },
  {
    id: '13',
    category: 'Mérignac',
    name: `Mel Musique`,
    location: {
      name: `Place Charles-de-Gaulle`,
      addressStr: `Place Charles-de-Gaulle, 33700 Mérignac`,
    },
    startTime: new Date('2026-06-21T19:45:00'),
    genres: [
      'Chanson française',
      'Musiques du monde',
    ],
    price: 'Entrée libre',
    artists: [
      'Mel Musique',
    ],
    links: [
      {
        url: 'https://www.merignac.com/agenda/fete-de-la-musique-merignac',
        label: 'Programmation Ville de Mérignac',
      },
    ],
    description: `Chanson française et musiques du monde avec Mel Musique sur la scène du centre-ville, place Charles-de-Gaulle.

Organisé par la Ville de Mérignac.`,
  },
  {
    id: '14',
    category: 'Mérignac',
    name: `Toxi Faktory`,
    location: {
      name: `Place Charles-de-Gaulle`,
      addressStr: `Place Charles-de-Gaulle, 33700 Mérignac`,
    },
    startTime: new Date('2026-06-21T20:30:00'),
    genres: [
      'Métal',
    ],
    price: 'Entrée libre',
    artists: [
      'Toxi Faktory',
    ],
    links: [
      {
        url: 'https://www.merignac.com/agenda/fete-de-la-musique-merignac',
        label: 'Programmation Ville de Mérignac',
      },
    ],
    description: `Concert métal de Toxi Faktory sur la scène du centre-ville, place Charles-de-Gaulle.

Organisé par la Ville de Mérignac.`,
  },
  {
    id: '15',
    category: 'Mérignac',
    name: `Nana Sapritch`,
    location: {
      name: `Place Charles-de-Gaulle`,
      addressStr: `Place Charles-de-Gaulle, 33700 Mérignac`,
    },
    startTime: new Date('2026-06-21T21:15:00'),
    genres: [
      'Pop',
      'Rock',
    ],
    price: 'Entrée libre',
    artists: [
      'Nana Sapritch',
    ],
    links: [
      {
        url: 'https://www.merignac.com/agenda/fete-de-la-musique-merignac',
        label: 'Programmation Ville de Mérignac',
      },
    ],
    description: `Concert pop-rock de Nana Sapritch sur la scène du centre-ville, place Charles-de-Gaulle.

Organisé par la Ville de Mérignac.`,
  },
  {
    id: '16',
    category: 'Mérignac',
    name: `The Lost Meridian`,
    location: {
      name: `Place Charles-de-Gaulle`,
      addressStr: `Place Charles-de-Gaulle, 33700 Mérignac`,
    },
    startTime: new Date('2026-06-21T22:00:00'),
    genres: [
      'Rock',
      'Trip-hop',
    ],
    price: 'Entrée libre',
    artists: [
      'The Lost Meridian',
    ],
    links: [
      {
        url: 'https://www.merignac.com/agenda/fete-de-la-musique-merignac',
        label: 'Programmation Ville de Mérignac',
      },
    ],
    description: `Clôture de la scène du centre-ville avec The Lost Meridian (rock / trip-hop), place Charles-de-Gaulle.

Organisé par la Ville de Mérignac.`,
  },
];
