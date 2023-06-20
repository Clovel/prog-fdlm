/* Type imports ---------------------------------------- */
import { InstagramEmbed } from 'react-social-media-embed';
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
    endTime: new Date('2021-06-22T23:00:00+02:00'),
    category: 'Bassins à flot',
    location: {
      name: 'Le Garage Moderne',
      addressStr: '1 Rue Des Étrangers, Bordeaux',
    },
    links: [
      {
        url: 'https://www.facebook.com/events/3352549631680018/',
        label: 'Évènement Facebook',
      },
      {
        url: 'https://33.agendaculturel.fr/concert/bordeaux/la-fete-de-la-musique-au-garage-moderne.html',
        label: "Page de l'Agenda Culturel",
      },
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
    links: [
      {
        url: 'https://www.musba-bordeaux.fr/fr/evenement/bulle-musicale-visite-en-musique-pour-les-tout-petits',
        label: "Site de l'évènement du Musée des Beaux-Arts",
      },
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
    name: 'TPLT x SUPER Daronne',
    location: {
      name: 'Cours Mably',
      addressStr: 'Cours Mably, Bordeaux',
    },
    startTime: new Date('2021-06-21T19:00:00+02:00'),
    endTime: new Date('2021-06-22T00:00:00+02:00'),
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
    category: 'Bassins à flot',
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
    links: [
      {
        url: 'https://www.facebook.com/events/700034108254556/',
        label: 'Événement Facebook',
      },
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
    category: 'St. Michel',
    location: {
      name: 'Square Dom Bedos',
      addressStr: 'Place Dom Bedos, Bordeaux',
    },
    name: 'La Relâche : Allez les Filles et Bordeaux Rock',
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
    endTime: new Date('2021-06-22T00:45:00+02:00'),
    genres: [
      'Dub',
      'Afro',
    ],
    links: [
      {
        url: 'https://www.facebook.com/events/580472714068128/',
        label: 'Événement Facebook',
      },
    ],
    description: (
      <>
        <p>
          Wandem Sound System, organisateur des réjouissantes soirées Bordeaux Dub School, installe sa sono artisanale sur les bords de Garonne pour une chaude soirée musicale aux accents jamaïcains.
        </p>
        <p>
          Avec leurs meilleurs vinyles, mais aussi des musiciens live, Wandem Sound System and Friends vous accueillent dans la meilleure ambiance pour une soirée hautement dansante.
        </p>
        <p>
          <b>
            Programme :
          </b>
          <ul>
            <li>
              19h-20h30 : WANDEM
            </li>
            <li>
              20h30-22h : KANDEE
            </li>
            <li>
              22h-Curfew : WANDEM
            </li>
          </ul>
        </p>
      </>
    ),
  },
  {
    id: '12',
    name: 'Collectif Munera x Le Chaudron',
    category: 'Rive droite',
    location: {
      name: 'Square Toussaint Louverture',
      addressStr: 'Quai de Queyries, 33100 Bordeaux',
    },
    startTime: new Date('2021-06-21T19:00:00+02:00'),
    endTime: new Date('2021-06-22T00:45:00+02:00'),
    genres: [
      'Electro',
      'Techno',
      'Hard Trance',
      'Hard Music',
      'Hard Techno',
      'Acidcore',
      'DJs sets',
    ],
    artists: [
      'Eczodia',
      'ASKM',
      'Foussy',
      'UTK',
      'Oakman x Kloss',
      'Apophis x Slender',
    ],
    links: [
      {
        url: 'https://www.instagram.com/p/CtHeXMKIPZT/',
        label: "Post Instagram de l'évènement",
      },
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
        <div
          className="mx-auto"
          style={{ maxWidth: 400 }}
        >
          <InstagramEmbed url="https://www.instagram.com/p/CtHeXMKIPZT/" />
        </div>
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
      {
        url: 'https://33.agendaculturel.fr/concert/bordeaux/the-pleasure-dome-the-big-idea-et-pretty-inside.html',
        label: "Page de l'Agenda Culturel",
      },
      {
        url: 'https://www.facebook.com/events/172221855794493/',
        label: 'Événement Facebook',
      },
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
    links: [
      {
        url: 'https://www.facebook.com/events/1307982516460693/',
        label: 'Évènement Facebook',
      },
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
    links: [
      {
        url: 'https://www.facebook.com/events/100204339755952/',
        label: 'Évènement Facebook',
      },
    ],
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
  {
    id: '18',
    name: "fanfare + La Tencha dj's",
    category: 'St. Michel',
    location: {
      name: 'La Tencha',
      addressStr: '22 Quai de la Monnaie, 33800 Bordeaux',
    },
    startTime: new Date('2021-06-21T18:00:00+02:00'),
    genres: [
      'Brass band',
      'Latino',
      'Afro-beat',
      'R&B',
      'Fanfare',
      'DJs sets',
    ],
    artists: [
      'Brigitte Bordo',
    ],
    links: [
      {
        url: 'https://www.facebook.com/events/641824917525846',
        label: 'Évènement Facebook',
      },
    ],
    description: (
      <>
        <p>
          La tencha propose pour fêter la musique, deux ambiance :
        </p>
        <p>
          A l'extérieur et à l'intérieur avec une fanfare et des Djs qui vous pour vous faire transpirer sur le dancefloor !
        </p>
        <p>
          Brigitte Bordo est une jeune fanfare aux mille facettes et aux mille paillettes, née en 2021 sur les bords de Garonne. Le répertoire, c'est un mélange de styles avec du brass band, latino, afro-beat, r&b, mais aussi des sons plus lourds pour finir les sets en beauté.
        </p>
      </>
    ),
  },
  {
    id: '19',
    category: 'Centre ville',
    name: "Amplitudes, Cmd+O & L'Orangeade",
    location: {
      name: 'Place Pey-Berland',
      addressStr: 'Place Pey-Berland, 33000 Bordeaux',
    },
    startTime: new Date('2021-06-21T20:00:00+02:00'),
    endTime: new Date('2021-06-22T00:45:00+02:00'),
    artists: [
      'Amplitudes',
      'Cmd+O',
      "L'Orangeade",
    ],
    links: [
      {
        url: 'https://www.facebook.com/events/289565500165487',
        label: 'Évènement Facebook',
      },
      {
        url: 'https://www.instagram.com/__amplitudes__/',
        label: 'Instagram d\'Amplitudes',
      },
      {
        url: 'https://www.instagram.com/collectif_cmdo/',
        label: 'Instagram de Cmd+O',
      },
      {
        url: 'https://www.instagram.com/lorangeademusic/',
        label: "Instagram de l'Orangeade",
      },
    ],
    description: (
      <>
        <p>
          On prends les mêmes et on recommence !
          <br />
          <b>
            Cette année, pas de frustration
          </b>
          , nous comptons bien faire vibrer la place Pey Berland une bonne partie de la nuit.
          <br />
          Le trio infernal, Amplitudes, Cmd+O et L’Orangeade, se reforme pour semer joie et BPM et ainsi fêter comme il se doit l’arrivée de l’été !
        </p>
        <br />
        <p>
          <b>
            ☀︎ AMPLITUDES ☀︎
          </b>
          <br />
          Véritable acteur de la scène culturelle bordelaise, Amplitudes multiplie les apparitions à travers des projets toujours plus ambitieux.Ses 3 DJs, issus d'univers musicaux différents proposent des sets éclectiques, pointus et avant-gardistes.
        </p>
        <p>
          <b>
            ☀︎ Cmd+O ☀︎
          </b>
          {' '}
          (à prononcer « Commando ») :
          <br />
          Architectes et scénographes le jour, ambianceurs de dancefloor la nuit, Cmd+O est un collectif plymophorme qui oeuvre pour le bien commun et la culture pour tous. Ici, ils réuniront la foule autour de sonorités afro, break, electronica !
        </p>
        <p>
          <b>
            ☀︎ L’Orangeade ☀︎
          </b>
          <br />
          Créateur d’événements pluriartistiques et collectif de DJs, les membres de L’Orangeade partagent leur amour de la musique et de la fête au travers de projets toujours différents et uniques, mais qui gardent un ADN commun : celui de créer un moment hors du temps où le collectif fait loi et l’union, la force.
        </p>
      </>
    ),
  },
  {
    id: '20',
    name: 'Avinavita',
    category: 'Rive droite',
    location: {
      name: 'La Guinguette chez Alriq',
      addressStr: 'Quai des Queyries, 33100 Bordeaux',
    },
    startTime: new Date('2021-06-21T20:00:00+02:00'),
    price: 'libre',
    genres: [
      'Italien',
      'Folk',
      'Traditionnel',
    ],
    artists: [
      'Avinavita',
    ],
    links: [
      {
        url: 'https://www.facebook.com/events/817708463169668',
        label: 'Évènement Facebook',
      },
      {
        url: 'mailto:resto@laguinguettechezalriq.com',
        label: 'Réservations par mail',
      },
    ],
    description: (
      <p>
        Naturellement inspiré par les chants et les musiques traditionnelles d’Italie du Sud, depuis 2019 Avinavita transmet à son tour et avec cœur cet héritage précieux qu’ils ont reçu. Des Tarentelles Calabraises au Pizzica Pizzica des Pouilles ou autre Tammurriata Napolitaine, Avinavita nous entraîne dans une fête colorée, populaire et chaleureuse qui nous rappelle que la danse fait totalement partie des traditions. Les chants, le tamburello, la guitare battente, l’accordéon et la mandoline donnent au répertoire d’Avinavita ses harmonies originales, portées par une généreuse rythmique au souffle rock et au groove chaloupé qui transcendent les mélodies.
        Le groupe continue sa route pour les terres chaudes du Sud
      </p>
    ),
  },
  {
    id: '21',
    category: 'Centre ville',
    location: {
      name: 'The Grizzly Pub',
      addressStr: '12 place de la Victoire, 33000 Bordeaux',
    },
    startTime: new Date('2021-06-21T21:30:00+02:00'),
    endTime: new Date('2021-06-22T04:00:00+02:00'),
    description: (
      <>
        <p>
          A 21h30 : Concert Soledad & La Tropical
        </p>
        <p>
          A 22h : DJ Set
        </p>
        <p>
          Grizzly ouvert
          {' '}
          <b>
            jusqu'à 4H
          </b>
          {' '}
          !
        </p>
      </>
    ),
  },
  {
    id: '22',
    name: "L'After de la Fête de la Musique - IBOAT",
    category: 'Bassins à flot',
    location: {
      name: 'IBOAT',
      addressStr: 'Bassin à Flot n°, 1 Cr Henri Brunet, 33300 Bordeaux',
    },
    startTime: new Date('2021-06-22T00:00:00+02:00'),
    endTime: new Date('2021-06-22T06:00:00+02:00'),
    price: '🚨 ENTRÉE GRATUITE TOUTE LA NUIT 🚨',
    artists: [
      'Distill',
      'Les Viatiques',
      'Amour Social Club',
      'BRUIT ROSE',
      'Godsoul Records',
      'MATES',
      'Club Nuggets',
      'SUPER Daronne',
      '③⑥①⑤𝘽𝙀𝘽𝙊𝙋',
      'Gimme Sound',
      'IBOAT Soundsystem',
    ],
    links: [
      {
        url: 'https://www.instagram.com/p/CtqgK7vg20P/',
        label: 'Post Instagram',
      },
      {
        url: 'https://www.facebook.com/events/997546514918479',
        label: 'Évènement Facebook',
      },
    ],
    description: (
      <>
        <p>
          <b>
            AFTER FÊTE DE LA MUSIQUE 🌈
          </b>
        </p>
        <p>
          Festivités terminées sur tous les spots de la ville ne signe pas la fin de la fête : on vous donne rendez-vous au club pour un after fête de la musique que vous n’êtes pas prêt·es d’oublier !
        </p>
        <p>
          On prend parmis les collectifs les plus bouillants de la régions et on célèbre ensemble la musique jusqu’au petit matin.
        </p>
        <div
          className="mx-auto"
          style={{ maxWidth: 400 }}
        >
          <InstagramEmbed
            url="https://www.instagram.com/p/CtqgK7vg20P/"
          />
        </div>
      </>
    ),
  },
  {
    id: '23',
    name: 'Open Air "YEGO Music"',
    category: 'Pessac',
    location: {
      name: 'Doyen Brus',
      addressStr: '1 rue Leo Lagrange, 33600 Pessac',
    },
    startTime: new Date('2021-06-21T19:00:00+02:00'),
    endTime: new Date('2021-06-22T02:00:00+02:00'),
    genres: [
      'Deep House',
      'Techno',
      'Minimal',
      'Trance',
    ],
    links: [
      {
        url: 'https://www.facebook.com/events/805838050755249',
        label: 'Évènement Facebook',
      },
      {
        url: 'https://www.facebook.com/yegomusic',
        label: 'Page Facebook de YEGO Music',
      },
    ],
    description: (
      <p>
        Solstice d'été? Musique? Open air?
        <br />
        Oui oui oui! Après ces quelques années d'absence, nous revenons sur nos terres pour vous programmer un Open air digne de ce nom pour la fête de la musique!
        <br />
        Au programme, 7h de son, de la Deep House, techno, minimal à la trance, il y en aura pour tous les goûts!
      </p>
    ),
  },
  {
    id: '24',
    name: 'Fête de la musique au MusBA !',
    category: 'Centre ville',
    location: {
      name: 'Musée des Beaux-Arts',
      addressStr: '20 cours d\'Albret, 33000 Bordeaux',
    },
    startTime: new Date('2021-06-21T19:00:00+02:00'),
    endTime: new Date('2021-06-21T21:30:00+02:00'),
    price: 'Gratuit',
    links: [
      {
        url: 'https://www.facebook.com/events/927575951658914/',
        label: 'Évènement Facebook',
      },
    ],
    description: (
      <>
        <p>
          📍 Rendez-vous dans le Hall-Bonheur du musée
        </p>
        <p>
          🎶 Deux sets de 40min à 19h et 19h45
        </p>
        <p>
          La musique a inspiré de nombreux peintres et la peinture a inspiré beaucoup de compositeurs.
          À l’occasion de cette fête populaire, le musée des Beaux-Arts fait vibrer l’âme de ses visiteurs, en proposant pour la première fois un chœur Gospel.
        </p>
      </>
    ),
  },
  {
    id: '25',
    name: 'Magnitude 7 & friends',
    category: 'Centre ville',
    location: {
      name: 'Place de la République',
      addressStr: 'Place de la République, 33000 Bordeaux',
    },
    startTime: new Date('2021-06-21T14:00:00+02:00'),
    endTime: new Date('2021-06-22T00:00:00+02:00'),
    price: 'Gratuit',
    genres: [
      'Reggae',
      'Dub',
      'House',
      'Breaks',
      'Techno',
      'Rap',
    ],
    links: [
      {
        url: 'https://www.facebook.com/events/998299344937417/',
        label: 'Évènement Facebook',
      },
    ],
    description: (
      <>
        <p>
          Guess what ? Magnitude 7 vous dévoile son événement pour la Fête de la Musique 2023 et vous propose de danser le + longtemps possible pour le jour le + long de l’année ! ☀
        </p>
        <p>
          Préparez vous à gravir des contrées sonores toutes plus surprenantes les unes que les autres avec un line up méli-mélove de copain.es !
        </p>
        <p>
          <b>
            🌼🌼🌼🌼 LINE UP 🌼🌼🌼🌼
          </b>
          <ul>
            <li>
              BOBBI WATSON
            </li>
            <li>
              OSKO
            </li>
            <li>
              PIACONCEPT
            </li>
            <li>
              FLOUF
            </li>
            <li>
              KAYA NATURAL
            </li>
            <li>
              KEEN OWL & ACETONE FLASK
            </li>
            <li>
              UZLY HI-FI & MC GUMP (live)
            </li>
            <li>
              LÜMA-G
            </li>
            <li>
              FANTOMATIKKK
            </li>
            <li>
              MATHILDE XO (live)
            </li>
            <li>
              SDS (live)
            </li>
            <li>
              ZAD
            </li>
          </ul>
        </p>
        <p>
          Entre reggae, dub, house, breaks, techno, rap et autres surprises sonores, le programme musical s’annonce bien lourd et sera sonorisé par l’incroyable sono toujours bien réglée du Uzly Hi-Fi Sound System !! 💥
        </p>
        <p>
          🪶 La timetable vous sera communiquée très bientôt !
        </p>
      </>
    ),
  },
  {
    id: '26',
    name: 'Mates x Le Protocole Radio',
    category: 'Centre ville',
    location: {
      name: 'Crédit Municipal de Bordeaux',
      addressStr: '29 rue du Mirail, 33800 Bordeaux',
    },
    startTime: new Date('2021-06-21T19:00:00+02:00'),
    endTime: new Date('2021-06-22T01:00:00+02:00'),
    price: 'Gratuit, jauge 300 personnes',
    links: [
      {
        url: 'https://www.facebook.com/events/3570753023243432',
        label: 'Évènement Facebook',
      },
    ],
    description: (
      <>
        <p>
          Ayooo les loubards !!!
        </p>
        <p>
          Le 21 juin 2023, comme vous le savez, la musique résonne aux 4 coins du globe pour marquer le début de l’été. 🌤💦
        </p>
        <p>
          Pour ce grand jour, on s’associe avec Le Protocole Radio pour vous proposer un open air estival des plus solaires ! 😎
        </p>
        <p>
          L’équipe Le Protocole Radio et celle des Mates vous donnent rendez-vous dans le magnifique spot du Crédit Municipal. 🕺✨
        </p>
        <p>
          Timetable : TBA
        </p>
        <p>
          Système son : Bruit Rose Productions 🔊
        </p>
        <p>
          INFOS PRATIQUES
          <ul>
            <li>
              📍 29 rue du mirail
            </li>
            <li>
              🕘 18h - 01h
            </li>
            <li>
              💸 Entrée gratuite
            </li>
            <li>
              👽 Jauge limitée à 300 pers (viens tôt)
            </li>
            <li>
              🥳 Prix doux au bar (bière et club-mate)

            </li>
          </ul>
        </p>
      </>
    ),
  },
  {
    id: '27',
    name: 'Zéro Degré',
    category: 'Bordeaux Ouest',
    location: {
      name: 'Jardin de la Béchade',
      addressStr: 'Rue de la Béchade, 33000 Bordeaux',
    },
    startTime: new Date('2021-06-21T14:00:00+02:00'),
    endTime: new Date('2021-06-21T19:00:00+02:00'),
    genres: [
      'Hip-hop',
      'Rap',
      'Rock',
      'Danse',
      'Scène ouverte',
    ],
    links: [
      {
        url: 'https://www.bordeaux.fr/ebx/agendaGeneral/pgFicheEvt.psml?_nfpb=true&_pageLabel=pgFicheEvt&classofcontent=evenement&id=212601',
        label: 'Évènement dans l\'agenda bordeaux.fr',
      },
      {
        url: 'mailto:zerodegrecontact@gmail.com',
        label: 'Courriel',
      },
      {
        url: 'https://www.facebook.com/zerodegre33',
        label: 'Page Facebook de Zéro Degré',
      },
      {
        url: 'instagram.com/zerodegre_',
        label: 'Page Instagram de Zéro Degré',
      },
    ],
    description: (
      <>
        <p>
          Slam, rap et musiques urbaines sont mis à l'honneur au Jardin de la Béchade avec le label associatif Zéro Degré, pour un après-midi festif et poétique.
        </p>
        <p>
          Au programme, une variété d'artistes, mêlant amateur·rices et professionnel·les, musique et danse, avec notamment une prestation artistique avec Wanda, Nathan et Charles 3 multi-instrumentistes, Nino et Tina 2 danseureuses hip-hop, suivi d'un concert inédit avec les rappeurs Sticky, Gat et Yamä du label Zéro Degré. Enfin, le groupe de Rock/Rap Valjean proposera un spectacle explosif et dansant pour clôturer cet après-midi musical !
        </p>
        <p>
          Toute la journée, une bibliothèque ambulante, du projet Bibliambule, offrira à toutes et tous un coin de calme et de détente consacré à la lecture.
        </p>
        <p>
          Pour participer à la scène ouverte, merci d'envoyer les informations suivantes au 07 89 42 99 77 :
          <ul>
            <li>
              Nom et Pseudo
            </li>
            <li>
              Téléphone
            </li>
            <li>
              Domaine artistique
            </li>
            <li>
              Durée de passage
            </li>
            <li>
              Besoins techniques
            </li>
          </ul>
        </p>
      </>
    ),
  },
  {
    id: '28',
    name: 'Festival 33 Tour',
    category: 'Bordeaux Ouest',
    location: {
      name: 'Parc Bordelais',
      addressStr: 'Rue du Bocage, 33200 Bordeaux',
    },
    startTime: new Date('2021-06-21T15:00:00+02:00'),
    genres: [
      'Pop Idéaliste',
      'Atelier d\'éveil musical',
      'Reggae roots',
    ],
    links: [
      {
        url: 'https://www.facebook.com/events/s/festival-33-tour-fete-de-la-mu/160508380322766/',
        label: 'Évènement Facebook',
      },
      {
        url: 'https://www.bordeaux.fr/ebx/agendaGeneral/pgFicheEvt.psml?_nfpb=true&_pageLabel=pgFicheEvt&classofcontent=evenement&id=212655',
        label: 'Évènement dans l\'agenda bordeaux.fr',
      },
    ],
    description: (
      <>
        <p>
          La Cassette et Wow, prennent leurs quartiers d'été à Caudéran et proposent une série de concerts et d'ateliers musicaux pour toutes et tous dans le cadre bucolique du Parc Bordelais.
        </p>
        <p>
          La Cassette et Wow, prennent leurs quartiers d'été à Caudéran et proposent une série de concerts et d'ateliers musicaux pour toutes et tous dans le cadre bucolique du Parc Bordelais. Au programme également, avec les équipes de la bibliothèque Pierre Veilletet, du festival 33Tours et de l'incontournable Bibliobus, blindtests, démonstrations d'instruments, lectures musicales et boom familiale !
        </p>
        <p>
          Au programme également, avec les équipes de la bibliothèque Pierre Veilletet, du festival 33Tours et de Bibliobus, blindtests, démonstrations d'instruments...
          <ul>
            <li>
              15h - concert de FKEUR OFWOOD (Pop Idéaliste)
            </li>
            <li>
              16h30 - atelier d'éveil musical avec Daisy Turner
            </li>
            <li>
              17h30 - concert de MASSA (reggae roots)
            </li>
          </ul>
        </p>
      </>
    ),
  },
  {
    id: '29',
    name: 'Fête de la musique pour les cool kids',
    category: 'Bassins à flot',
    location: {
      name: 'Blonde Vénus',
      addressStr: 'Bassin à flot n°1 - Esplanade du Pertuis, 33300 Bordeaux',
    },
    startTime: new Date('2021-06-21T18:00:00+02:00'),
    genres: [
      'Ludique',
      'Jeux',
      'Enfants',
      'Atelier',
    ],
    links: [
      {
        url: 'https://www.facebook.com/events/217598244465440',
        label: 'Évènement Facebook',
      },
    ],
    description: (
      <>
        <p>
          <b>
            POUR VOUS LES FAMILLES
          </b>
        </p>
        <p>
          Blonde Venus fête la musique pour les cool kids
        </p>
        <p>
          C'est éloigné de l'agitation du centre ville que l'équipe de Blonde Venus vous donne rendez-vous pour une joyeuse fête de la musique dédiée à 100x aux cool kids 🤸‍♀️
        </p>
        <p>
          En entrée libre toute la soirée dès 18h, venez profiter d'une festive fin de journée avec au programme ateliers jouets, ateliers DIY, stands paillettes, jeux géants & autres surprises.
          <br />
          Et qui dit fête de la musique dit forcément ambiance et piste de danse ! Pour cette édition spéciale marmots, la troupe vous prépare une boum spéciale manga 🎶
        </p>
        <p>
          Alors venez danser, jouer, chanter, sauter partout. Mercredi 21 juin c'est en famille aux Bassins à flot que ça se passe !
        </p>
        <p>
          <b>
            POUR VOUS RESTAURER
          </b>
        </p>
        <p>
          La guinguette de Blonde Venus vous accueille à table sur sa jolie terrasse avec à la carte les meilleures persillades de Bordeaux : coquillages, crustacés, viandes, douceurs. Il y en a pour tous les goûts et croyez-nous, ça sent bon le soleil ☀️
        </p>
      </>
    ),
  },
  {
    id: '30',
    name: 'Les moules ont la frite',
    category: 'Bordeaux Ouest',
    location: {
      name: 'Parc de Lussy',
      addressStr: 'Avenue de Bel Air, 33200 Bordeaux',
    },
    startTime: new Date('2021-06-21T20:00:00+02:00'),
    genres: [
      'Banda',
    ],
    links: [
      {
        url: 'https://www.bordeaux.fr/ebx/agendaGeneral/pgFicheEvt.psml?_nfpb=true&_pageLabel=pgFicheEvt&classofcontent=evenement&id=212858',
        label: 'Évènement dans l\'agenda bordeaux.fr',
      },
      {
        url: 'https://www.facebook.com/acbj.barrierejudaique',
        label: 'Page Facebook de l`\'association des commerçants de la Barrière Judaïque',
      },
    ],
    description: (
      <>
        <p>
          L'association des commerçants de la Barrière Judaïque, avec la participation de l'association Caudéran Ensemble, vous invitent à la Fête de la musique 2023 : Les moules ont la frite !
        </p>
        <p>
          <ul>
            <li>
              Concert de la Banda d'Ornon et musiciens amateurs
            </li>
            <li>
              Portion de moules / frites : 12 euros sur place le jour même.
            </li>
          </ul>
        </p>
      </>
    ),
  },
  {
    id: '31',
    name: 'Furieuse Fête de la musique',
    category: 'St. Michel',
    location: {
      name: 'Les Furies Bergères',
      addressStr: '54 rue Camille Sauvageau, 33800 Bordeaux',
    },
    startTime: new Date('2021-06-21T17:00:00+02:00'),
    endTime: new Date('2021-06-22T02:00:00+02:00'),
    genres: [
      'Black Noise',
      'Black Power Violence',
      'Postmetal Noise Ambiant',
    ],
    links: [
      {
        url: 'https://www.facebook.com/events/797942495341298/',
        label: 'Évènement Facebook',
      },
    ],
    artists: [
      'OTDHR',
      'Fièvres',
      'Renaïders',
    ],
    description: (
      <>
        <p>
          Concerts dans la rue Camille Sauvageau, suivis d’une belle sélecta pour finir la soirée en continuant de danser… !
        </p>
        <p>
          Ouverture du bar à 17h, début des concerts 20h30.
        </p>
      </>
    ),
  },
  {
    id: '32',
    name: 'La Manufacture X Carton Plein',
    category: 'Centre ville',
    location: {
      name: 'La Manufacture',
      addressStr: '30 rue Bouquière, 33000 Bordeaux',
    },
    startTime: new Date('2021-06-21T18:00:00+02:00'),
    endTime: new Date('2021-06-22T02:00:00+02:00'),
    genres: [
      'DJs sets',
    ],
    artists: [
      'HEKTOR',
      'BASHIR',
      'RIDOO',
      'COFFIZ',
      'WAN LOVE',
      'ZUMZUM',
    ],
    links: [
      {
        url: 'https://www.facebook.com/events/256447910402469/',
        label: 'Évènement Facebook',
      },
    ],
    description: (
      <>
        <p>
          La Manufacture vous invite à voyager avec elle en invitant de nombreux artistes à bord ! 📢
        </p>
        <p>
          Prêts pour le grand départ cosmique ? 🚀
        </p>
        <p>
          À vos lunettes de vitesses et protections en tout genres on vous attends nombreux(ses) ! 😎🎶❤️
        </p>
      </>
    ),
  },
  {
    id: '33',
    category: 'Centre ville',
    location: {
      name: 'Place des Basques',
      addressStr: 'Place des Basques, 33000 Bordeaux',
    },
    startTime: new Date('2021-06-21T17:00:00+02:00'),
    endTime: new Date('2021-06-22T00:30:00+02:00'),
    genres: [
      'Banda',
      'Traditionnel',
      'Basque',
      'Fanfare',
    ],
    links: [
      {
        url: 'https://www.facebook.com/events/158712387186521/',
        label: 'Évènement Facebook',
      },
      {
        url: 'https://www.instagram.com/p/Ctth8ifqaOV',
        label: 'Post Instagram',
      },
      {
        url: 'https://www.facebook.com/TOPAcomptoirbasque',
        label: 'Page Facebook de TOPA',
      },
    ],
    description: (
      <>
        <p>
          🥳 Rejoignez-nous pour une soirée inoubliable de la Fête de la Musique avec la
          {' '}
          <a
            href="https://www.instagram.com/maisonbasquedebordeaux/"
            target="_blank"
            rel="noopener noreferrer"
          >
            @maisonbasquedebordeaux !
          </a>
        </p>
        <p>
          Pour la fête de la musique cette année, la Maison Basque de Bordeaux vous a mijoté une programmation aux petits oignons ! On commence tout doux (lasai) l’apéro au son des chants traditionnels basques de Kantuz, avant de basculer cash dans le groove de la Nouvelle Orléans avec la fanfare funky de Pampelune, le Broken Brothers Brass Band ! Enfin les plus motivés pourront continuer à guincher au son des platines de PIRATE JUS D’ORANGE, habitué à balancer du gordo gordo !
        </p>
        <p>
          🎶 Célébrez la musique, la joie et la convivialité dans un cadre authentiquement basque.
        </p>
        <ul>
          <li>
            Ouverture des portes 17h.
          </li>
          <li>
            Début des concerts 18h30.
          </li>
        </ul>
        <p>
          🎷Au programme de la soirée :
          <ul>
            <li>
              18h30-20h Kantuz (chants traditionnels basques)
            </li>
            <li>
              20h-22h BROKEN BROTHERS BRASS BAND (fanfare funk NOLA)
            </li>
            <li>
              22h-00h Pirate Jus d’Orange (SELECTA)
            </li>
            <li>
              0h30 fermeture des portes
            </li>
          </ul>
        </p>
        <p>
          Vous aurez la possibilité de découvrir ou (re)découvrir les saveurs basques avec des Taloas, de la charcuterie/fromage ou encore des desserts...
        </p>
        <div
          className="mx-auto"
          style={{ maxWidth: 400 }}
        >
          <InstagramEmbed url="https://www.instagram.com/p/Ctth8ifqaOV" />
        </div>
      </>
    ),
  },
  {
    id: '34',
    category: 'Chartrons',
    name: 'CHRONOLOGIC',
    location: {
      name: 'La Cabane Cent Un',
      addressStr: '7 rue Rode, Bordeaux',
    },
    startTime: new Date('2021-06-21T18:00:00+02:00'),
    genres: [
      'Old school',
      'DJs sets',
    ],
    links: [
      {
        url: 'https://www.facebook.com/events/632595558900461/',
        label: 'Évènement Facebook',
      },
    ],
    description: (
      <>
        <p>
          Une soirée avec un DJ set pour la fête de la musique, ça vous dit ? 🥳
        </p>
        <p>
          Préparez-vous car la cabane 101 vous donne rendez-vous le Mercredi 21 juin pour célébrer la fête de la musique ! 🎶
        </p>
        <p>
          Vous serez propulser à travers les rythmes les plus gigotants des dernières décennies.
        </p>
        <p>
          50’s › 60’s › 70’s › 80’s › 90’s › 00’s › 10’s. Distillées dans l’ordre CHRONOLOGIC.
        </p>
        <p>
          Une soirée où Elvis Presley rencontre Michael Jackson, où Ray Charles tape un high five à Freddie Mercury et les Beatles twistent avec Beyoncé.
        </p>
        <p>
          Puis… Quoi de mieux que de grignoter en même temps que de faire la fête ?
          Huîtres, croques à la truffe, planches apéritives feront parties de nos convives !
          Tout en comptant sur la présence des bières, des vins, de la sangria et puis qui dit party, dit shooters !
          <b>
            Toute la soirée, le shooter sera à 2€ !
          </b>
        </p>
      </>
    ),
  },
  {
    id: '35',
    category: 'Rive droite',
    name: 'Concert et dégustation food & wine',
    location: {
      name: 'Delicatessen',
      addressStr: '36 rue de la Benauge, Bordeaux',
    },
    startTime: new Date('2021-06-21T19:00:00+02:00'),
    price: 33.00,
    genres: [
      'Jazz',
      'Blues',
      'Bossa',
      'Soul',
    ],
    links: [
      {
        url: 'https://sauvignonnes.com/produit/fete-de-la-musique/',
        label: 'Billetterie',
      },
      {
        url: 'https://www.facebook.com/events/758936895979415/',
        label: 'Évènement Facebook',
      },
    ],
    description: (
      <>
        <p>
          A l’occasion de la fête de la musique, @delicatessen.bdx et @sauvignonnes vous proposent la soirée de tous les accords, le 21/06 :
        </p>
        <p>
          <ul>
            <li>
              ✅ Concert
            </li>
            <li>
              ✅ Food
            </li>
            <li>
              ✅ Wine
            </li>
          </ul>
        </p>
        <p>
          Une parenthèse conviviale, gastronomique et musicale, avec la participation de Marielle Gazelle, interprète du multiples artistes, d’influence Jazz, blues, bossa, soul
        </p>
      </>
    ),
  },
  {
    id: '36',
    category: 'Centre ville',
    location: {
      name: 'Place Général Sarrail',
      addressStr: 'Place Général Sarrail, Bordeaux',
    },
    startTime: new Date('2021-06-21T18:00:00+02:00'),
    genres: [
      'Tropical',
      'Soul',
      'Blues Rock',
      'Funk',
      'Disco',
      'DJs sets',
    ],
    artists: [
      'The Lifters',
      'Dr Funktastic',
      'DJ Beefy',
    ],
    links: [
      {
        url: 'https://www.facebook.com/events/969986387477452/',
        label: 'Évènement Facebook',
      },
    ],
    description: (
      <>
        <p>
          La Fête de la Musique revient cette année à la Place Général Sarrail pour une soirée tropicale et dansante ! 🍍🌺
          Deux groupes et un DJ set pour vous ambiancer jusqu'au bout de la nuit.🦩
        </p>
        <p>
          Venez célébrer la musique dans un cadre ensoleillé et fleuri sur la place Général Sarrail le soir du 21 juin 2023 ! Plongez-vous dans une atmosphère exotique et laissez-vous emporter par les rythmes envoûtants du funk et du blues ! 🥥
        </p>
        <p>
          <b>
            🌴 Au programme 🌴
          </b>
          <br />
          On lance la soirée avec The Lifters (Soul / Blues Rock) à partir de 18h30; suivi de Dr Funktastic (Funk / Groove), pour finir sur une note Disco avec DJ Beefy ! 🍉
        </p>
        <p>
          Brooklyn Brewery seront présent au HMS Victory pour un Show Moléculaire - une animation inédite autour de l'IPA 🍺
        </p>
      </>
    ),
  },
  {
    id: '37',
    category: 'St. Genès',
    name: '•BASS RELOAD•',
    location: {
      name: 'Zig Zag Café',
      addressStr: "73 cours de l'Argonne, Bordeaux",
    },
    startTime: new Date('2021-06-21T20:00:00+02:00'),
    endTime: new Date('2021-06-22T04:00:00+02:00'),
    genres: [
      'Drum & Bass',
      'Dubstep',
      'Techno',
      'Disco-house',
      'Tech-house',
      'Minimal',
    ],
    links: [
      {
        url: 'https://www.facebook.com/events/1675554266283840/',
        label: 'Évènement Facebook',
      },
      {
        url: 'https://instagram.com/bluxhao.ttt?igshid=MzRlODBiNWFlZA==',
        label: 'Instagram de BLUXHAO [TATTOO]',
      },
    ],
    description: (
      <>
        <p>
          Cette année avec Bass Reload Bordeaux on vous donne rendez-vous au ZigZag Café pour la fête de la musique et nous aurons comme invité le collectif Sound Rising ! 🔥
        </p>
        <p>
          <b>
            Au programme 2 Dancefloors :
          </b>
          <ul>
            <li>
              Le rez de chaussée avec une ambiance Bass house, Drum'n'bass, Techno et Dubstep.
            </li>
            <li>
              L'étage où vous trouverez une ambiance plus chill avec des dj set Disco-house, Tech-house et Minimal.
            </li>
          </ul>
          Mais il y aura aussi un espace TATTOO,et nous aurons le plaisir d'avoir BLUXHAO avec nous, venez découvrir ses talents de tatoueuse et pourquoi pas vous faire un petit tattoo. 😈
        </p>
        <br />
        <br />
        <p>
          <b>
            ▬▬▬ LINE UP ▬▬▬
          </b>
          <br />
          <br />
          <i className="underline">
            ••• REZ DE CHAUSSÉE •••
          </i>
          <ul>
            <li>
              •LOW-K• DRUM'N'BASS [Sound Rising]
            </li>
            <li>
              •MAEL CRESTIA B2B NORMAN• BASS-HOUSE [Sound Rising/Breakbeat Fury]
            </li>
            <li>
              •NEOFUNKERS• DRUM'N'BASS [SoundRising]
            </li>
            <li>
              •MILAA'Z• SPEED-HOUSE/TEKNO [Bass Reload]
            </li>
            <li>
              •NU:AM• DRUM'N'BASS [Bass Reload]
            </li>
            <li>
              •PHASMATICK• DUBSTEP [Bass Reload]
            </li>
            <li>
              •TØNE• TECHNO [Bass Reload]
            </li>
            <li>
              •SHEITAN• DRUM'N'BASS [Bass Reload]
            </li>
          </ul>
          <br />
          <i className="underline">
            ••• ÉTAGE ••• (Fermeture à 01h30)
          </i>
          <ul>
            <li>
              [DJ Set Disco-house/Tech-house/Minimal]
            </li>
            <li>
              •i-LONE• [Bass Reload]
            </li>
            <li>
              •W!LL• [Bass Reload]
            </li>
            <li>
              •MILAA'Z• [Bass Reload]
            </li>
          </ul>
        </p>
      </>
    ),
  },
  {
    id: '38',
    category: 'Centre ville',
    name: 'La Mascarade Fête la musique',
    location: {
      name: 'Rue Philippart, Bordeaux',
    },
    startTime: new Date('2021-06-21T20:00:00+02:00'),
    endTime: new Date('2021-06-22T02:00:00+02:00'),
    genres: [
      'House',
      'Tech-house',
      'Minimal',
    ],
    links: [
      {
        url: 'https://www.facebook.com/events/228238946651369/',
        label: 'Évènement Facebook',
      },
      {
        url: 'https://www.instagram.com/la.mascarade_',
        label: 'Instagram de La Mascarade',
      },
    ],
    description: (
      <>
        <p>
          Le collectif bordelais La Mascarade est enfin là pour enflammer les nuits de la ville !
        </p>
        <p>
          Composé d'une bande d'amoureux de la musique, ils vont vous faire voyager au rythme de la House, de la Tech House et de la Minimal.
        </p>
        <p>
          SOA, Grandraph, Ammar, Gamolka et Chiko sont des passionnés de musiques underground.
        </p>
        <p>
          Leur objectif est de faire vibrer les auditeurs présents lors de leurs events et de leur faire ressentir l'essence même de la musique électronique.
        </p>
        <p>
          <b>
            Line up :
          </b>
          <ul>
            <li>
              20h - 22h : Soa b2b Grandraph ( House minimal )
            </li>
            <li>
              22h - 23h : Gamolka ( House minimal )
            </li>
            <li>
              23h00 - 00h00 : Ammar ( indies-techno )
            </li>
            <li>
              00h00 - & Fun ??? : La mascarade set
            </li>
          </ul>
        </p>
      </>
    ),
  },
  {
    id: '39',
    category: 'Centre ville',
    location: {
      name: 'Claro Que Si',
      addressStr: '29 rue du Loup, 33000 Bordeaux',
    },
    startTime: new Date('2021-06-21T20:00:00+02:00'),
    description: (
      <>
        <p>
          Êtes-vous prêts ? 👹
        </p>
        <p>
          Ce mercredi 21 juin, venez danser avec nous !🕺🏽🪩
        </p>
        <p>
          SAVE THE DATE ! 💥
        </p>
      </>
    ),
  },
];
