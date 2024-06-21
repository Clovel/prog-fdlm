/* Component imports ----------------------------------- */
import { Alert } from '@mui/material';
import CustomEmbed from 'components/CustomEmbed/CustomEmbed';
import { FacebookEmbed } from 'react-social-media-embed';

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';

/* Events fixture -------------------------------------- */
export const events: Event[] = [
  {
    id: '41',
    category: 'St. Michel',
    name: `Allez les filles + L'astrodøme + Bordeaux rock`,
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
        url: 'https://www.instagram.com/p/C8M2dnZKPSY/',
        label: 'Post Instagram',
      },
      {
        url: 'https://www.bordeaux.fr/e220331/allez-les-filles-l-astrodome-bordeaux-rock',
        label: 'Évènement dans l\'agenda bordeaux.fr',
      },
      {
        url: 'https://www.facebook.com/events/947021640358266',
        label: 'Évènement Facebook',
      },
      {
        url: 'https://www.instagram.com/lastrodome.bdx/',
        label: 'Instagram de l\'Astrodøme',
      },
      {
        url: ' https://www.instagram.com/allezlesfilles_bdx/',
        label: 'Instagram de Allez les Filles',
      },
      {
        url: 'https://www.instagram.com/bordeaux.rock/',
        label: 'Instagram de Bordeaux Rock',
      },
      {
        url: 'https://www.facebook.com/wearenastyjoe',
        label: 'Facebook de Nastyjoe',
      },
      {
        url: 'https://www.facebook.com/chelabom',
        label: 'Facebook de Chelabôm',
      },
      {
        url: 'https://www.facebook.com/SIZband',
        label: 'Facebook de Siz',
      },
      {
        url: 'https://www.facebook.com/yokoohnobordeaux',
        label: 'Facebook de Yoko ? Oh No',
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

        <p>
          🚪🎸👊 𝗙𝗘𝗧𝗘 𝗗𝗘 𝗟𝗔 𝗠𝗨𝗦𝗜𝗤𝗨𝗘 𝟮𝟬𝟮𝟰
          <br />
          📣 Les 3 associations L'Astrodøme, Allez les Filles et Bordeaux Rock unissent leurs forces pour une fête de la Musique en plein air au Square Dom Bedos ! 4 groupes locaux au menu de cette soirée gratuite.
          <br />
          🗓️ 21 JUIN 2024
          <br />
          🚪 Ouverture des portes à 18h
          <br />
          🎵 Début des concerts à 19h
          <br />
          🗺️ Square Dom Bedos - Rue Jacques d'Welles, 33800 Bordeaux
          <br />
          🎟️ Entrée Libre
          <br />
          🥪 Restauration sur place
        </p>

        <p>
          🎶 𝐏𝐑𝐎𝐆𝐑𝐀𝐌𝐌𝐀𝐓𝐈𝐎𝐍 :
          <ul>
            <li>
              ▲ 𝗡𝗔𝗦𝗧𝗬𝗝𝗢𝗘 (Post-Punk - Bordeaux)
            </li>
            <li>
              ▲ 𝗖𝗛𝗘𝗟𝗔𝗕𝗢̂𝗠 (Nu-Soul - Bordeaux)
            </li>
            <li>
              ▲ 𝗦𝗜𝗭 (Grunge, Shoegaze - Bordeaux)
            </li>
            <li>
              ▲ 𝗬𝗢𝗞𝗢? 𝗢𝗛 𝗡𝗢! (Punk, Rock - Bordeaux)
            </li>
          </ul>
          {'>>'}
          {' '}
          𝗡𝗘𝗕𝗨𝗟𝗔 (Stoner Psych - USA) (!!! ANNULÉ !!!)
        </p>

        <p>
          🔎 𝐈𝐍𝐅𝐎𝐒 𝐏𝐑𝐀𝐓𝐈𝐐𝐔𝐄𝐒 :
          <br />
          🗺️Square Dom Bedos, Rue Jacques d'Welles, 33800 Bordeaux
          <br />
          🚋 TRAM C et D | Bus 10, 31 et TBNIGHT : Arrêt Sainte-Croix | Station VCUB
          <br />
          🎟️ Entrée libre de 18h à 00h30
          <br />
          Contrôle des sacs à l’entrée du square par une équipe de sécurité, emmener des boissons alcoolisées n'est pas autorisé.
          <br />
          🍔 Food-truck : Nous vous annoncerons bientôt les food-trucks présents
        </p>

        <p>
          <b>
            Les artistes :
          </b>
        </p>

        <p>
          ▲ 𝗡𝗔𝗦𝗧𝗬𝗝𝗢𝗘 (Post-Punk - Bordeaux)
          <br />
          La lumière est noire. Elle nous rappelle celle qui éclairait les années du post-punk britannique. Celui-ci convoque un art de la tension et un souci de la mélodie, une gravité réaliste et sincère. Inspiré par ses doutes et ses névroses, les performances du combo bordelais transforment les tourments en ballades et ramènent les espoirs à un chaos cosmique.
          <br />
          NASTYJOE tourne en poésie ce que nous ne voulons pas voir, fait ressurgir en négatif qui nous sommes. Un développement anti-personnel pour une sombre communion.
        </p>

        <p>
          ▲ 𝗖𝗛𝗘𝗟𝗔𝗕𝗢̂𝗠 (Nu-Soul, Bordeaux)
          <br />
          Chelabôm plonge dans un univers aux influences multiples sur les bases de la néo-soul. Ils mélangent des sonorités afro et latinos, des rythmes hip-hop et jungle, et des textures électro à la recherche du groove collectif, où des histoires se racontent et s'incarnent par la danse.
        </p>

        <p>
          ▲ 𝗦𝗜𝗭 (Grunge, Shoegaze - Bordeaux)
          <br />
          SIZ est le pseudonyme de Sylvain Palis, musicien bordelais hyperactif du collectif Flippin’ Freaks, et membre de la formation live de TH Da Freak. Nourri au grunge et au shoegaze des 90’s, SIZ produit une musique énergique et massive comme en témoigne son premier album Liquid sorti en 2019 sur Flippin’ Freaks Records, qui fait toutefois la part belle à une forte sensibilité mélodique. Après plusieurs tournées dévastatrices, SIZ a rodé un set puissant et calibré dont on ne ressort que rarement indemne.
        </p>

        <p>
          ▲ 𝗬𝗢𝗞𝗢? 𝗢𝗛 𝗡𝗢! (Punk, Rock - Bordeaux)
          <br />
          Distillant un punk rock à la sauce garage – poisseux de bière et autres liquides peu catholiques – les trois lascars atteint d’une Beatlemania aigue chante les travers de notre société et de nos coeurs avec une efficacité remarquable. Et oui, ce n’est pas parce que leur album s’appelle Tattoos and Chlamydias qu’ils ne peuvent pas faire preuve d’un peu de romantisme… et BEAUCOUP de second degré !
        </p>

        <CustomEmbed url="https://www.instagram.com/p/C8M2dnZKPSY/" />

        <CustomEmbed
          EmbedComponent={FacebookEmbed}
          url="https://www.facebook.com/events/947021640358266"
        />
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
      {
        url: 'https://www.instagram.com/p/C7wfI07KKfY/?img_index=1',
        label: 'Post Instagram',
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
        <p>
          <i>
            S’il y a bien une guindoule à ne pas rater en Juin c’est bien la fête de la musique. Un rendez-vous incontournable de la teuf qui nous fera nous retrouver dans la cour du Crédit Municipal ! On se donne rendez-vous avec @bordeauxopenair DJ’s, @kaizerziegler et @fabiooo_________ pour notre première dans ce spot
            <br />
            See you there 🫶
          </i>
        </p>
        <CustomEmbed url="https://www.instagram.com/p/C7wfI07KKfY/?img_index=1" />
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

        <CustomEmbed url="https://www.instagram.com/p/C8M9APpqOfo/" />
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

        <CustomEmbed url="https://www.instagram.com/p/C8M9APpqOfo/" />
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
    links: [
      {
        url: 'https://www.instagram.com/p/C7UVHVZK56Q/',
        label: 'Post Instagram',
      },
      {
        url: 'https://www.bordeaux.fr/e220459/l-orangeade-wild-cmd-o',
        label: 'Évènement dans l\'agenda bordeaux.fr',
      },
    ],
    description: (
      <>
        <p>
          Le jour le plus long de l'année sera groovy ou ne sera pas ! L'Orangeade, Wild et CMD+O transforment la Cour Mably en dancefloor joyeux et ensoleillé pour célébrer dignement la Fête de la Musique. Leur secret ? Des sets musicaux sans frontières, une passion pour les fêtes spectaculaires et l'envie suprême de mettre le public en transe. Indice 50 conseillé !
        </p>
        <p>
          L’été peine à montrer le bout de son nez, mais dès qu’il sera là, nous le célèbrerons comme il se doit !
          <br />
          Pour ce faire nous convoquons nos dieux lumières, le @collectif_cmdo à la sceno et derrière les platines @vingt__deux__ & @s.olynde du collectif @w__i__l__d_, @fullspeed_3000, @deejayblond, @will_diggs_lorangeade_djs et @freemadj ☀️
        </p>
        <CustomEmbed url="https://www.instagram.com/p/C7UVHVZK56Q/" />
      </>
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
    endTime: new Date('2024-06-22T01:00:00'),
    price: 'Gratuit',
    genres: [
      'Electro',
      'House',
      'Techno',
      'Hard Trance',
      'Hard Techno',
      'Acidcore',
      'Bass Music',
    ],
    artists: [
      '@tarsmusic_',
      '@djnee_23',
      '@foussyyy',
      '@utk_shz',
      '@kloss_dj',
      '@catharso.shz',
      '@knaf',
    ],
    links: [
      {
        url: 'https://www.instagram.com/p/C8FNgggoxoO/',
        label: 'Post Instagram',
      },
      {
        url: 'https://www.facebook.com/events/1135060547722667',
        label: 'Évènement Facebook',
      },
      {
        url: 'https://www.bordeaux.fr/e220336/collectif-munera-le-chaudron',
        label: 'Évènement dans l\'agenda bordeaux.fr',
      },
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
        <p>
          Pour une seconde collaboration le collectif Munera et le Chaudron sont très fièr.e.s de vous inviter à nouveau au Parc aux Angéliques à Bordeaux le 21 juin, à 5 minutes à pied seulement de Stalingrad, en face du jardin botanique !
          <br />
          On vous attend nombreux.ses pour un solstice d'été hors du temps 💜
          <br />
          ☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️
          🎧 ARTISTES : @tarsmusic_ / @djnee_23 / @foussyyy / @utk_shz / @kloss_dj / @catharso.shz / @knaf
          <br />
          🔊 Tekno / Hard Trance / Hard Techno / Acidcore / Bass Music
          <br />
          🕦 19h00 // 01h00 🕦
          <br />
          🔊 80KW LINE ARRAY BY LE CHAUDRON & LEAF 🔊
          <br />
          ✨ LIGHTS, LASERS & LED SCREEN SHOW BY OBLIVION, AO LIGHTS, DNR & VISUAL FLOW ✨
          <br />
          🎟️ ENTRÉE GRATUITE 🎟️
          <br />
          🖤 NO DISCRIMINATION HERE 🖤
          <br />
          ❤️ visuel by @daphneadoto
        </p>
        <CustomEmbed url="https://www.instagram.com/p/C8FNgggoxoO/" />
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
    name: `Bordeaux fête la musique - Mini festival, Maxi collectivité`,
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
        url: 'https://dice.fm/partner/iboat/event/gvqlb-bordeaux-fte-la-musique-electronique-parc-bordelais-21st-jun-parc-bordelais-bordeaux-tickets?dice_id=3008650&dice_channel=web&dice_tags=organic&dice_campaign=IBOAT&dice_feature=mio_marketing&_branch_match_id=1332477066904013691&_branch_referrer=H4sIAAAAAAAAA8soKSkottLXz8nMy9ZLyUxO1UvL1fc3MzQ1Skk1TzRKMgAAtqSnDCEAAAA%3D',
        label: 'Billetterie coupe file (DICE)',
      },
      {
        url: 'https://www.bordeaux.fr/e220461/trafic-bruit-rose-super-daronne-mates-distill-les-viatiques',
        label: 'Évènement dans l\'agenda bordeaux.fr',
      },
      {
        url: 'https://www.instagram.com/p/C6Y8dVyK8tQ/',
        label: 'Post Instagram',
      },
      {
        url: 'https://www.facebook.com/events/1594624761113483?acontext=%7B%22event_action_history%22:%5B%5D%7D',
        label: 'Évènement Facebook',
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

        <CustomEmbed
          EmbedComponent={FacebookEmbed}
          url="https://www.facebook.com/events/1594624761113483?acontext=%7B%22event_action_history%22:%5B%5D%7D"
        />
        <CustomEmbed url="https://www.instagram.com/p/C6Y8dVyK8tQ/" />
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
    category: 'Bordeaux ouest',
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
    category: 'Bordeaux ouest',
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
      <CustomEmbed url="https://www.instagram.com/p/C8Up5WmIrJn/" />
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
      <CustomEmbed url="https://www.instagram.com/p/C8U_8TEqq1r/" />
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
        <CustomEmbed url="https://www.instagram.com/p/C7epaKOK7FS/" />
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
        <CustomEmbed
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
      <CustomEmbed url="https://www.instagram.com/p/C6Y8dVyK8tQ/" />
    ),
  },
  {
    id: '63',
    name: 'Open Air au JOYA MAX',
    category: 'Bassins à flot',
    location: {
      name: 'JOYA MAX',
      addressStr: '106 Quai Lawton, 33300 Bordeaux',
    },
    startTime: new Date('2024-06-21T18:00:00'),
    endTime: new Date('2024-06-21T21:00:00'),
    genres: [
      'DJ set',
      'BBQ',
      'Open air',
    ],
    links: [
      {
        url: 'https://www.instagram.com/p/C8cnutDoFqp/',
        label: 'Post Instagram',
      },
    ],
    description: (
      <>
        <p>
          🎉 Open Air au JOYA MAX 🎉
        </p>
        <p>
          <i>
            Cette année, la fête de la musique se passe au Joya Max!
            <br />
            On vous prévoit un programme de folie ✨
            <br />
            On vous attend nombreux dès 18h, hâte de vous voir!
          </i>
        </p>
        <p>
          🎧 DJ set 🎧
          <br />
          De 18h à 21h
        </p>
        <p>
          Barbecue à volonté 🍖
          <br />
          25€ / personne
        </p>
        <CustomEmbed url="https://www.instagram.com/p/C8cnutDoFqp/" />
      </>
    ),
  },
  {
    id: '64',
    name: 'Club - Fête de la musique au JOYA MAX',
    category: 'Bassins à flot',
    location: {
      name: 'JOYA MAX',
      addressStr: '106 Quai Lawton, 33300 Bordeaux',
    },
    startTime: new Date('2024-06-21T22:30:00'),
    endTime: new Date('2024-06-22T02:00:00'),
    genres: [
      'Club',
      'DJ set',
    ],
    links: [
      {
        url: 'https://www.instagram.com/p/C8cnutDoFqp/',
        label: 'Post Instagram',
      },
    ],
    description: (
      <>
        <p>
          🎉 Club - Fête de la musique au JOYA MAX 🎉
        </p>
        <p>
          <i>
            Cette année, la fête de la musique se passe au Joya Max!
            <br />
            On vous prévoit un programme de folie ✨
            <br />
            On vous attend nombreux dès 22h30h, hâte de vous voir!
          </i>
        </p>
        <p>
          🎧 DJ set au club 🎧
          <br />
          De 22h30 à 2h
        </p>
        <CustomEmbed url="https://www.instagram.com/p/C8cnutDoFqp/" />
      </>
    ),
  },
  {
    id: '65',
    name: 'Hard Edition IV - GEIST CELEBRATES MUSIC',
    category: 'Bordeaux nord',
    location: {
      name: 'Espace DS',
      addressStr: '17 Rue Edouard Faure, 33300 Bordeaux',
    },
    startTime: new Date('2024-06-22T00:00:00'),
    endTime: new Date('2024-06-22T06:00:00'),
    artists: [
      '6EJOU [LIVE]',
      'LESSSS',
      'NICE KEED',
      'HASS',
      'DREAMZ',
    ],
    genres: [
      'Club',
      'DJ set',
      'Electro',
      'Techno',
    ],
    links: [
      {
        url: 'https://www.instagram.com/p/C7POU_sIa19/',
        label: 'Post Instagram',
      },
    ],
    description: (
      <>
        <p>
          GEIST CELEBRATES MUSIC THE 21.06.24 !
          <br />
          Time to increase the temperature presenting our Hard Edition IV.
          <br />
          Get ready for a full force elite lineup presenting @6ejou @lessssdj @nicekeedmusic @hass.iv @dreamz.music
          <br />
          Prod : @theo.miege
        </p>
        <CustomEmbed url="https://www.instagram.com/p/C7POU_sIa19/" />
      </>
    ),
  },
  {
    id: '66',
    name: `FAITES DE LA MUSIQUE - L'Entrepôt`,
    category: 'Bordeaux nord',
    location: {
      name: `L'Entrepôt`,
      addressStr: '36 Avenue du Dr. Schinazi, 33300 Bordeaux',
    },
    startTime: new Date('2024-06-22T00:00:00'),
    endTime: new Date('2024-06-22T06:00:00'),
    artists: [
      'MOMOMO',
      'SOHIER',
      'BRAINWASHERS',
      'NØW',
      'GLÖK',
      '-EKAR',
    ],
    genres: [
      'Club',
      'DJ set',
      'Electro',
      'Techno',
    ],
    links: [
      {
        url: 'https://www.instagram.com/p/C7yxwd2oC72/',
        label: 'Post Instagram',
      },
    ],
    description: (
      <>
        <p>
          VENDREDI 21 JUIN
          <br />
          FAITES DE LA MUSIQUE
          <br />
          w/ MOMOMO / SOHIER / BRAINWASHERS / NØW / GLÖK / -EKAR
        </p>

        <p>
          21/06/2024 || 00h00 - 06h00
          <br />
          L’ENTREPÔT - 36 AV. du Dr. Schinazi, 33300 Bordeaux.
        </p>

        <p>
          (OUVERTURE DES PORTES MINUIT //OPEN GATES 00:00)
        </p>
        <CustomEmbed url="https://www.instagram.com/p/C7yxwd2oC72/" />
      </>
    ),
  },
  {
    id: '67',
    name: 'FÊTE DE LA MUSIQUE par NOVABASS - La Fabriek',
    category: 'Centre ville',
    location: {
      name: 'La Fabriek',
      addressStr: '11 Rue des Faussets, 33000 Bordeaux',
    },
    startTime: new Date('2024-06-21T19:00:00'),
    endTime: new Date('2024-06-22T02:00:00'),
    price: 'Gratuit',
    genres: [
      'Techno',
      'Hard Techno',
      'Indus',
      'Tekno',
      'Hard Music',
    ],
    artists: [
      'KSTLE',
      'LOUIS WIRZ',
      'MAAX D',
      '2MODS (KO)',
      'INSO.ENCE',
      'LA TORGNOLE',
      'KLÖSS',
      'MINDBENDER',
    ],
    links: [
      {
        url: 'https://www.instagram.com/p/C8IGRN9Iy7F/',
        label: 'Post Instagram',
      },
    ],
    description: (
      <>
        <p>
          VENDREDI 21 JUIN
          <br />
          FÊTE DE LA MUSIQUE par NOVABASS
        </p>

        <p>
          KSTLE // LOUIS WIRZ // MAAX D // 2MODS (KO) // INSO.ENCE b2b LA TORGNOLE // KLÖSS // MINDBENDER
        </p>

        <p>
          📅 VENDREDI 21 JUIN
          <br />
          🔊 Techno / Hard Techno / Indus / Tekno / Hard Music
          <br />
          🕠 19h - 2h
        </p>

        <CustomEmbed url="https://www.instagram.com/p/C8IGRN9Iy7F/" />
      </>
    ),
  },
  {
    id: '68',
    name: `🌟🎶 Fête de la Musique La kermess au Levrette Café Bordeaux 🎶🌟`,
    category: 'Centre ville',
    location: {
      name: 'Levrette Café Bordeaux',
      addressStr: '6-8 Rue de Mérignac, 33000 Bordeaux',
    },
    startTime: new Date('2024-06-21T18:00:00'),
    endTime: new Date('2024-06-22T02:00:00'),
    genres: [
      'Bar',
      'DJ set',
      'Electro',
      'House',
    ],
    links: [
      {
        url: 'https://www.instagram.com/p/C8XS02DovYc/',
        label: 'Post Instagram',
      },
    ],
    description: (
      <>
        <p>
          <b>
            🌟🎶 **Fête de la Musique La kermess au Levrette Café Bordeaux** 🎶🌟
          </b>
        </p>

        <p>
          Rejoignez-nous le 21 juin de 21h à 2h pour une soirée inoubliable à l’occasion de la Fête de la Musique ! 🎉
        </p>

        <p>
          Au programme, des performances électrisantes avec :
          <ul>
            <li>
              🪩 @bouta.fr
            </li>
            <li>
              🪩 @folcoch_
            </li>
            <li>
              🪩 @zaraki.___
            </li>
            <li>
              🪩 @la_frit3
            </li>
          </ul>
        </p>

        <p>
          Venez vibrer au rythme de la musique dans un lieu atypique et unique : le Levrette Café Bordeaux ! 🍻✨
        </p>

        <p>
          📍 **Lieu** : Levrette Café Bordeaux
          <br />
          🕘 **Horaire** : 21h - 2h
          <br />
          📅 **Date** : 21 juin
        </p>

        <p>
          Ne manquez pas cette soirée mémorable ! 🌠
        </p>

        <CustomEmbed url="https://www.instagram.com/p/C8XS02DovYc/" />
      </>
    ),
  },
  {
    id: '69',
    name: 'Open Air de la Talenquère - St. Pierre',
    category: 'Centre ville',
    location: {
      name: 'La Talenquère',
      addressStr: '5 place Saint-Pierre, 33000 Bordeaux',
    },
    startTime: new Date('2024-06-21T14:00:00'),
    endTime: new Date('2024-06-22T02:00:00'),
    links: [
      {
        url: 'https://www.instagram.com/p/C8MLnqLo3YY/',
        label: 'Post Instagram',
      },
      {
        url: 'https://www.facebook.com/events/1406746993369114',
        label: 'Événement Facebook',
      },
    ],
    description: (
      <>
        <p>
          Après une belle édition en 2023, La Talenquère fête de nouveau la musique place Saint-Pierre devant l'église avec une belle équipe et un gros soundsystem en open air ! 😍
        </p>

        <p>
          Niveau son, on repart sur quelque chose de progressif, il y en aura pour tous les goûts ☀️💃 Et tout au long de la journée des bières pressions et des frites et hot dogs jusqu’à épuisement des stocks 🍟🌭
        </p>

        <p>
          ➡️ 14h - 17h : @fitandfat.bdx
          <br />
          ➡️ 17h - 20h : @broken_district
          <br />
          ➡️ 20h - 23h : @gimmesound
          <br />
          ➡️ 23h - 1h : @slimmy_music_
          <br />
          ➡️ 1h - 2h : surprise 🤫
        </p>

        <p>
          Alors on te voit le 21 juin ? 🔥
        </p>
        •
        <p>
          📍 La Talenquère - 8 place Saint-Pierre, Bordeaux
          <br />
          📆 Mardi au samedi / 13h - 00h
          <br />
          🐷
          {' '}
          <a
            href="https://www.latalenquere.fr"
            target="_blank"
            rel="noreferrer noopener"
          >
            www.latalenquere.fr
          </a>
          <br />
          📸 @la_torpille_graphique @lord_torpille
          <br />
          🍷 L’abus d’alcool est dangereux pour la santé, à consommer avec modération
        </p>

        <CustomEmbed url="https://www.instagram.com/p/C8MLnqLo3YY/" />

        <CustomEmbed
          EmbedComponent={FacebookEmbed}
          url="https://www.facebook.com/events/1406746993369114"
        />
      </>
    ),
  },
  {
    id: '70',
    name: 'Love & Unity - La Belle Brochette',
    category: 'St. Michel',
    location: {
      name: 'Place Meynard',
      addressStr: 'Place Meynard, 33000 Bordeaux',
    },
    startTime: new Date('2024-06-21T19:00:00'),
    endTime: new Date('2024-06-22T00:45:00'),
    price: 'Gratuit',
    links: [
      {
        url: 'https://www.instagram.com/p/C8ZxNPyKto1/',
        label: 'Post Instagram',
      },
    ],
    genres: [
      'Jungle',
      'Techno',
      'Bass music',
      'Drum and bass',
      'House',
      'Riddim',
    ],
    artists: [
      'Sohier',
      'Nasty Lewis',
      'Enola',
      'MZE',
      'Codename:N24',
      'Ginger 808',
      'Sainte Croix',
    ],
    description: (
      <>
        <p>
          ☮️ La Belle Brochette sort les chemises colorées et sera à Saint-Michel pour célébrer la musique comme il se doit. Un lineup éclectique et des good vibes, avec toujours son lot de bass music comme on aime faire. Venez avec nous pour propager l'amour et la solidarité, étant les principaux messages des musiques électroniques.
        </p>
        <p>
          Avec:
          <ul>
            <li>
              @nasty_lewis (jungle)
            </li>
            <li>
              @sohier_music & @st_crx (techno)
            </li>
            <li>
              @mzednb (drum and bass)
            </li>
            <li>
              @enolabrume (house)
            </li>
            <li>
              @ginger.808 (jungle/DnB)
            </li>
            <li>
              @codename_n24 (riddim)
            </li>
          </ul>
        </p>
        <CustomEmbed url="https://www.instagram.com/p/C8ZxNPyKto1/" />
      </>
    ),
  },
  {
    id: '71',
    name: 'Tropical Party - Le Karadoc fête la musique',
    category: 'St. Michel',
    location: {
      name: 'Le Karadoc',
      addressStr: '166 Cours de la Marne, 33800 Bordeaux',
    },
    startTime: new Date('2024-06-21T11:00:00'),
    endTime: new Date('2024-06-22T02:00:00'),
    genres: [
      'Bar',
      'DJ set',
    ],
    artists: [
      'ASMOSIAS',
      'HISACHI',
      'HENDEMICS',
      'PSYGUANA',
      'FORBES',
      '2ID',
      'FURIK',
      'FURIK',
      'CHESH T-R',
      'SAIHTTAM',
      'DJEUJ',
      'San Tury & Kent Lewis',
      'SAW',
      'SNER',
      'Butano',
      'Flav Music',
    ],
    links: [
      {
        url: 'https://www.instagram.com/p/C8XE6J2IBZ7/?img_index=1',
        label: 'Post Instagram',
      },
    ],
    description: (
      <>
        <p>
          Le Karadoc fête la musique !
          Attention énorme soirée en prévision ! Ce vendredi, vient fêter la musique avec nous. Au programme :
        </p>

        <p>
          Ouverture 11h-2h : DJ sets de folie ( 15 de nos meilleurs dj locaux )
          <br />
          8KW DE SOND prévus pour l’occasion !
          <br />
          Plancha extérieure, tatoueurs présent, stand de merch by @dynamica_productions 👕
          <br />
          Déco 100% tropical de nombreux goodies offert !
        </p>
        <p>
          Diffusion du match Pays-Bas vs France sur écran intérieur et extérieur ! ⚽️
        </p>

        <p>
          Viens vibrer all night long aux rythmes de :
          @flavvmusic @butano_tisma @snertechno @saw__dj @chesh_t_r @vincent_tury_21 @kent.lewis_ @2id.wav @c_titu_psyguana @h_forbes_ @saihttam.music @furik_officiel @_djeudj_ @_hisachi__ @_hisachi__ @hendemic_music
        </p>

        <CustomEmbed url="https://www.instagram.com/p/C8XE6J2IBZ7/?img_index=1" />
      </>
    ),
  },
  {
    id: '72',
    name: 'After au complexe Aquitain',
    category: 'Bordeaux sud',
    location: {
      name: 'Complexe Aquitain',
      addressStr: '229 Cours de la Marne, 33800 Bordeaux',
    },
    startTime: new Date('2024-06-22T07:00:00'),
    endTime: new Date('2024-06-22T13:00:00'),
    genres: [
      'After',
      'Club',
      'Sex positive',
      'Love store',
    ],
    artists: [
      'FC Kabagar',
      'Strict Fox',
      'QLEM',
      'Who is Andras',
      'Soixanteee',
      'Maax D',
    ],
    links: [
      {
        url: 'http://www.complexeaquitain.com/',
        label: (
          <span>
            <b>
              [NSFW]
            </b>
            {' '}
            Site web du Complexe Aquitain
          </span>
        ),
      },
    ],
    description: (
      <>
        <p>
          [NDLR] Alors la je ne sait pas, mais c'est dans un ciné porno / sex shop.
        </p>
        <p>
          <code>
            Téma l'event mdr. C'est de
            {' '}
            <b>
              07h à 13h au cours de la Marne
            </b>
          </code>
        </p>
      </>
    ),
  },
  {
    id: '73',
    name: 'Corazon Party édition spéciale fête de la musique !',
    category: 'Bassins à flot',
    location: {
      name: 'Blonde Vénus',
      addressStr: 'Cours Henri Brunet, 33300 Bordeaux',
    },
    startTime: new Date('2024-06-21T20:00:00'),
    endTime: new Date('2024-06-22T02:00:00'),
    genres: [
      'Disco',
      'Grunge',
      'Rock',
      'Soul',
      'Funk',
      'Italodisco',
      'Pop',
      'Variété française',
      '60s',
      '70s',
      '80s',
      '90s',
      '2000s',
      'Electro',
      'Reggae',
      'Musique du monde',
    ],
    links: [
      {
        url: 'https://www.facebook.com/events/753777480244427',
        label: 'Facebook event',
      },
      {
        url: 'https://www.iboat.eu/agenda/corazon-party-edition-speciale-fete-de-la-musique',
        label: 'Agenda de l\'iBoat',
      },
      {
        url: 'https://link.dice.fm/d2a45b5da622',
        label: 'Billetterie réservation (DICE)',
      },
    ],
    description: (
      <>
        <p>
          CORAZON PARTY : édition spéciale fête de la musique
        </p>
        <p>
          Faire une bonne grosse fête en plein air pour célébrer la musique et vous voir danser encore et toujours !
          Vendredi 21 juin, le duo Corazon s'empare de la guinguette de Blonde Venus avec sa boum renversante sur fond de musique d'extrême calidad pour cette édition spéciale fête de la musique. Et c'est une première !
          Aucune excuse n'est acceptée, c'est un vendredi soir ! Venez vous emparer des pavets et de la terrasse ! Vous éloigner du centre (parce que c'est vraiment galère de se déplacer là-bas le 21 juin) et danser avec nous au bord de l'eau (ça non plus il n'y a pas dans le centre ville).
          Dans tes oreilles le meilleur des années 60-2000 et sur des tempos différents (soyez assuré•es que ça va partir crescendo pour vous mettre en jambe) : disco, grunge, rock n'roll, hip hop, soul/funk, italo disco, pop, funk, varieté, 70s, 80s, 90s, 2000, musique du monde, punk, ragga, electro, tubes incontournables, artistes incontournables (Madonna , Mickael Jackson, Queen Céline etc…), new wave… Il y en aura pour vraiment tous les goûts !
          Nos objectifs : voir des chorégraphies endiablées en mode pas loin de la crise d'épilepsie et un max de transpiration de l'extrême (puis il va faire chaud en plus).
        </p>
        <p>
          Ouverture des portes 18h (ça vous laissera le temps de manger et de vous chauffer) - Start boum 20h
        </p>
        <p>
          Bar & restauration sur place
        </p>
        <p>
          {'Entrée libre et gratuite (réservation chaudement recommandée) > https://link.dice.fm/d2a45b5da622'}
        </p>

        <CustomEmbed
          EmbedComponent={FacebookEmbed}
          url="https://www.facebook.com/events/753777480244427"
        />
      </>
    ),
  },
  {
    id: '74',
    name: `ZOULOU Sound System fête la musique`,
    category: 'Bordeaux sud',
    location: {
      name: 'La Méca',
      addressStr: 'Parvis Corto Maltese, Quai de Paludate, 33800 Bordeaux, France',
    },
    startTime: new Date('2024-06-21T16:00:00'),
    endTime: new Date('2024-06-22T01:00:00'),
    price: 'Gratuit',
    artists: [
      'ITAL VIBES',
      'WEST HIGH DUB',
      'SPIRAL SKANK',
      'ZOULOU SOUND SYSTEM',
    ],
    genres: [
      'DJ set',
      'Dub',
    ],
    links: [
      {
        url: 'https://www.facebook.com/events/s/fete-de-la-musique-2024/777402217521395/',
        label: 'Facebook event',
      },
    ],
    description: (
      <CustomEmbed
        EmbedComponent={FacebookEmbed}
        url="https://www.facebook.com/events/s/fete-de-la-musique-2024/777402217521395/"
      />
    ),
  },
  {
    id: '75',
    name: '🤘 Ô Tiap acceuil un trio Rock 🤘',
    category: 'Bordeaux ouest',
    location: {
      name: 'Ô Tiap',
      addressStr: '158 Rue Émile Combes, 33000 Bordeaux, France',
    },
    startTime: new Date('2024-06-21T20:00:00'),
    endTime: new Date('2024-06-22T00:00:00'),
    genres: [
      'Bar',
      'Rock',
    ],
    links: [
      {
        url: 'https://www.facebook.com/events/829825602585397',
        label: 'Facebook event',
      },
      {
        url: 'https://otiap.fr',
        label: `Site officiel d'Ô Tiap`,
      },
    ],
    description: (
      <>
        <p>
          Le Tiap accueille un trio rock🤘 ; guitare, basse et chant pour faire vivre la musique rue Emile Combes !🎸
        </p>
        <p>
          Sur place, planches, burger, croque-monsieur et cuisine végétarienne et une variété de boissons pour passer un agréable moment entre ami.e.s ou en famille.
          On vous réserve une table ?
        </p>
        <p>
          Vous verrez tout sur notre site Internet : otiap.fr
        </p>

        <p>
          A très vite 🎶
        </p>

        <CustomEmbed
          EmbedComponent={FacebookEmbed}
          url="https://www.facebook.com/events/829825602585397"
        />
      </>
    ),
  },
  {
    id: '76',
    name: 'DŌJŌ fête la musique #1',
    category: 'Talence',
    location: {
      name: 'DŌJŌ',
      addressStr: '475 Cours de la Libération, 33400 Talence, France',
    },
    startTime: new Date('2024-06-21T19:00:00'),
    endTime: new Date('2024-06-22T00:00:00'),
    links: [
      {
        url: 'https://www.facebook.com/events/384156541310932/',
        label: 'Facebook event',
      },
    ],
    description: (
      <>
        <p>
          DŌJŌ fête la musique à Talence ! 💽
        </p>
        <p>
          Comme promis, on te réserve un été riche en évènements et en rencontres.
          Pour sa première année, DŌJŌ fête la musique, et à cette occasion, on te donne rendez-vous à Talence, face à l'arrêt Peixotto.
          Rejoins-nous sur les tatamis 🎎️ comme tu sais le faire et viens nous transmettre toute ta belle énergie estivale🌞
        </p>
        <p>
          <b>
            ATTENTION :
          </b>
          {' '}
          DŌJŌ est un lieu d'échange, de partage et d'amour. Tout acte transphobe, homophobe, raciste, ou s'en rapprochant de près ou de loin est strictement PROSCRIT. DŌJŌ a bonne mémoire. Nous nous réservons le droit de t'exclure de TOUTES les prochaines soirées, et tenons une blacklist à jour.
        </p>

        <p>
          Informations pratiques :
          <ul>
            <li>
              🍻 Pas de buvette sur le lieu de la soirée. Soyez prévoyants. PAS DE BOUTEILLE EN VERRE.
            </li>
            <li>
              📍 459-475 Cr de la Libération, 33400 Talence
            </li>
            <li>
              🚉 Tram B - Arrêt : Peixotto
            </li>
            <li>
              🚍 Bus 10, 20, 21, 35 arrêt Peixotto
            </li>
            <li>
              🎟️ Entrée gratuite
            </li>
          </ul>
        </p>

        <CustomEmbed
          EmbedComponent={FacebookEmbed}
          url="https://www.facebook.com/events/384156541310932/"
        />
      </>
    ),
  },
  {
    id: '77',
    name: 'Blanquefort fête la musique',
    category: 'Blanquefort',
    location: {
      name: 'Pomme Cactus Blanquefort',
      addressStr: '5 Rue Eugène Tartas, 33290 Blanquefort, France',
    },
    startTime: new Date('2024-06-21T19:00:00'),
    links: [
      {
        url: 'https://www.facebook.com/events/2767429456741941/',
        label: 'Facebook event',
      },
      {
        url: 'https://www.facebook.com/pommecactus',
        label: 'Page Facebook de Pomme Cactus',
      },
      {
        url: 'https://www.pommecactus.com/',
        label: 'Site officiel de Pomme Cactus',
      },
    ],
    description: (
      <p>
        Venez fêter le retour de l'été et la fête de la musique avec nous !
        Nous vous proposons une soirée tapas inédite, profitez de notre terrasse en musique !
      </p>
    ),
  },
  {
    id: '78',
    name: 'Fête de la musique de Saint-Médard-en-Jalles',
    category: 'Saint-Médard-en-Jalles',
    location: {
      name: `Place de l'hotel de ville`,
      addressStr: `1 Place de l'Hôtel de Ville, 33160 Saint-Médard-en-Jalles, France`,
    },
    startTime: new Date('2024-06-21T17:00:00'),
    endTime: new Date('2024-06-22T04:00:00'),
    genres: [
      'Village',
      'Concert',
    ],
    links: [
      {
        url: 'https://www.facebook.com/events/975278387627020/',
        label: 'Facebook event',
      },
      {
        url: 'https://www.saint-medard-en-jalles.fr/page/sinformer/agenda/2514-fete-de-la-musique-2024',
        label: 'Site officiel de la ville',
      },
    ],
    description: (
      <>
        <p>
          Vendredi 21 juin 2024, Saint-Médard-en-Jalles célèbre la musique et l'été.
        </p>
        <p>
          Pour la 42ᵉ édition de la Fête de la musique, la Ville propose dès l'après-midi un temps convivial et festif qui se prolongera le soir dans le centre-ville.
        </p>
        <p>
          Rendez-vous dès 19h, place de la République et parc de L'ingénieur pour profiter de concerts en tout genre !
        </p>

        <CustomEmbed
          EmbedComponent={FacebookEmbed}
          url="https://www.facebook.com/events/975278387627020"
        />
      </>
    ),
  },
  {
    id: '79',
    name: 'Open Air Place Saint-Pierre',
    category: 'Centre ville',
    location: {
      name: 'Place Saint-Pierre',
      addressStr: '5 Place Saint-Pierre, 33000 Bordeaux',
    },
  },
];
