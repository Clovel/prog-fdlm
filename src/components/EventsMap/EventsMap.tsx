'use client';

/* Framework imports ----------------------------------- */
import React, {
  useMemo,
  useRef,
  useState,
} from 'react';

/* Module imports -------------------------------------- */
import EventInfoWindow from './EventInfoWindow';
import { useFavorites } from 'components/Favorites/FavoritesProvider';
import { cn } from 'lib/utils';

/* Component imports ----------------------------------- */
import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerPopup,
} from 'components/ui/map';
import { Switch } from 'components/ui/switch';
import { Label } from 'components/ui/label';
import { MapPin } from 'lucide-react';

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';
import type { MapRef } from 'components/ui/map';

/* Type declarations ----------------------------------- */
export interface MarkerInfo {
  id: string;
  position: { lat: number; lng: number };
  event: Event;
}

/* Internal variables ---------------------------------- */
// IGN Géoplateforme PLAN.IGN vector style — keyless, served by IGN. Used for
// both themes (the map stays light; the popup respects dark mode on its own).
const IGN_STYLE = 'https://data.geopf.fr/annexes/ressources/vectorTiles/styles/PLAN.IGN/standard.json';

const center: { lat: number; lng: number } = {
  lat: 44.840912,
  lng: -0.571377,
};

/* EventsMap component prop types ---------------------- */
interface EventsMapProps {
  events: Event[];
}

/* EventsMap component --------------------------------- */
const EventsMap: React.FC<EventsMapProps> = (
  {
    events = [],
  },
) => {
  const { isFavorite, count } = useFavorites();
  const [ onlyFavorites, setOnlyFavorites ] = useState<boolean>(false);
  const mapRef = useRef<MapRef>(null);

  // Pan the tapped marker into the lower third of the viewport so its popup
  // (which opens above the pin) stays fully visible — including on mobile.
  const recenterOn = (lng: number, lat: number): void => {
    mapRef.current?.flyTo({ center: [ lng, lat ], offset: [ 0, 175 ], duration: 400 });
  };

  const eventMarkers = useMemo<MarkerInfo[]>(
    () => {
      const markers: MarkerInfo[] = [];
      for(const event of events) {
        const coords = event.location.coords;
        if(coords !== undefined) {
          markers.push({ id: event.id, position: { lat: coords.lat, lng: coords.lng }, event });
        }
      }
      return markers;
    },
    [events],
  );

  // Falls back to "show all" when there are no favorites, so the filter can't
  // strand the user on an empty map while the Switch is disabled.
  const favoritesOnly: boolean = onlyFavorites && count > 0;
  const visibleMarkers: MarkerInfo[] = eventMarkers.filter(
    (marker) => !favoritesOnly || isFavorite(marker.id),
  );

  return (
    <div>
      <span>
        {`Affichage de ${visibleMarkers.length} marqueurs`}
      </span>
      <div className="flex items-center gap-2 py-2">
        <Switch
          id="only-favorites"
          checked={favoritesOnly}
          onCheckedChange={setOnlyFavorites}
          disabled={count === 0}
        />
        <Label
          htmlFor="only-favorites"
          className="text-sm"
        >
          Afficher seulement les favoris
        </Label>
      </div>
      <div className="h-[600px] w-full overflow-hidden rounded-md border border-border">
        <Map
          ref={mapRef}
          styles={{ light: IGN_STYLE, dark: IGN_STYLE }}
          center={[ center.lng, center.lat ]}
          zoom={13}
          minZoom={10}
          maxZoom={18}
          cooperativeGestures
          attributionControl={{ compact: true, customAttribution: '© IGN — Géoplateforme' }}
        >
          <MapControls position="bottom-right" showZoom />
          {
            visibleMarkers.map(
              (marker) => (
                <MapMarker
                  key={marker.id}
                  longitude={marker.position.lng}
                  latitude={marker.position.lat}
                  anchor="bottom"
                  onClick={(): void => recenterOn(marker.position.lng, marker.position.lat)}
                >
                  <MarkerContent>
                    <MapPin
                      aria-label={marker.event.name ?? 'Événement sans nom'}
                      className={cn(
                        'size-8 drop-shadow-md',
                        isFavorite(marker.id) ? 'text-amber-400' : 'text-red-600',
                      )}
                      fill="currentColor"
                      stroke="#ffffff"
                      strokeWidth={1.5}
                    />
                  </MarkerContent>
                  <MarkerPopup
                    closeButton
                    anchor="bottom"
                    offset={40}
                    className="max-w-[85vw] overflow-y-auto sm:max-w-80 max-h-[320px] sm:max-h-[360px]"
                  >
                    <EventInfoWindow markerInfo={marker} />
                  </MarkerPopup>
                </MapMarker>
              ),
            )
          }
        </Map>
      </div>
      <p className="text-muted-foreground mt-2 text-xs">
        Géocodage : Base Adresse Nationale (IGN Géoplateforme) · Fond de carte : IGN
      </p>
    </div>
  );
};

/* Export EventsMap component -------------------------- */
export default EventsMap;
