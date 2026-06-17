'use client';

/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import { Separator } from 'components/ui/separator';
import EventCategoryView from 'components/EventCategoryView/EventCategoryView';

/* Module imports -------------------------------------- */
import { useFavorites } from './FavoritesProvider';

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';

/* FavoritesSection component prop types --------------- */
interface FavoritesSectionProps {
  events: Event[];
  feteDeLaMusiqueDay: Date;
}

/* FavoritesSection component -------------------------- */
const FavoritesSection: React.FC<FavoritesSectionProps> = (
  {
    events,
    feteDeLaMusiqueDay,
  },
) => {
  const { isFavorite } = useFavorites();
  const favoriteEvents: Event[] = events.filter((event) => isFavorite(event.id));

  if(favoriteEvents.length === 0) {
    return null;
  }

  return (
    <>
      <EventCategoryView
        categoryTitleString="Favoris"
        categoryEvents={favoriteEvents}
        feteDeLaMusiqueDay={feteDeLaMusiqueDay}
      />
      <Separator className="w-full" />
    </>
  );
};

/* Export FavoritesSection component ------------------- */
export default FavoritesSection;
