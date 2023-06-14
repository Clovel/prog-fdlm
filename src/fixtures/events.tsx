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
    category: 'Bassins à flot',
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
    category: 'Centre ville',
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
  {
    id: '4',
    name: 'Concert Ricochet Sonore',
    category: 'Chartrons',
    location: {
      name: 'Le Jardin de ta Soeur',
      addressStr: 'Rue de la Motte Picquet, Bordeaux',
    },
    startTime: new Date('2021-06-21T15:00:00+02:00'),
    genres: [
      'Enfants',
      'Découverte',
      'Ludique',
    ],
    description: (
      <>
        <p>
          Cet après-midi divertissant et convivial rassemble une scène ouverte, une restitution d'ateliers musicaux, des animations ludiques dont l'équipe de Ricochet Sonore a le secret, et se clôture avec un concert du duo Kayola !
        </p>
        <p>
          Rendez-vous est pris au Jardin de ta Soeur, du côté des Bassins à Flot, avec la dynamique association Ricochet Sonore.
          {' '}
        </p>
        <p>
          Au programme :
          <ul>
            <li>
              15h : accueil en musique
            </li>
            <li>
              15h30 : Spectacle Jeune Public : Yakuba
            </li>
            <li>
              16h30 : Restitution + Scène ouverte
            </li>
            <li>
              18h : Concert Duo Kayola
            </li>
          </ul>
        </p>
      </>
    ),
  },
  {
    id: '5',
    name: 'La saison des plaisirs',
    category: 'Centre ville',
    location: {
      name: "Musée d'Aquitaine",
      addressStr: '20 Cours Pasteur, Bordeaux',
    },
    startTime: new Date('2021-06-21T18:00:00+02:00'),
    genres: [
      'Historique',
      'Théâtre musical',
    ],
    artists: [
      'Nadine Gabard',
      'Anne-Laure Menard',
    ],
    description: (
      <>
        <p>
          Nadine Gabard, mezzo-soprano et Anne-Laure Menard, claveciniste, proposent un théâtre musical décalé, à l'occasion du tricentenaire de la naissance de Jean-François Marmontel (1723-1799), un auteur proche de Diderot et quelque peu oublié du siècle des Lumières. Les deuc artistes dépoussièrent les classiques et les font résonner avec notre actualité.
        </p>

        <p>
          Avec la complicité de Magali Fourgnaud, maître de conférences en littérature.
        </p>
      </>
    ),
  },
  {
    id: '6',
    name: 'La Sueur et la Maison Ô Fantasme',
    category: 'Centre ville',
    location: {
      name: 'Musée des arts décoratifs et du design',
      addressStr: '39 Rue Bouffard, Bordeaux',
    },
    startTime: new Date('2021-06-21T19:00:00+02:00'),
    genres: [
      'DJs sets',
      'Drag',
      'Danse',
    ],
    artists: [
      'Meryl Street',
      'Sevenbeatz',
      'Marge',
    ],
    description: (
      <>
        <p>
          La Sueur et la Maison Ô Fantasme reviennent plus bouillants que jamais pour embraser la cour de l'Hôtel de Lalande
        </p>
        <p>
          Une nouvelle occasion de se rassembler pour lâcher prise, transpirer et resplendir ensemble. Mélangeons follement les genres, les corps, les identités, les inspirations musicales et entremêlons toutes les danses avec une seule envie : créer collectivement un espace de fête respectueuse et joyeuse où nous pouvons parader et briller sans complexes ni préjugés, danser à cœur ouvert et revendiquer avec fierté la liberté d'être qui nous voulons être.
        </p>
        <p>
          <ul>
            <li>
              DJs : Meryl Street, Sevenbeatz, Marge
            </li>
            <li>
              Shows Drag par la Maison Ô Fantasme
            </li>
            <li>
              Shows de danse inédits par la Sueur
            </li>
            <li>
              Dansons libres, soyons bienveillants et prenons soin les uns des autres
            </li>
          </ul>
        </p>
        <p>
          A chaque édition, l'équipe de la Sueur travaillent pour nous améliorer encore et rendre ses rendez-vous toujours plus safe et bienveillants. L'équipe de sécurité sera sensibilisée, la team et les bénévoles seront visibles et à votre écoute à tout moment. N'hésitez pas à vous adresser à eux si vous ne vous sentez pas en sécurité ou si vous assistez à tout acte malveillant.
        </p>
      </>
    ),
  },
  {
    id: '7',
    category: 'Centre ville',
    location: {
      name: 'Cours Mably',
      addressStr: 'Cours Mably, Bordeaux',
    },
    startTime: new Date('2021-06-21T19:00:00+02:00'),
    genres: [
      'DJs sets',
      'Electro',
      'Techno',
    ],
    artists: [
      'SUPER Daronne',
      'tplt',
    ],
  },
  {
    id: '8',
    name: 'Chantons et dansons comme les marins !',
    category: 'Bassins à flots',
    location: {
      name: 'Musée Mer Marine',
      addressStr: '89 Rue des Étrangers, Bordeaux',
    },
    startTime: new Date('2021-06-21T19:00:00+02:00'),
    genres: [
      'Chant',
      'Danse',
      'Folk',
    ],
    artists: [
      'LNelly Quette',
      'Collectif Le PAGE',
    ],
    description: "Sous l'impulsion de Nelly Quette, encyclopédie vivante des chants et des danses populaires, venez en famille chanter et danser comme des marins ! Aucune compétence requise : vous avez entre 7 et 77 ans, laissez-vous guider, évitez les talons aiguille et profitez-en : épaulée par les musiciens et danseurs du collectif le Page, Nelly Quette aura l'art de faire danser en rondes toutes les générations...",
  },
  {
    id: '9',
    category: 'Chartrons',
    location: {
      name: 'Salle Gouffrand',
      addressStr: '23 rue Gouffrand, Bordeaux',
    },
    startTime: new Date('2021-06-21T19:00:00+02:00'),
    endTime: new Date('2021-06-21T22:00:00+02:00'),
    price: '6€ + chapeau',
    genres: [
      'Jazz caribéen',
      'Biguine',
      'Mazouk',
      'Calses créoles',
      'zouk',
      'soul',
      'pop',
      'rock',
      "R'nb",
    ],
    description: (
      <>
        <p>
          Concert spécial fête de la musique 2023
        </p>
        <p>
          <ul>
            <li>
              Sista et Mikka (soul, pop, rock et R'nb)
            </li>
            <li>
              TDI, Twadisyons des iles (Jazz caraibeen, Biguine, Mazouk, calses créoles, zouk)
            </li>
          </ul>
        </p>
      </>
    ),
  },
  {
    id: '10',
    category: 'Bordeaux Sud',
    location: {
      name: 'Square Dom Bedos',
      addressStr: 'Place Dorm Bedos, Bordeaux',
    },
    name: 'Allez les Filles et Bordeaux Rock',
    startTime: new Date('2021-06-21T19:00:00+02:00'),
    endTime: new Date('2021-06-22T01:00:00+02:00'),
    genres: [
      'Rock',
      'Indie rock',
      'Rock Psyché',
      'Blues Stoner Rock',
      'Indie Pop',
    ],
    artists: [
      'The Damn Truth',
      'Th Da Freak',
      'Bilbao Kung-Fu',
      'Blackbird Hill',
      'Jach Ernest',
    ],
    description: (
      <>
        <p>
          Cette année, Allez les Filles et Bordeaux Rock unissent leurs forces de nouveau afin de fêter la musique de façon très rock. La fête de la musique se tiendra comme l’année dernière au Square Dom Bedos et fera jouer 4 groupes locaux et un groupe Canadien.
        </p>
        <p>
          Rendez-vous mercredi 21 juin dès 18h au Square Dom Bedos.
          <ul>
            <li>
              Ouverture des portes à 18h.
            </li>
            <li>
              Début des concerts à 19h.
            </li>
          </ul>
        </p>
        <p>
          La programmation :
          <ul>
            <li>
              The Damn Truth (Rock n Roll - Canada)
            </li>
            <li>
              Th Da Freak (Indie rock - Bordeaux)
            </li>
            <li>
              Bilbao Kung-Fu (Rock Psyché Français)
            </li>
            <li>
              Blackbird Hill (Blues Stoner Rock - Angoulême)
            </li>
            <li>
              Jach Ernest (Indie Pop - Bordeaux)
            </li>
          </ul>
        </p>
      </>
    ),
  },
  {
    id: '11',
    name: 'Wandem Sound System and Friends',
    category: 'Rive droite',
    location: {
      name: 'Quai Deschamps',
      // addressStr: 'Quai Deschamps, Bordeaux',
    },
    startTime: new Date('2021-06-21T19:00:00+02:00'),
    genres: [
      'Dub',
      'Afro',
    ],
    description: (
      <>
        <p>
          Wandem Sound System, organisateur des réjouissantes soirées Bordeaux Dub School, installe sa sono artisanale sur les bords de Garonne pour une chaude soirée musicale aux accents jamaïcains.
        </p>

        <p>
          Avec leurs meilleurs vinyles, mais aussi des musiciens live, Wandem Sound System and Friends vous accueillent dans la meilleure ambiance pour une soirée hautement dansante.
        </p>
      </>
    ),
  },
  {
    id: '12',
    name: 'Collectif Munera et Le Chaudron',
    category: 'Rive droite',
    location: {
      name: 'Square Toussaint Louverture',
    },
    startTime: new Date('2021-06-21T19:00:00+02:00'),
    genres: [
      'Electro',
      'DJs sets',
    ],
    artists: [
      'Collectif Munera',
      'Le Chaudron',
    ],
    description: (
      <>
        <p>
          Venez fêter les musiques électroniques en bord de Garonne !
        </p>
        <p>
          Le Collectif Munera et Le Chaudron mettent en scène la vaste palette sonore des musiques électroniques avec une programmation généreuse ouverte à un large public.
        </p>
        <p>
          Le temps d'une soirée, le Square Toussaint l'Ouverture est transformé en lieu majeur de la fête éco-responsable avec des actions culturelles et solidaires accompagnées de DJ sets d'artistes locaux, ambiance festive assurée !
        </p>
        <p>
          Buvette à petits prix (brasserie locale l'Effet Papillon)
        </p>
      </>
    ),
  },
  {
    id: '13',
    category: 'Centre ville',
    location: {
      name: 'Place Saint Projet',
    },
    startTime: new Date('2021-06-21T19:30:00+02:00'),
    endTime: new Date('2021-06-22T00:45:00+02:00'),
    genres: [
      'Rock',
      'Punk',
      'DJs sets',
    ],
    artists: [
      'The Pleasure Dome',
      'The Big Idea',
      'Pretty Inside',
      'WHYNOT',
    ],
    links: [
      'https://33.agendaculturel.fr/concert/bordeaux/the-pleasure-dome-the-big-idea-et-pretty-inside.html',
    ],
    description: (
      <>
        <p>
          WHYNOT présente
        </p>
        <p>
          FÊTE DE LA MUSIQUE - PLACE SAINT-PROJET
        </p>
        <p>
          Rendez-vous en plein centre-ville pour fêter le ROCK et nos 2 ans (déjà) ! Sensations fortes garanties avec une programmation LIVE des plus copieuses
        </p>
        <p>
          Programme :
          <ul>
            <li>
              20:00 : Pretty Inside (Garage Pop) [Bordeaux]
            </li>
            <li>
              21:15 : The Big Idea (Garage Rock) [La Rochelle]
            </li>
            <li>
              20:00 : The Pleasure Dome (Post Punk) [Bristol, UK]
            </li>
            <li>
              23:30 : DJ SET Whynot
            </li>
          </ul>
        </p>
        <p>
          AU BAR Bières fraîches + softs + food cooked by Deus Ex Machina
        </p>
      </>
    ),
  },
  {
    id: '14',
    name: 'L\'Astrodøme et Musique d\'Apéritif',
    category: 'Centre ville',
    location: {
      name: 'Place du Palais',
    },
    startTime: new Date('2021-06-21T19:30:00+02:00'),
    endTime: new Date('2021-06-22T01:00:00+02:00'),
    genres: [
      'Indie Rock',
      '80s',
      'Pop',
      'Rock Indie Garage',
      'Electro',
      'Electro New Beat',
      'DJs sets',
    ],
    artists: [
      'Sam Fleisch',
      'Michelle et Les Garçons',
      'Blvck Hippie',
      'Musique d\'Apéritif',
    ],
    description: (
      <p>
        Programme :
        <ul>
          <li>
            20:00 : Sam Fleisch (Indie Rock) [Bordeaux]
          </li>
          <li>
            21:15 : Michelle et Les Garçons (80s Pop) [Angers]
          </li>
          <li>
            22:15 : Blvck Hippie (Rock Indie Garage) [Memphis, USA]
          </li>
          <li>
            23:30 : Musique d'Apéritif (Electro New Beat) [Biarritz]
          </li>
        </ul>
      </p>
    ),
  },
  {
    id: '15',
    name: 'BACO MUSIC',
    category: 'Centre ville',
    location: {
      name: 'Place Fernand Lafargue',
    },
    startTime: new Date('2021-06-21T20:00:00+02:00'),
    endTime: new Date('2021-06-22T00:45:00+02:00'),
    genres: [
      'Reggae',
      'DJs sets',
      'Hip Hop',
    ],
    // artists: [
    //   'CLINTON FEARON',
    //   'VOLODIA',
    //   'PEET',
    //   'ALMÄ MANGO',
    //   'YARD',
    //   'OSHI DI ORIGINAL',
    //   'DJ Nels',
    //   'DJ KASH',
    // ],
    description: (
      <>
        <p>
          Depuis 12 ans, BACO MUSIC développe ses activités dans le monde de la musique. Label, organisateur de tournées internationales, studio, distributeur, éditeur...
        </p>
        <p>
          De notoriété internationale aujourd’hui, la structure bordelaise travaille à 360° avec ses artistes, défendant des projets forts et indépendants. Pour la seconde fois, la programmation de la scène installée Place Fernand Lafargue sera gérée par BACO MUSIC, qui a vu les choses en grand avec du reggae et du hip-hop au menu !
        </p>
        <p>
          Côté reggae, la soirée débutera avec le mythique CLINTON FEARON pour un concert guitare-voix intimiste et chaleureux, suivi de VOLODIA, représentant incontournable du reggae français.
        </p>
        <p>
          Se succéderont ensuite sur scène plusieurs artistes hip-hop qui feront grimper la température ! PEET, nouveau rappeur de la scène belge dans la lignée de Roméo Elvis avec son DJ Morgan, la rappeuse ALMÄ MANGO et ses tout nouveaux freestyles brûlants, le projet YARD propulsé par le duo de feu CHEEKO & VOLODIA et enfin l'artiste bordelais YOSHI DI ORIGINAL avec DJ Nels pour achever de faire exploser le thermomètre !
        </p>
        <p>
          Le tout backé par DJ KASH qui ne laissera aucun répit à la soirée avec ses mixs de dernières pépites et de big tunes reggae/hip-hop.
        </p>
      </>
    ),
  },
  {
    id: '16',
    name: 'Musique de chambre avec Molto Assaï',
    category: 'Rive droite',
    location: {
      name: 'Archive de Bordeaux Métrpole',
      addressStr: 'Parvis des Archives, 33100 Bordeaux',
    },
    startTime: new Date('2021-06-21T20:00:00+02:00'),
    endTime: new Date('2021-06-21T20:45:00+02:00'),
    artists: [
      'Molto Assaï',
    ],
    description: (
      <>
        <p>
          C'est dans le cadre paysager de leur parvis que les Archives de Bordeaux Métropole vous invitent à célébrer la musique. À l'ombre de la canopée, les musiciens de l'orchestre Molto Assaï en petite formation offrent un concert de musique de chambre, une musique vivante perpétuant la pratique d'un répertoire et d'instruments de plusieurs siècles.
        </p>
        <p>
          Fondé en 1983, Molto Assaï est composé en majorité de musiciens amateurs, de tous âges et de tous niveaux. L'association en plein essor depuis 2006 est passée d'un ensemble orchestral à un orchestre symphonique en 2011. Elle propose un large répertoire, de la musique baroque à la musique contemporaine.
        </p>
        <p>
          <a
            href="https://www.moltoassai.fr/"
            target="_blank"
            rel="noopener noreferrer"
          >
            www.moltoassai.fr
          </a>
        </p>
      </>
    ),
  },
  {
    id: '17',
    name: 'Pool party à la Piscine Judaïque',
    category: 'Centre ville',
    location: {
      name: 'Piscine Judaïque',
      addressStr: '164 Rue Judaïque, 33000 Bordeaux',
    },
    price: 'Tarif d\'une entrée piscine',
    startTime: new Date('2021-06-21T16:30:00+02:00'),
    description: (
      <>
        <p>
          La piscine Piscine Judaïque - Jean Boiteux fête la musique lors de sa nocturne le jeudi 22 juin et organise une pool party.
        </p>
        <p>
          Le bassin de 50m sera divisé en 2, une partie pour les nageurs (25m) et une partie pour de l'animation aquagym, jeux avec présence d'un DJ toute la soirée.
        </p>
      </>
    ),
  },
];
