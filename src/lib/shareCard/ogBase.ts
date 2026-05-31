/* Shared Open Graph base ------------------------------ */
// Next merges metadata per top-level field, NOT deeply: a route that sets
// `openGraph` replaces the parent's `openGraph` entirely. So both the root
// layout and the per-edition layout spread these fields to keep og:type /
// og:locale / og:site_name present on every page.
export const OG_SITE = {
  type: 'website',
  locale: 'fr_FR',
  siteName: 'Fête de la Musique à Bordeaux',
} as const;
