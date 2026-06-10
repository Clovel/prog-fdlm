/* Events category order fixture ----------------------- */
export const eventCategories = [
  'Centre ville',
  'St. Michel',
  'St. Genès',
  'Chartrons',
  'Bassins à flot',
  'Rive droite',
  'Ambulant',
  'Bordeaux ouest',
  'Bordeaux sud',
  'Bordeaux nord',
  'Talence',
  'Pessac',
  'Villenave-d\'Ornon',
  'Mérignac',
  'Blanquefort',
  'Saint-Médard-en-Jalles',
] as const;

export type EventCategory = typeof eventCategories[number];
