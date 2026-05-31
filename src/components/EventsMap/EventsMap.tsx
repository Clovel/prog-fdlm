/* Framework imports ----------------------------------- */
import React, {
  useMemo,
  useState,
} from 'react';

/* Module imports -------------------------------------- */
import EventInfoWindow from './EventInfoWindow';
import { useFavorites } from 'components/Favorites/FavoritesProvider';

/* Component imports ----------------------------------- */
import {
  useJsApiLoader,
  GoogleMap,
  Marker,
  InfoWindow,
} from '@react-google-maps/api';
import { Switch } from 'components/ui/switch';
import { Label } from 'components/ui/label';

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */
import type { LatLngLiteral } from '@googlemaps/google-maps-services-js';
import type { Event } from 'types/Event';

/* Type declarations ----------------------------------- */
export interface MarkerInfo {
  id: string;
  position: LatLngLiteral;
  event: Event;
}

/* Internal variables ---------------------------------- */
const mapContainerStyle: React.CSSProperties = {
  width: '100%',
  height: '600px',
};

const center: LatLngLiteral = {
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
  const [ selectedMarker, setSelectedMarker ] = useState<MarkerInfo | null>(null);
  const [ onlyFavorites, setOnlyFavorites ] = useState<boolean>(false);

  const { isLoaded, loadError } = useJsApiLoader(
    {
      id: 'google-map-script',
      googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    }
  );

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

  if(loadError !== undefined) {
    return (
      <div>
        <p>
          Erreur de chargement de la carte :
          {' '}
          {loadError.message}
        </p>
      </div>
    );
  }

  if(!isLoaded) {
    return (
      <div>
        <p>
          Chargement de la carte...
        </p>
      </div>
    );
  }

  const favoriteMarkerIcon: google.maps.Symbol = {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 9,
    fillColor: '#f59e0b',
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 2,
  };

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
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={13}
        options={
          {
            mapTypeControl: true,
            streetViewControl: false,
            minZoom: 10,
            maxZoom: 18,
            disableDefaultUI: true,
            styles: [
              {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [
                  {
                    visibility: 'off',
                  },
                ],
              },
            ],
          }
        }
        onClick={(): void => setSelectedMarker(null)}
      >
        {
          visibleMarkers
            .map(
              (marker) => (
                <Marker
                  key={marker.id}
                  position={marker.position}
                  title={marker.event.name ?? 'Événement sans nom'}
                  icon={isFavorite(marker.id) ? favoriteMarkerIcon : undefined}
                  onClick={(): void => setSelectedMarker(marker)}
                />
              )
            )
        }
        {
          selectedMarker &&
            <InfoWindow
              position={selectedMarker.position}
              onCloseClick={(): void => setSelectedMarker(null)}
              options={
                {
                  minWidth: 300,
                }
              }
            >
              <EventInfoWindow markerInfo={selectedMarker} />
            </InfoWindow>
        }
      </GoogleMap>
      <p className="text-muted-foreground mt-2 text-xs">
        Géocodage : Base Adresse Nationale (data.gouv.fr)
      </p>
    </div>
  );
};

/* Export EventsMap component -------------------------- */
export default EventsMap;
