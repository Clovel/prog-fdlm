/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';

/* Events fixture -------------------------------------- */
export const events: Event[] = [
  {
    id: '1',
    name: 'Concert Open air Souyetek',
    category: 'St. Michel',
    location: {
      name: 'Quai Des Sports (face À La Porte De La Monnaie)',
      // addressStr: 'Quai Des Sports, Bordeaux, France',
    },
    startTime: new Date('2021-06-21T18:00:00+02:00'),
    endTime: new Date('2021-06-22T02:00:00+02:00'),
    genres: [
      'Techno',
      'House',
    ],
  },
  {
    id: '2',
    name: 'Concert au Garage Moderne',
    startTime: new Date('2021-06-21T17:00:00+02:00'),
    location: {
      name: 'Le Garage Moderne',
      addressStr: '1 Rue Des Étrangers, Bordeaux',
    },
    links: [
      'https://33.agendaculturel.fr/concert/bordeaux/la-fete-de-la-musique-au-garage-moderne.html',
    ],
    genres: [
      'Afro',
      'Oriental',
      'Asiatique',
      'Electro',
    ],
    description: (
      <p>
        Dans un subtil mélange de sonorités du monde avec Zaltar and the Tribe suivit de Kei McGregor's Band, les musiciens que vous découvrirez sur scène unissent tradition et modernité avec un sacré savoir faire et nous sommes très fiers de les recevoir !
        <br />
        <br />
        Avec Zaltar and the Tribe, vous voguerez sur des rythmes africains, orientaux, asiatiques et indiens interprétés avec brio avec un son électro-instrumental. Les musiciens ont une solide expérience de création au sein d'anciens groupes comme Sultan Project, WSM, Hostile 17, Appel d'airs, Solune, Baz y Bozuk, Jazz à flot. Le trio est composé de Sylvain Le Ruen aux percussions et didgeridoo, de Thierry Ferrand aux flûtes orientales et traversière et aux claviers, ainsi que de Matthieu Rios au saxophone, violoncelle et spacedrum.
        <br />
        <br />
        Kei McGregor's Band c'est sept musiciens qui concoctent une sauce musicale Sud-Africaine originale, métissée, dansante aux accents cuivrés, puisant dans le riche héritage musical de Myriam Makeba, Hugh Masekela, Dudu Pukwana, Gwigwi Mrwebi, Mongezi Feza, Johnny Dyani, Louis Moholo-Moholo, Chris McGregor and the Brotherhood Of Breath.
        <br />
        <br />
        Mais ce n'est pas tout, un atelier d'initiation musicale animé en début de soirée par l'association "On verra bien" proposera aux adultes d'appréhender un instrument pour la première fois (guitare, basse, batterie...). Cet atelier ouvert à tous sera mené par Timothée, professeur à l'écoute et pédagogue qui saura vous mettre à l'aise et vous faire vivre une riche expérience de pratique et de découverte musicale. L'atelier est gratuit, sur inscription avec un nombre de place très limité.
        <br />
        <br />
        Programme :
        <br />
        <br />
        <ul>
          <li>
            17h : Atelier percussions ouvert à tou.te.s et gratuit, sur inscription avec un nombre de place très limité
          </li>
          <li>
            19h : repas
          </li>
          <li>
            19h30 : concert Zaltar & the Tribe: Musiques du Monde, Electro-instrumental
          </li>
          <li>
            21h : concert Kei McGregor's Band: Groove et Jazz Sud-Africain`,
          </li>
        </ul>
      </p>
    ),
  },
  {
    id: '3',
    name: 'Bulle musicale au Musée des Beaux-Arts à Bordeaux',
    location: {
      name: 'Musée des Beaux-Arts',
      addressStr: '20 Cours d\'Albret, Bordeaux',
    },
    startTime: new Date('2021-06-21T10:00:00+02:00'),
    price: `5€ par enfant + entrée du musée pour les parents`,
    genres: [
      'Enfants',
      'Découverte',
    ],
    description: (
      <>
        <p>
          Spectacle à partir de 1 an.
        </p>
        <p>
          Visite en musique pour les tout-petits !
        </p>
        <p>
          Le musée et l'association Le Labo des cultures en partenariat avec la Krakatoa vous invite à une bulle musicale dans les collections.
        </p>
        <p>
          Cette découverte des œuvres en musique et en douceur s'adresse aux bébés de 0 à 3 ans accompagnés de leurs parents.
        </p>
        <p>
          Une autre session vous est proposée au Musée d'Aquitaine autour de leurs collections ce même jour à 16h, sur réservation : contacter le musée d'Aquitaine.
        </p>
        <p>
          Site web :
          <a
            href="https://www.musba-bordeaux.fr/fr/evenement/bulle-musicale-visite-en-musique-pour-les-tout-petits"
            rel="noreferrer noopener"
            target="_blank"
          >
            https://www.musba-bordeaux.fr/fr/evenement/bulle-musicale-visite-en-musique-pour-les-tout-petits
          </a>
        </p>
        <p>
          Infos réservation :
        </p>
        <p>
          5€ par enfant + entrée du musée pour les parents.
          <br />
          Gratuit avec la Carte Jeune Bordeaux Métropole pour un enfant et un accompagnant.

        </p>
      </>
    ),
  },
];
