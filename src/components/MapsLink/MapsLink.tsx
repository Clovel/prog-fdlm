'use client';

/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports -------------------------------------- */
import { cn } from 'lib/utils';
import {
  buildMapsQuery,
  buildMapsUrl,
  getMapsPlatform,
} from 'helpers/mapsUrl';

/* Component imports ----------------------------------- */
import { MapPin } from 'lucide-react';
import { Button } from 'components/ui/button';

/* Type imports ---------------------------------------- */
import type { Location } from 'types/Location';

/* MapsLink component prop types ----------------------- */
interface MapsLinkProps {
  location: Location;
  variant: 'inline' | 'button';
}

/* MapsLink component ---------------------------------- */
const MapsLink: React.FC<MapsLinkProps> = (
  {
    location,
    variant,
  },
) => {
  const query: string = buildMapsQuery(location);

  if(query.length === 0) return null;

  // href is ALWAYS the universal Google Maps URL: identical on server and
  // client (no hydration mismatch) and a working no-JS fallback. The native
  // redirect happens on click, when `navigator` is available.
  const href: string = buildMapsUrl(query, 'other');

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>): void => {
    const platform = getMapsPlatform();

    if(platform === 'other') return; // let the https link open in a new tab

    event.preventDefault();
    window.location.href = buildMapsUrl(query, platform);
  };

  if(variant === 'button') {
    return (
      <div className="mt-4">
        <Button
          asChild
          variant="outline"
          size="sm"
        >
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
          >
            <MapPin className="h-4 w-4" />
            Voir l&apos;itinéraire
          </a>
        </Button>
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={
        cn(
          'inline-flex items-start gap-1 text-sm',
          'text-blue-600 dark:text-blue-400 underline underline-offset-4',
        )
      }
    >
      <MapPin className="h-4 w-4 shrink-0 translate-y-0.5" />
      <span>
        {location.addressStr}
      </span>
    </a>
  );
};

/* Export MapsLink component --------------------------- */
export default MapsLink;
