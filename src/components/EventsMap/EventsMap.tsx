'use client';

/* Framework imports ----------------------------------- */
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

/* Module imports -------------------------------------- */
import { useFavorites } from 'components/Favorites/FavoritesProvider';
import { cn } from 'lib/utils';

/* Component imports ----------------------------------- */
import { MapPin } from 'lucide-react';
import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  useMap,
} from 'components/ui/map';
import { Switch } from 'components/ui/switch';
import { Label } from 'components/ui/label';
import EventInfoWindow from './EventInfoWindow';

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';
import type { MapRef } from 'components/ui/map';

/* Type declarations ----------------------------------- */
export interface MarkerInfo {
  id: string;
  position: {
    lat: number;
    lng: number;
  };
  event: Event;
  isFavorite: boolean;
}

export interface MapFocusTarget {
  id: string;
  nonce: number;
}

/* Internal variables ---------------------------------- */
// IGN Géoplateforme PLAN.IGN vector style — keyless, served by IGN. Used for
// both themes (the map stays light; the popup respects dark mode on its own).
const IGN_STYLE = 'https://data.geopf.fr/annexes/ressources/vectorTiles/styles/PLAN.IGN/standard.json' as const;

const center = {
  lat: 44.840912,
  lng: -0.571377,
} as const satisfies { lat: number; lng: number };

/* LockBearing component ------------------------------- */
// Disables map rotation (mouse drag-rotate and two-finger touch rotate) so the
// map can never be turned off true-north. Rendered inside <Map> to reach the
// MapLibre instance via context.
const LockBearing: React.FC = () => {
  const { map } = useMap();

  useEffect(
    (): void => {
      if(map === null) {
        return;
      }
      map.dragRotate.disable();
      map.touchZoomRotate.disableRotation();
      map.setBearing(0);
    },
    [map],
  );

  return null;
};

/* EventsMap component prop types ---------------------- */
interface EventsMapProps {
  eventMarkers: MarkerInfo[];
  expanded: boolean;
  focusTarget: MapFocusTarget | null;
}

/* EventsMap component --------------------------------- */
const EventsMap: React.FC<EventsMapProps> = (
  {
    eventMarkers = [],
    expanded,
    focusTarget,
  },
) => {
  const { isFavorite, count } = useFavorites();
  const [ onlyFavorites, setOnlyFavorites ] = useState<boolean>(false);
  const [ selectedId, setSelectedId ] = useState<string | null>(null);
  const mapRef = useRef<MapRef>(null);

  // Pan the marker into the lower third of the viewport so its popup (which
  // opens above the pin) stays fully visible — including on mobile.
  const recenterOn = useCallback(
    (lng: number, lat: number): void => {
      mapRef.current?.flyTo({ center: [ lng, lat ], offset: [ 0, 175 ], duration: 400 });
    },
    [],
  );

  // The map is kept mounted while the section is collapsed (display:none), which
  // zeroes its size; resize once it becomes visible again so it fills its box.
  useEffect(
    (): void => {
      if(expanded) {
        mapRef.current?.resize();
      }
    },
    [expanded],
  );

  // Recenter whenever the open marker changes. Driven by selection state (set by
  // a native tap's open event or by a focus request) rather than the marker's
  // DOM click, which is unreliable on touch under cooperativeGestures.
  useEffect(
    (): void => {
      if(selectedId === null) {
        return;
      }
      const target = eventMarkers.find((marker) => marker.id === selectedId);
      if(target === undefined) {
        return;
      }
      recenterOn(target.position.lng, target.position.lat);
    },
    [
      selectedId,
      eventMarkers,
      recenterOn,
    ],
  );

  // A focus request (from a list event's "Voir sur la carte") opens that event's
  // popup. Clear the favorites filter first so the target marker is visible, then
  // select it (the controlled MarkerPopup opens; the effect above recenters).
  // No-op if the id has no marker.
  useEffect(
    (): void => {
      if(focusTarget === null) {
        return;
      }
      const target = eventMarkers.find((marker) => marker.id === focusTarget.id);
      if(target === undefined) {
        return;
      }
      setOnlyFavorites(false); // eslint-disable-line react-hooks/set-state-in-effect
      setSelectedId(focusTarget.id);
    },
    [
      focusTarget,
      eventMarkers,
    ],
  );

  // Falls back to "show all" when there are no favorites, so the filter can't
  // strand the user on an empty map while the Switch is disabled.
  const favoritesOnly: boolean = onlyFavorites && count > 0;
  const visibleMarkers: MarkerInfo[] = eventMarkers.filter(
    (marker) => !favoritesOnly || isFavorite(marker.id),
  );

  return (
    <div>
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
          <LockBearing />
          <MapControls position="bottom-right" showZoom />
          {
            visibleMarkers.map(
              (marker) => {
                return (
                  <MapMarker
                    key={marker.id}
                    longitude={marker.position.lng}
                    latitude={marker.position.lat}
                    anchor="bottom"
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
                      open={selectedId === marker.id}
                      onOpenChange={
                        (isOpen: boolean): void => {
                          setSelectedId(
                            (previous) => isOpen ? marker.id : previous === marker.id ? null : previous,
                          );
                        }
                      }
                      closeButton
                      anchor="bottom"
                      offset={40}
                      className="max-w-[85vw] overflow-y-auto sm:max-w-80 max-h-[320px] sm:max-h-[360px]"
                    >
                      <EventInfoWindow markerInfo={marker} />
                    </MarkerPopup>
                  </MapMarker>
                );
              }
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
