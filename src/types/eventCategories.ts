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
  'Bègles',
  'Talence',
  'Pessac',
  'Villenave-d\'Ornon',
  'Mérignac',
  'Blanquefort',
  'Saint-Médard-en-Jalles',
] as const;

export type EventCategory = typeof eventCategories[number];

export type EventCategorySettings = {
  openByDefault: boolean;
};

export type EventCategorySettingsByCategory = {
  [category in EventCategory]: EventCategorySettings;
};

export const eventCategorySettingsByCategory = {
  'Centre ville': {
    openByDefault: true,
  },
  'St. Michel': {
    openByDefault: true,
  },
  'St. Genès': {
    openByDefault: true,
  },
  'Chartrons': {
    openByDefault: true,
  },
  'Bassins à flot': {
    openByDefault: true,
  },
  'Rive droite': {
    openByDefault: true,
  },
  'Ambulant': {
    openByDefault: true,
  },
  'Bordeaux ouest': {
    openByDefault: true,
  },
  'Bordeaux sud': {
    openByDefault: true,
  },
  'Bordeaux nord': {
    openByDefault: true,
  },
  'Bègles': {
    openByDefault: false,
  },
  'Talence': {
    openByDefault: false,
  },
  'Pessac': {
    openByDefault: false,
  },
  'Villenave-d\'Ornon': {
    openByDefault: false,
  },
  'Mérignac': {
    openByDefault: false,
  },
  'Blanquefort': {
    openByDefault: false,
  },
  'Saint-Médard-en-Jalles': {
    openByDefault: false,
  },
} as const satisfies EventCategorySettingsByCategory;
