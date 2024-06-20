/* Component imports ----------------------------------- */
import { Alert } from '@mui/material';
import { InstagramEmbed } from 'react-social-media-embed';
import CustomInstagramEmbed from 'components/CustomInstagramEmbed/CustomInstagramEmbed';

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';
import Image from 'next/image';

/* Events fixture -------------------------------------- */
export const events: Event[] = [
  {
    id: '41',
    category: 'St. Michel',
    name: `Allez les filles + L'astrodome + Bordeaux rock`,
    location: {
      name: 'Square Dom Bedos',
      addressStr: `rue Jacques d'Welles, Square Dom Bedos, 33800 Bordeaux`,
    },
    startTime: new Date('2024-06-21T19:00:00'),
    endTime: new Date('2024-06-22T00:45:00'),
    genres: [
      'Electro',
      'Rock',
      'Stoner rock',
      'Noise rock',
      'Punk rock',
      'Post punk',
      'Groove neo-soul',
    ],
    links: [
      {
        url: 'https://www.bordeaux.fr/e220331/allez-les-filles-l-astrodome-bordeaux-rock',
        label: 'Évènement dans l\'agenda bordeaux.fr',
      },
    ],
    artists: [
      'Nebula',
      'Siz',
      'Nastyjoe',
      'Yoko ? Oh No',
      'Chelabôm',
    ],
    description: (
      <>
        <p>
          Allez les Filles, Bordeaux Rock et l'Astrodøme joignent leurs forces pour vous faire vivre une soirée électrique et rock'n'roll !
        </p>
        <p>
          A l'affiche, 5 lives explosifs avec le stoner rock de Nebula, le noise rock de Siz, le post-punk tourmenté de Nastyjoe et le punk rock de Yoko ? Oh No ; et pour compléter cette programmation impeccable, une touche de groove néo-soul des irrésistibles Chelabôm !
        </p>
      </>
    ),
  },
  {
    id: '42',
    name: 'Chef & the gang + Madam',
    category: 'Centre ville',
    location: {
      name: 'Place de la Comédie',
      addressStr: 'Place de la Comédie, 33000 Bordeaux',
    },
    startTime: new Date('2024-06-21T20:00:00'),
    endTime: new Date('2024-06-21T23:30:00'),
    genres: [
      'Rock',
      'Heavy rock',
    ],
    artists: [
      'Chef & the gang',
      'Madam',
    ],
    links: [
      {
        url: 'https://www.bordeaux.fr/e220335/chef-the-gang-madam',
        label: 'Évènement dans l\'agenda bordeaux.fr',
      },
    ],
    description: (
      <>
        <p>
          Le Chef et son gang reviennent faire danser les Bordelaises et les Bordelais sur la Place de la Comédie avec une grande soirée rock dont eux seuls ont la recette !
        </p>
        <p>
          Cinquante ans de reprises endiablées pour un show de folie de ce groupe de toqués passionnés. À ne pas rater dès 20h, l'énergie décoiffante du power trio de rock heavy 100% féminin Madam.
        </p>
      </>
    ),
  },
  {
    id: '43',
    name: `Amplitudes + Bordeaux open air`,
    category: 'Centre ville',
    location: {
      name: 'Crédit Municipal',
      addressStr: '29 rue du Mirail, 33800 Bordeaux',
    },
    startTime: new Date('2024-06-21T19:00:00'),
    endTime: new Date('2024-06-22T00:45:00'),
    genres: [
      'Electro',
      'House',
      'Techno',
    ],
    links: [
      {
        url: 'https://www.bordeaux.fr/e220332/amplitudes-bordeaux-open-air',
        label: 'Évènement dans l\'agenda bordeaux.fr',
      },
    ],
    artists: [
      'Amplitudes',
      'Bordeaux Open Air',
    ],
    description: (
      <>
        <p>
          Les hyperactifs collectifs ambianceurs Amplitudes et Bordeaux Open Air, s'associent pour notre plus grand plaisir afin de fêter la Musique à leur sauce, électronique, fun et groovy !
        </p>
        <p>
          Rendez-vous dans la Cour du Crédit Municipal pour une soirée au pouls effréné ouverte à toutes et à tous ! Les DJs issus des deux collectifs se succèderont derrière les platines pour vous faire vibrer et transpirer !
        </p>
      </>
    ),
  },
  {
    id: '44',
    name: `𝟯𝟲𝟭𝟱𝘽𝙀𝘽𝙊𝙋 x MARÉE BASSE x TAPE x FRÛOR x VICE CITY`,
    category: 'Centre ville',
    location: {
      name: 'Place Fernand Lafargue',
      addressStr: 'Place Fernand Lafargue, 33000 Bordeaux',
    },
    startTime: new Date('2024-06-21T20:00:00'),
    endTime: new Date('2024-06-22T00:45:00'),
    genres: [
      'Electro',
      'House',
      'Techno',
    ],
    links: [
      {
        url: 'https://www.bordeaux.fr/e220333/3615-bebop-fruor-maree-basse-tape-vice-city',
        label: 'Évènement dans l\'agenda bordeaux.fr',
      },
      {
        url: 'https://www.instagram.com/p/C8M9APpqOfo/',
        label: 'Post Instagram',
      },
    ],
    artists: [
      '3615 Bebop',
      'Früor',
      'Marée Basse',
      'Tape',
      'Vice City',
    ],
    description: (
      <>
        <p>
          Sur la charmante Place Fernand Lafargue, le bouillonnant collectif 3615 Bebop et ses acolytes célèbrent le solstice d'été
        </p>
        <p>
          Le collectif 3615 Bebop et ses acolytes vous convient à une fête brûlante, chauffée par les DJ sets enlevés des collectifs électroniques Früor, Vice City, Tape et Marée Basse. Un bal estival 2.0 sous électrochoc, entre trance, breakbeats syncopés et techno festive !
        </p>
        <p>
          SOYEZ PRÊTS, ON VA TOUT PÉTER 😈
        </p>

        <p>
          📍 PLACE FERNAND LAFARGUE 20h - 01h :
          <span>
            🔊 SYSTÈME SON MARÉE BASSE
          </span>
        </p>

        <p>
          <b>
            👑 LINE UP
          </b>
          <ul>
            <li>
              {'20h > 21h LIONEL FANTOMES (PLACE FERNAND LAFARGUE)'}
            </li>
            <li>
              {'21h > 22h NØTŌ (3615 BEBOP)'}
            </li>
            <li>
              {'22h > 23h MARÉE BASSE'}
            </li>
            <li>
              {'23h > 00h FC KABAGAR (TAPE)'}
            </li>
            <li>
              {'00h > 01h P-A (𝟯𝟲𝟭𝟱𝘽𝙀𝘽𝙊𝙋)'}
            </li>
          </ul>
        </p>

        <CustomInstagramEmbed url="https://www.instagram.com/p/C8M9APpqOfo/" />
      </>
    ),
  },
  {
    id: '45',
    name: `𝟯𝟲𝟭𝟱𝘽𝙀𝘽𝙊𝙋 Event 2 : MARÉE BASSE x TAPE x FRÛOR x VICE CITY`,
    category: 'St. Michel',
    location: {
      name: 'Place Meynard',
      addressStr: 'Place Meynard, 33000 Bordeaux',
    },
    startTime: new Date('2024-06-21T20:00:00'),
    endTime: new Date('2024-06-22T00:45:00'),
    genres: [
      'Electro',
      'House',
      'Techno',
    ],
    links: [
      {
        url: 'https://www.bordeaux.fr/e220333/3615-bebop-fruor-maree-basse-tape-vice-city',
        label: 'Évènement dans l\'agenda bordeaux.fr',
      },
      {
        url: 'https://www.instagram.com/p/C8M9APpqOfo/',
        label: 'Post Instagram',
      },
    ],
    artists: [
      '3615 Bebop',
      'SUAVE x INSO.ENCE',
      'WAKE SYSTEM',
      'MARÉE BASSE',
      'DOUCEUR',
      'RAVN',
    ],
    description: (
      <>
        <p>
          📍 PLACE SAINT MICHEL 19h - 01h :
          <span>
            🔊 SYSTÈME SON MARÉE BASSE
          </span>
        </p>

        <p>
          <b>
            👑 LINE UP
          </b>
          <ul>
            <li>
              {'19h > 20h SUAVE X INSO.ENCE (TAPE)'}
            </li>
            <li>
              {'20h > 21h WAKE SYSTEM (MARSEILLE)'}
            </li>
            <li>
              {'21h > 22h MARÉE BASSE'}
            </li>
            <li>
              {'22h > 23h DOUCEUR (FRÜOR)'}
            </li>
            <li>
              {'23h > 00h DJ KOYLA (𝟯𝟲𝟭𝟱𝘽𝙀𝘽𝙊𝙋)'}
            </li>
            <li>
              {'00h > 01h RAVN (VICE CITY)'}
            </li>
          </ul>
        </p>

        <p>
          🍺 MAXI BUVETTE : PINTE 6€
        </p>

        <CustomInstagramEmbed url="https://www.instagram.com/p/C8M9APpqOfo/" />
      </>
    ),
  },
  {
    id: '46',
    name: `L'orangeade + Wild + CMD+O`,
    category: 'Centre ville',
    location: {
      name: 'Cours Mably',
      addressStr: 'Cours Mably, Bordeaux',
    },
    startTime: new Date('2024-06-21T19:00:00'),
    endTime: new Date('2024-06-22T00:45:00'),
    artists: [
      'L\'Orangeade',
      'Wild',
      'CMD+O',
    ],
    genres: [
      'Electro',
      'House',
      'Techno',
    ],
    description: (
      <p>
        Le jour le plus long de l'année sera groovy ou ne sera pas ! L'Orangeade, Wild et CMD+O transforment la Cour Mably en dancefloor joyeux et ensoleillé pour célébrer dignement la Fête de la Musique. Leur secret ? Des sets musicaux sans frontières, une passion pour les fêtes spectaculaires et l'envie suprême de mettre le public en transe. Indice 50 conseillé !
      </p>
    ),
  },
  {
    id: '47',
    name: 'Molto Assaï + William Theviot',
    category: 'Centre ville',
    location: {
      name: 'Archive de Bordeaux Métrpole',
      addressStr: 'Parvis des Archives, 33100 Bordeaux',
    },
    startTime: new Date('2024-06-21T19:00:00'),
    endTime: new Date('2024-06-21T22:00:00'),
    artists: [
      'Molto Assaï',
      'William Theviot',
    ],
    genres: [
      'Orchestral',
      'Musique de chambre',
      'Piano',
    ],
    description: (
      <>
        <p>
          Aux Archives de Bordeaux Métropole, l'orchestre Molto Assaï dont on célèbre les 40 ans cette année, offre un concert de musique de chambre, musique vivante et intime perpétuant une tradition et un répertoire riche de plusieurs siècles. Le pianiste William Theviot leur succédera, déployant sur son instrument toute la palette émotionnelle de son jeu.
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
    id: '48',
    name: `Collectif Munera + Le chaudron`,
    category: 'Rive droite',
    location: {
      name: 'Parc aux Angéliques',
      addressStr: 'Quai des Queyries, 33000 Bordeaux',
    },
    startTime: new Date('2024-06-21T19:00:00'),
    endTime: new Date('2024-06-22T00:45:00'),
    genres: [
      'Electro',
      'House',
      'Techno',
    ],
    artists: [
      'Collectif Munera',
      'Le Chaudron',
    ],
    description: (
      <>
        <p>
          <i>
            Les collectifs Munera et Le Chaudron mettent en scène, en son et en lumière, la culture électronique avec une programmation musicale qui s'adresse au plus grand nombre.
          </i>
        </p>
        <p>
          Le temps d'une soirée sur les berges de la Garonne, le Parc aux Angéliques se mue en lieu majeur de la fête éco-responsable et solidaire. Artistes locaux et ambiance festive assurée !
        </p>
      </>
    ),
  },
  {
    id: '49',
    name: 'Mascarade + Le Barrio Fino + Bien Public',
    category: 'Centre ville',
    location: {
      name: 'Bien Public',
      addressStr: 'Place Marie de Gournay, 33100 Bordeaux',
    },
    startTime: new Date('2024-06-21T19:00:00'),
    endTime: new Date('2024-06-22T00:45:00'),
    artists: [
      'DJ Vélos',
      'Stayup',
      'EmmaFleurs',
      'DJ Lexx & DJ Watrfall',
      'Mitxel',
      'Freakytón',
      'Les Meufs Mortelles',
    ],
    genres: [
      'DJ set',
      'Baile funk',
      'Cumbia',
      'Reggaeton',
      'Shatta',
      'Afro',
      'Latino',
      'Caribéen',
    ],
    description: (
      <>
        <p>
          <i>
            Vue sur la Garonne, fièvre tropicale et ambiance caliente au programme avec les associations Mascarade et le Barrio Fino, en complicité avec Bien Public.
          </i>
        </p>
        <p>
          Avec des DJ sets pimentés, baile funk, cumbia, reggaeton ou encore shatta, l'osmose s'annonce totale entre cultures Afro, Latino et Caribéennes avec DJ Vélos, Stayup, EmmaFleurs, DJ Lexx & DJ Watrfall, Mitxel, Freakytón, Les Meufs Mortelles.
        </p>
      </>
    ),
  },
  {
    id: '50',
    name: `Trafic + Bruit Rose + Super Daronne + Mates + Distill + Les Viatiques`,
    category: 'Centre ville',
    location: {
      name: 'Parc Bordelais',
      addressStr: 'Rue du Bocage, 33200 Bordeaux',
    },
    startTime: new Date('2024-06-21T19:00:00'),
    endTime: new Date('2024-06-22T00:45:00'),
    genres: [
      'Electro',
      'House',
      'Techno',
    ],
    artists: [
      'Trafic',
      'Bruit Rose',
      'Super Daronne',
      'Mates',
      'Distill',
      'Les Viatiques',
    ],
    price: 'Gratuit sur préventes',
    links: [
      {
        url: 'https://l.facebook.com/l.php?u=https%3A%2F%2Flink.dice.fm%2FO6152de7a2b0%3Ffbclid%3DIwZXh0bgNhZW0CMTAAAR1dfEoczpYGLVQ7B9I6HUBVkcO8dPmQ5R86UQM4o3_XIk9J8HYiwjrL9bM_aem_AcYM4cvkBPJD0pmH5ZgKJbSLt73rRf6Z0HHcyqDHmVQZkO2L73cxiauVBURTjxlGPQaxcLrZc4ZdZYUVVRQl1v38&h=AT0lKKxRDrW9J_9qjMUBCIPT5P_0gG86kHHKvkQDRwOTWwxPORVuZ7rk9oLgIWhCwZ2CnfmKHce4Ed2ZA6HZxEwBK09vwbJWzCutmsqnkPIBXXXtryFmz694lAvFUXOJg7z8HL5GXw&__tn__=q&c[0]=AT03lOjxYvbcDxg8N0lVHC0QJEFpPpnvFEfNfV02KvEiPkls8JKSJ3R3TWSJLQbvlCTIhL1c4P_WeLvtUgFiOuH47ciOctY1qVpILJSf0IWq7F96SioO5yhcxnE_Xws0DhW8i8HfB8kGZosTW44xobBQY8pPXI_SFdKGgwJ4HTHJ-GxaeE9G',
        label: 'Billetterie coupe file (DICE)',
      },
      {
        url: 'https://www.bordeaux.fr/e220461/trafic-bruit-rose-super-daronne-mates-distill-les-viatiques',
        label: 'Évènement dans l\'agenda bordeaux.fr',
      },
    ],
    description: (
      <>
        <p>
          <b>
            Trafic + Bruit Rose + Super Daronne + Mates + Distill + Les Viatiques
          </b>
        </p>
        <p>
          <i>
            Pour une grande et éblouissante fête électronique, rejoignez le célèbre Parc Bordelais et profitez d'une programmation plurielle qui invite une kyrielle d'artistes et de collectifs musicaux bien connus du public bordelais ! Trois espaces musicaux et des surprises en pagaille au son des DJs de Super Daronne, Mates, Distill, Les Viatiques et plus encore. Let's dance
          </i>
        </p>
        <br />
        <p>
          21 juin, fin d’après-midi : la chaussée s’amaigrit, le trafic pédestre se densifie, on ne brûle que d’une chose, trouver au large une bulle de nature et de verdure, où célébrer la musique sous les éclaircies d’un été à peine entamé.
        </p>
        <p>
          Mini-festival en maxi-collectivité, Bordeaux fête la musique électronique et l’effervescente scène locale : 12 collectifs s’aventurent à faire crépiter les 3 scènes installées pour cette grande occasion au Parc Bordelais.
        </p>
        <p>
          Biotope privilégié d’une fête innocente et spontanée, les corps sont invités à gigoter en aisance et liberté dans un environnement propice au laisser-aller de l’esprit.
        </p>
        <p>
          <b>
            Après ça : Direction l’IBOAT pour un Club de la Musique déjà mémorable ! Enfin pour les plus courageux : c'est à partir de 6h00 qu'il faudra rejoindre un all day long en open air bien costaud dans un lieu tenu secret jusqu'au dernier moment !
          </b>
        </p>
      </>
    ),
  },
  {
    id: '51',
    name: 'La Cité Bleue + Le Mégaphone + Le Garage Moderne',
    category: 'Bassins à flot',
    location: {
      name: 'La Cité Bleue',
      addressStr: '176 Rue Achard, 33300 Bordeaux',
    },
    startTime: new Date('2024-06-21T19:00:00'),
    endTime: new Date('2024-06-22T00:45:00'),
    links: [
      {
        url: 'https://www.bordeaux.fr/e220457/la-cite-bleue-le-megaphone-le-garage-moderne',
        label: 'Évènement dans l\'agenda bordeaux.fr',
      },
    ],
    artists: [
      'V-Gang',
      'So Flat',
      'Purple Square',
      'Touriste',
      'Brigade du Bonheur',
    ],
    genres: [
      'Pop',
      'Rock',
      'DJ set',
      'Electro',
    ],
    description: (
      <>
        <p>
          <i>
            La zone d'utilité la Cité Bleue vous accueille en complicité avec le Mégaphone et le Garage Moderne, pour une soirée conviviale et musicale concoctée sur mesure et en proximité.
          </i>
        </p>
        <p>
          Focus sur la scène locale avec les concerts pop et rock de V-Gang, So Flat et Purple Square, suivis d'un live du trio toulousain Touriste et des DJ sets rieurs de la Brigade du Bonheur.
        </p>
      </>
    ),
  },
  {
    id: '52',
    name: `Centre d'animation du grand parc + le petit parc`,
    category: 'Bordeaux Ouest',
    location: {
      name: `Parvis du centre d'animation du Grand Parc`,
      addressStr: '36 Rue Robert Schuman, 33300 Bordeaux',
    },
    startTime: new Date('2024-06-21T17:00:00'),
    endTime: new Date('2024-06-21T22:30:00'),
    genres: [
      'Ludique',
      'Jeux',
      'Enfants',
      'Atelier',
    ],
    links: [
      {
        url: 'https://www.bordeaux.fr/e220330/fete-de-la-musique-2024-a-bordeaux',
        label: 'Évènement dans l\'agenda bordeaux.fr',
      },
    ],
    description: (
      <p>
        Concert et ateliers musicaux autour des pratiques amateurs du quartier et de l'école de musique du Centre d'animation du Grand Parc.
      </p>
    ),
  },
  {
    id: '53',
    name: 'Le vivier + Galerie pôle magnetic',
    category: 'Chartrons',
    location: {
      name: 'Place Paul et Jean-Paul Avisseau',
      addressStr: 'Place Paul et Jean-Paul Avisseau, 33300 Bordeaux',
    },
    startTime: new Date('2024-06-21T16:00:00'),
    endTime: new Date('2024-06-22T00:30:00'),
    links: [
      {
        url: 'https://www.bordeaux.fr/e220340/fete-de-la-musique-2024-a-bordeaux',
        label: 'Évènement dans l\'agenda bordeaux.fr',
      },
    ],
    genres: [
      'Latino',
      'Caribéen',
    ],
    description: (
      <p>
        <i>
          Concerts autour des cultures latino-américaines qui complètent le programme de la semaine de l'Amérique latine et des Caraïbes 2024.
        </i>
      </p>
    ),
  },
  {
    id: '54',
    name: 'Marjolaine Bamboche',
    category: 'Ambulant',
    location: {
      name: 'Place Adolphe Buscaillet',
      addressStr: 'Place Adolphe Buscaillet, 33300',
    },
    startTime: new Date('2024-06-21T18:00:00'),
    endTime: new Date('2024-06-22T00:00:00'),
    links: [
      {
        url: 'https://www.bordeaux.fr/e220339/fete-de-la-musique-2024-a-bordeaux',
        label: 'Évènement dans l\'agenda bordeaux.fr',
      },
    ],
    description: (
      <p>
        <i>
          Joyeux tintamarre et participation du public avec le "Karaoké Ambulant de Marjolaine", dans le quartier de Bacalan, départ Place Adolphe Buscaillet à 18h.
        </i>
      </p>
    ),
  },
  {
    id: '55',
    name: 'Opéra national de Bordeaux + CHU',
    category: 'Bordeaux Ouest',
    location: {
      name: `Jardin de l'hôpital Saint André`,
      addressStr: '1 Rue Jean Burguet, 33000 Bordeaux',
    },
    startTime: new Date('2024-06-21T17:00:00'),
    endTime: new Date('2024-06-21T17:45:00'),
    genres: [
      'Chorale',
      'Orchestral',
      'Opéra',
    ],
    links: [
      {
        url: 'https://www.bordeaux.fr/e213417/fete-de-la-musique',
        label: 'Évènement dans l\'agenda bordeaux.fr',
      },
    ],
    description: (
      <>
        <p>
          <i>
            Concert de musique chorale
          </i>
        </p>
        <p>
          <ul>
            <li>
              Georges Gershwin, Porgy and Bess (extraits)
            </li>
            <li>
              Leonard Bernstein, West Side Story (extraits)
            </li>
            <li>
              Giuseppe Verdi, Traviata (extraits)
            </li>
            <li>
              Georges Bizet, Carmen (extraits)
            </li>
          </ul>
        </p>
        <p>
          En partenariat avec le CHU de Bordeaux
        </p>
      </>
    ),
  },
  {
    id: '56',
    name: 'Fête de la musique des enfants',
    category: 'Centre ville',
    location: {
      name: 'Parc Bordelais',
      addressStr: 'Rue du Bocage, 33200 Bordeaux',
    },
    startTime: new Date('2024-06-23T14:00:00'),
    endTime: new Date('2024-06-23T19:00:00'),
    genres: [
      'Enfants',
      'Atelier',
      'DJ set',
      'Spectacle',
      'Orchestral',
    ],
    links: [
      {
        url: 'https://www.bordeaux.fr/e220338/fete-de-la-musique-des-enfants',
        label: 'Évènement dans l\'agenda bordeaux.fr',
      },
    ],
    description: (
      <>
        <Alert
          severity="warning"
          icon={false}
        >
          Évènement le 23 juin 2024
        </Alert>
        <p>
          <i>
            L'équipe de Ricochet Sonore accueille les enfants et les familles au coeur du Parc bordelais. Cette après-midi divertissante et conviviale propose des concerts et spectacles jeune public, des jeux, des sets DJ en mode chill-out, une scène ouverte, des ateliers et des animations ludiques dont Ricochet Sonore a le secret.
          </i>
        </p>
        <p>
          Une folle journée qui se clôture avec un concert exceptionnel de l'Orchestre d'Harmonie de Bordeaux ouvert aux mélomanes de tous âges.
        </p>
        <p>
          Au programme :
          <ul>
            <li>
              14h : DJ Set de Pierre Petit aka Shaolin Brother. Allongés dans l'herbe, sur un tapis ou un transat, on s'occupe de vos oreilles. Atelier Créa'Son, d'initiation aux instruments électroniques, faciles d'utilisation et tactiles, pour petits et grands !
            </li>
            <li>
              15h : éveil musical pour les parents et les enfants de 3 à 11 ans.
            </li>
            <li>
              16h30 : restitution des ateliers de l'école de musique Concert'ô.
            </li>
            <li>
              17h : spectacle très Jeune Public avec le duo De Cèdre et de Lune, en complicité avec le Krakatoa.
            </li>
            <li>
              18h : concert de l'Orchestre d'Harmonie de Bordeaux. Des Aristochats à Avatar, un programme ludique et divertissant autour des musiques de films et de dessins-animés.
            </li>
          </ul>
        </p>
      </>
    ),
  },
  {
    id: '57',
    name: 'Fête de la musique du Grizzly Pub',
    category: 'Centre ville',
    location: {
      name: 'Grizzly Pub',
      addressStr: '12 Place de la Victoire, 33000 Bordeaux',
    },
    startTime: new Date('2024-06-21T20:00:00'),
    endTime: new Date('2024-06-22T02:00:00'),
    links: [
      {
        url: 'https://www.instagram.com/p/C8Up5WmIrJn/',
        label: 'Post Instagram',
      },
    ],
    genres: [
      'Bar',
    ],
    description: (
      <CustomInstagramEmbed url="https://www.instagram.com/p/C8Up5WmIrJn/" />
    ),
  },
  {
    id: '58',
    name: 'Zig Zag : Bass Reload',
    category: 'Centre ville',
    location: {
      name: 'Zig Zag - Bar & Café',
      addressStr: `73 Cours de l'Argonne, 33000 Bordeaux`,
    },
    startTime: new Date('2024-06-21T21:00:00'),
    endTime: new Date('2024-06-22T02:00:00'),
    links: [
      {
        url: 'https://www.instagram.com/p/C8U_8TEqq1r/',
        label: 'Post Instagram',
      },
    ],
    genres: [
      'Bar',
      'DJ set',
    ],
    description: (
      <CustomInstagramEmbed url="https://www.instagram.com/p/C8U_8TEqq1r/" />
    ),
  },
  {
    id: '59',
    name: '𝗔𝗙𝗧𝗘𝗥 𝗣𝗔𝗥𝗧𝗬 𝗙𝗗𝗟𝗠 : 𝗗𝗥𝗔𝗚𝗢𝗡 𝗕𝗔𝗟𝗟 𝗕𝗘𝗕𝗢𝗣 @ 𝗟𝗔 𝗣𝗟𝗔𝗚𝗘',
    category: 'Bordeaux sud',
    location: {
      name: 'La Plage',
      addressStr: '40 Quai de Paludate, 33800 Bordeaux',
    },
    price: '9€ (Prévente)',
    startTime: new Date('2024-06-22T00:00:00'),
    endTime: new Date('2024-06-22T06:00:00'),
    genres: [
      'Club',
      'DJ set',
      'Electro',
      'House',
      'Techno',
      'Acid techno',
      'Hardgroove',
      'Psytrance',
      'Techno trance',
    ],
    links: [
      {
        url: 'https://www.instagram.com/p/C7epaKOK7FS/',
        label: 'Post Instagram',
      },
      {
        url: 'https://instagram.com/aisha.deejay',
        label: 'Instagram de 𝗔𝗜𝗦𝗛𝗔',
      },
      {
        url: 'https://instagram.com/_g.ea',
        label: 'Instagram de 𝗚𝗘𝗔',
      },
      {
        url: 'https://instagram.com/phatotiz_',
        label: 'Instagram de 𝗣𝗛𝗔𝗧 𝗢𝗧𝗜𝗭',
      },
      {
        url: 'https://instagram.com/rajax_outrance',
        label: 'Instagram de 𝗥𝗔𝗝𝗔𝗫',
      },
    ],
    description: (
      <>
        <p>
          𝗔𝗙𝗧𝗘𝗥 𝗣𝗔𝗥𝗧𝗬 𝗙𝗗𝗟𝗠 : 𝗗𝗥𝗔𝗚𝗢𝗡 𝗕𝗔𝗟𝗟 𝗕𝗘𝗕𝗢𝗣 @ 𝗟𝗔 𝗣𝗟𝗔𝗚𝗘 : 𝟮 𝗦𝗔𝗟𝗟𝗘𝗦 / 𝗖𝗔𝗣𝗔𝗖𝗜𝗧𝗘́ 𝗥𝗘́𝗗𝗨𝗜𝗧𝗘 / 𝗔𝗥𝗧𝗜𝗦𝗧𝗘𝗦 𝗜𝗡𝗧𝗘𝗥𝗡𝗔𝗧𝗜𝗢𝗡𝗔𝗨𝗫

          ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
          📅 𝗩𝗘𝗡𝗗𝗥𝗘𝗗𝗜 𝟮𝟭 𝗝𝗨𝗜𝗡 : 𝟬𝟬𝗵 - 𝟬𝟲𝗵
          📍 𝗟𝗔 𝗣𝗟𝗔𝗚𝗘, 𝗟𝗘 𝗖𝗟𝗨𝗕 : 𝟰𝟬 𝗤𝗨𝗔𝗜 𝗗𝗘 𝗣𝗔𝗟𝗨𝗗𝗔𝗧𝗘 - 𝟯𝟯𝟬𝟬𝟬 𝗕𝗢𝗥𝗗𝗘𝗔𝗨𝗫
          🔊 𝟮 𝗦𝗔𝗟𝗟𝗘𝗦 : 𝗧𝗘𝗖𝗛𝗡𝗢 / 𝗧𝗘𝗖𝗛𝗡𝗢 𝗧𝗥𝗔𝗡𝗖𝗘 / 𝗔𝗖𝗜𝗗 𝗧𝗘𝗖𝗛𝗡𝗢 / 𝗛𝗔𝗥𝗗𝗚𝗥𝗢𝗢𝗩𝗘 / 𝗧𝗘𝗞𝗡𝗢 / 𝗣𝗦𝗬𝗧𝗥𝗔𝗡𝗖𝗘 🙃 𝗖𝗔𝗣𝗔𝗖𝗜𝗧𝗘́ 𝗥𝗘́𝗗𝗨𝗜𝗧𝗘
          🎟️ 𝗣𝗥𝗘́𝗩𝗘𝗡𝗧𝗘𝗦 𝟵€ 👆𝗟𝗜𝗘𝗡 𝗘𝗡 𝗕𝗜𝗢 👆
          ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬

          Cette année, nous avons la chance que la 𝗙𝗘̂𝗧𝗘 𝗗𝗘 𝗟𝗔 𝗠𝗨𝗦𝗜𝗤𝗨𝗘 tombe un 𝗩𝗘𝗡𝗗𝗥𝗘𝗗𝗜.

          Nous avons donc travaillé à vous proposer des événements, 𝗘𝗡 𝗣𝗟𝗘𝗜𝗡 𝗖𝗘𝗡𝗧𝗥𝗘, 𝗔𝗩𝗔𝗡𝗧 𝗠𝗜𝗡𝗨𝗜𝗧, ainsi qu’une 𝗔𝗙𝗧𝗘𝗥 𝗣𝗔𝗥𝗧𝗬, 𝗔𝗨 𝗣𝗟𝗨𝗦 𝗣𝗥𝗢𝗖𝗛𝗘, 𝗔𝗖𝗖𝗘𝗦𝗦𝗜𝗕𝗟𝗘 𝗔̀ 𝗣𝗜𝗘𝗗𝗦.

          On ouvre 𝟮 𝗦𝗔𝗟𝗟𝗘𝗦, 𝗢𝗡 𝗥𝗘́𝗗𝗨𝗜𝗧 𝗟𝗔 𝗖𝗔𝗣𝗔𝗖𝗜𝗧𝗘́ 𝗣𝗢𝗨𝗥 𝗨𝗡 𝗖𝗢𝗡𝗙𝗢𝗥𝗧 𝗢𝗣𝗧𝗜𝗠𝗔𝗟, et aux côtés de nos DJs locaux, on invite des DJs 𝗜𝗡𝗧𝗘𝗥𝗡𝗔𝗧𝗜𝗢𝗡𝗔𝗨𝗫, DANS DES STYLES 𝗗𝗜𝗙𝗙𝗘́𝗥𝗘𝗡𝗧𝗦 :
          𝗔𝗜𝗦𝗛𝗔 (@aisha.deejay ): 𝗗𝗝 & 𝗣𝗥𝗢𝗗𝗨𝗖𝗧𝗥𝗜𝗖𝗘 𝗯𝗮𝘀𝗲́𝗲 𝗮̀ 𝗚𝗟𝗔𝗦𝗚𝗢𝗪 : 𝗧𝗘𝗖𝗛𝗡𝗢 𝗧𝗥𝗔𝗡𝗖𝗘

          𝗚𝗘𝗔 (@_g.ea ) : 𝗗𝗝 & 𝗣𝗥𝗢𝗗𝗨𝗖𝗧𝗥𝗜𝗖𝗘 𝗯𝗮𝘀𝗲́𝗲 𝗮̀ 𝗕𝗔𝗥𝗖𝗘𝗟𝗢𝗡𝗘 : 𝗔𝗖𝗜𝗗 𝗧𝗘𝗖𝗛𝗡𝗢

          𝗣𝗛𝗔𝗧 𝗢𝗧𝗜𝗭 (@phatotiz_ ) : 𝗗𝗝 & 𝗣𝗥𝗢𝗗𝗨𝗖𝗧𝗘𝗨𝗥 𝗔𝗨𝗧𝗥𝗜𝗖𝗛𝗜𝗘𝗡 𝗯𝗮𝘀𝗲́ 𝗮̀ 𝗩𝗜𝗘𝗡𝗡𝗘𝗦 : 𝗔𝗖𝗜𝗗 𝗧𝗘𝗞𝗡𝗢

          𝗥𝗔𝗝𝗔𝗫 (@rajax_outrance ) : 𝗗𝗝 𝗯𝗮𝘀𝗲́ 𝗮̀ 𝗕𝗔𝗥𝗖𝗘𝗟𝗢𝗡𝗘 : 𝗣𝗦𝗬𝗧𝗥𝗔𝗡𝗖𝗘

          Conclusion ? 𝗢𝗡 𝗩𝗔 𝗧𝗢𝗨𝗧 𝗥𝗔𝗦𝗘𝗥 🚀

          𝗘́𝗧𝗘𝗥𝗡𝗘𝗟𝗟𝗘 𝗤𝗨𝗘𝗦𝗧𝗜𝗢𝗡 : 𝗦𝗔𝗩𝗢𝗜𝗥 𝗤𝗨𝗢𝗜 ? 𝗥 𝗜 𝗘 𝗡 😈
        </p>
        <CustomInstagramEmbed url="https://www.instagram.com/p/C7epaKOK7FS/" />
      </>
    ),
  },
  {
    id: '60',
    name: `Fête de la musique de l'Adiù`,
    category: 'Centre ville',
    location: {
      name: 'L\'Adiù',
      addressStr: '10 cours Victor Hugo, 33000 Bordeaux',
    },
    startTime: new Date('2024-06-21T16:00:00'),
    endTime: new Date('2024-06-22T02:00:00'),
    links: [
      {
        url: 'https://www.instagram.com/p/C8WuUmTqAh5/?img_index=2',
        label: 'Post Instagram',
      },
    ],
    genres: [
      'Bar',
      'DJ set',
      'Disco',
      'Funk',
      'Karaoke',
    ],
    artists: [
      'Swann de la Mancha',
    ],
    description: (
      <>
        <p>
          🎉 Fête de la musique à l'Adiù 🎉
        </p>
        <p>
          🎤 Karaoké Geant 🎤
          <br />
          A partir de 20h
        </p>
        <CustomInstagramEmbed
          url="https://www.instagram.com/p/C8WuUmTqAh5/?img_index=2"
        />
      </>
    ),
  },
  {
    id: '61',
    name: 'Fête de la musique du Wall Street',
    category: 'Centre ville',
    location: {
      name: 'Wall Street',
      addressStr: '7 Quai de la Douane, 33000 Bordeaux',
    },
    startTime: new Date('2024-06-21T18:00:00'),
    endTime: new Date('2024-06-22T03:00:00'),
    genres: [
      'Bar',
      'DJ set',
      'Electro',
      'House',
      'Techno',
      'Hip Hop',
    ],
    description: (
      <>
        <p>
          🎉 Fête de la musique au Wall Street 🎉
        </p>
        <p>
          🎧 DJ set 🎧
          <br />
          Jusqu'à 3h du matin
        </p>
        <div
          className="flex justify-center w-full"
        >
          <div
            className="flex justify-center w-full"
            style={{ maxWidth: 600 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/2024/wallstreetbdx-story.png"
              alt="Story Instagram du Wall Street"
            />
          </div>
        </div>
      </>
    ),
  },
  {
    id: '62',
    name: `After-club de l'IBOAT`,
    category: 'Bassins à flot',
    location: {
      name: 'iBoat',
      addressStr: '1 Quai Lawton, Bassin à Flot n°1, 33300 Bordeaux',
    },
    startTime: new Date('2024-06-22T06:00:00'),
    endTime: new Date('2024-06-22T12:00:00'),
    price: '4€ (Prévente) / 10€ (Sur place)',
    genres: [
      'After',
      'Club',
      'DJ set',
      'Electro',
      'House',
      'Techno',
    ],
    links: [
      {
        url: 'https://www.instagram.com/p/C8X7ZxqK2b4/',
        label: 'Post Instagram',
      },
      {
        url: 'https://www.iboat.eu/agenda/after-club-fete-de-la-musique',
        label: 'Agenda de l\'iBoat',
      },
      {
        url: 'https://link.dice.fm/fe0f9161af9e?fbclid=IwZXh0bgNhZW0CMTAAAR3qFz1nkjSLVPISoUspNJXxH90a26gDJZdCQZTGGTYGEJUTiTfeATz6lhU_aem_AcaWQvrNQDj27UIh3EnSaPIlyu4KpNpVX-tAS9o4qSCq1tTsmxmr4Keif8uLXkr7-03TaG1IQshTyV8GpWuhZiTW',
        label: 'Billetterie club (DICE)',
      },
    ],
    artists: [
      'Club nuggets',
      'Fruor',
      'Gimme sound',
      'Godsoul',
      'Owlshake',
      'Tapage',
      'Trikar',
    ],
    description: (
      <CustomInstagramEmbed url="https://www.instagram.com/p/C6Y8dVyK8tQ/" />
    ),
  },
];
