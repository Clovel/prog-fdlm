/* Framework imports ----------------------------------- */
import React, {
  useEffect,
  useState,
} from 'react';

/* Module imports -------------------------------------- */
import {
  setDefaults,
  fromAddress,
  OutputFormat,
} from 'react-geocode';
import EventInfoWindow from './EventInfoWindow';

/* Component imports ----------------------------------- */
import {
  useJsApiLoader,
  GoogleMap,
  Marker,
  InfoWindow,
} from '@react-google-maps/api';

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */
import type {
  GeocodeResponseData,
  LatLngLiteral,
} from '@googlemaps/google-maps-services-js';
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

setDefaults({
  // key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  key: process.env.NEXT_PUBLIC_GEOCODING_API_KEY,
  language: 'fr', // Default language for responses.
  region: 'fr', // Default region for responses.
  outputFormat: OutputFormat.JSON, // Default output format.
});

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
  const [ loadingGeocoding, setLoadingGeocoding ] = useState<boolean>(false);
  const [ eventMarkers, setEventMarkers ] = useState<MarkerInfo[]>([]);
  const [ selectedMarker, setSelectedMarker ] = useState<MarkerInfo | null>(null);

  const { isLoaded, loadError } = useJsApiLoader(
    {
      id: 'google-map-script',
      googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    }
  );

  useEffect(
    () => {
      const fetchEventMarkers = async (): Promise<void> => {
        const markers: MarkerInfo[] = [];

        for(const event of events) {
          if(
            event.location.addressStr !== undefined &&
            event.location.addressStr.length > 0
          ) {
            try {
              const data: GeocodeResponseData = await fromAddress(event.location.addressStr) as GeocodeResponseData;

              if(data.results.length > 0) {
                const { lat, lng } = data.results[0].geometry.location;

                const marker: MarkerInfo = {
                  id: event.id,
                  position: {
                    lat: lat,
                    lng: lng,
                  },
                  event: event,
                };

                markers.push(marker);
              } else {
                console.warn(`[WARN] <EventsMap> No geocoding result for address "${event.location.addressStr}"`, data);
              }
            } catch(error) {
              console.error(`[ERROR] <EventsMap> Failed to geocode address "${event.location.addressStr}" :`, error);
            }
          }
        }

        setEventMarkers(markers);
      };

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoadingGeocoding(true);
      fetchEventMarkers()
        .catch(
          (error) => {
            console.error(`[ERROR] <EventsMap> Failed to fetch event markers :`, error);
          }
        )
        .finally(
          () => {
            setLoadingGeocoding(false);
          }
        );
    },
    [
      events,
    ]
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

  return (
    <div>
      <span>
        {
          loadingGeocoding ?
            'Chargement des marqueurs...' :
            `Affichage de ${eventMarkers.length} marqueurs`
        }
      </span>
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
          eventMarkers
            .map(
              (marker) => (
                <Marker
                  key={marker.id}
                  position={marker.position}
                  title={marker.event.name ?? 'Événement sans nom'}
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
    </div>
  );
};

/* Export EventsMap component -------------------------- */
export default EventsMap;
