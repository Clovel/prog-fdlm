/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports -------------------------------------- */
import slugify from 'slugify';
import { useFavorites } from 'components/Favorites/FavoritesProvider';
import { cn } from 'lib/utils';

/* Component imports ----------------------------------- */
import { CirclePlus, Star } from 'lucide-react';
import { Button } from 'components/ui/button';
import DescriptionRender from 'components/DescriptionRender/DescriptionRender';

/* Type imports ---------------------------------------- */
import type { MarkerInfo } from './EventsMap';

/* EventInfoWindow component prop types ---------------- */
interface EventInfoWindowProps {
  markerInfo: MarkerInfo;
}

/* EventInfoWindow component --------------------------- */
const EventInfoWindow: React.FC<EventInfoWindowProps> = (
  {
    markerInfo,
  },
) => {
  const { toggleFavorite } = useFavorites();

  const onSeeMoreClick: React.MouseEventHandler<HTMLButtonElement> = () => {
    /* TODO : Scroll down to the corresponding EventListItem component */
    const eventListItem = document.getElementById(
      markerInfo.event.name !== undefined ?
        `event-${slugify(markerInfo.event.name)}` :
        `event-${markerInfo.event.id}`
    );
    if(eventListItem) {
      eventListItem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleToggleFavorite: React.MouseEventHandler<HTMLButtonElement> = () => {
    toggleFavorite(markerInfo.event.id);
  };

  return (
    <div>
      <h5 className="text-xl font-semibold pr-12">
        {markerInfo.event.name}
      </h5>
      <h6 className="text-base font-semibold mt-2">
        Adresse :
      </h6>
      <p>
        {markerInfo.event.location.name}
      </p>
      <p>
        {markerInfo.event.location.addressStr}
      </p>
      <div className="w-full py-2 flex items-center gap-2">
        <Button
          variant="outline"
          className="grow"
          size="sm"
          onClick={onSeeMoreClick}
        >
          Voir plus
          <CirclePlus className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          className="grow"
          size="sm"
          onClick={handleToggleFavorite}
        >
          {
            markerInfo.isFavorite === true ?
              'Retirer des favoris' :
              'Ajouter aux favoris'
          }
          <Star
            className={
              cn(
                'h-4 w-4',
                markerInfo.isFavorite === true ?
                  'fill-amber-400 text-amber-400 dark:fill-amber-300 dark:text-amber-300' :
                  'text-muted-foreground',
              )
            }
          />
        </Button>
      </div>
      {/* TODO : Add time of event here */}
      {
        markerInfo.event.links !== undefined &&
        markerInfo.event.links.length > 0 &&
          <>
            <h6 className="text-base font-semibold">
              Liens :
            </h6>
            <ul>
              {
                markerInfo.event.links.map(
                  (link, index) => (
                    <li key={`${link.url}-${index}`}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-blue-600 dark:text-blue-400 underline underline-offset-4"
                      >
                        {link.label}
                      </a>
                    </li>
                  ),
                )
              }
            </ul>
          </>
      }
      {
        markerInfo.event.description !== undefined &&
          <>
            <h6 className="text-base font-semibold mt-2">
              Description :
            </h6>
            <div>
              <DescriptionRender markdown={markerInfo.event.description} />
            </div>
          </>
      }
      {/* TODO : Add "click to scroll to event" button here */}
    </div>
  );
};

/* Export EventInfoWindow component -------------------- */
export default EventInfoWindow;
