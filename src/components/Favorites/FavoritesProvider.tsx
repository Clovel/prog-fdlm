'use client';

/* Framework imports ----------------------------------- */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

/* Module imports -------------------------------------- */
import { authClient } from 'auth/client';
import { getOrCreateAnonId } from 'helpers/anonId';
import {
  readStoredFavorites,
  writeStoredFavorites,
} from 'helpers/favoritesStorage';

/* Type imports ---------------------------------------- */
import type { ReactNode } from 'react';

/* Context value type ---------------------------------- */
export interface FavoritesContextValue {
  favoriteIds: ReadonlySet<string>;
  isFavorite: (eventId: string) => boolean;
  toggleFavorite: (eventId: string) => void;
  count: number;
  ready: boolean;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

/* FavoritesProvider component prop types -------------- */
interface FavoritesProviderProps {
  editionId: string;
  children: ReactNode;
}

/* FavoritesProvider component ------------------------- */
const FavoritesProvider: React.FC<FavoritesProviderProps> = (
  {
    editionId,
    children,
  },
) => {
  const { data: sessionData } = authClient.useSession();
  const isAuthed: boolean = sessionData !== null && sessionData !== undefined;

  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState<boolean>(false);
  const favoriteIdsRef = useRef<Set<string>>(favoriteIds);
  // Guards the authed reconcile so it runs once per (editionId, auth) pair.
  const reconciledRef = useRef<boolean>(false);

  /* Initial load from localStorage -------------------- */
  useEffect(
    (): void => {
      const stored: Set<string> = new Set(readStoredFavorites(editionId));
      favoriteIdsRef.current = stored;
      /* eslint-disable react-hooks/set-state-in-effect */
      setFavoriteIds(stored);
      setReady(true);
      /* eslint-enable react-hooks/set-state-in-effect */
      reconciledRef.current = false;
    },
    [editionId],
  );

  /* Authed reconcile: merge local up, then DB wins ---- */
  useEffect(
    (): void => {
      if(!isAuthed || reconciledRef.current) {
        return;
      }
      reconciledRef.current = true;
      const localIds: string[] = readStoredFavorites(editionId);

      const reconcile = async (): Promise<void> => {
        const anonId: string = getOrCreateAnonId();
        if(localIds.length > 0) {
          await fetch(
            '/api/favorites',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ eventIds: localIds }),
            },
          );
        }
        await fetch(
          '/api/favorites/claim',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ anonId }),
          },
        );
        const res: Response = await fetch(`/api/favorites?editionId=${editionId}`);
        if(!res.ok) {
          return;
        }
        const body = await res.json() as { eventIds: string[] };
        const merged: Set<string> = new Set([...localIds, ...body.eventIds]);
        favoriteIdsRef.current = merged;
        setFavoriteIds(merged);
        writeStoredFavorites(editionId, [...merged]);
      };

      reconcile().catch(
        (error: unknown): void => {
          console.error('[FavoritesProvider] reconcile failed:', error);
        },
      );
    },
    [isAuthed, editionId],
  );

  const toggleFavorite = useCallback(
    (eventId: string): void => {
      const next: Set<string> = new Set(favoriteIdsRef.current);
      const willFavorite: boolean = !next.has(eventId);
      if(willFavorite) {
        next.add(eventId);
      } else {
        next.delete(eventId);
      }
      favoriteIdsRef.current = next;
      setFavoriteIds(next);
      writeStoredFavorites(editionId, [...next]);

      if(isAuthed) {
        const request: Promise<Response> = willFavorite
          ? fetch(
            '/api/favorites',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ eventIds: [eventId] }),
            },
          )
          : fetch(`/api/favorites/${eventId}`, { method: 'DELETE' });
        request.catch(
          (error: unknown): void => {
            console.error('[FavoritesProvider] sync failed:', error);
          },
        );
      } else {
        const anonId: string = getOrCreateAnonId();
        const request: Promise<Response> = willFavorite
          ? fetch(
            '/api/favorites',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ eventIds: [eventId], anonId }),
            },
          )
          : fetch(`/api/favorites/${eventId}?anonId=${anonId}`, { method: 'DELETE' });
        request.catch(
          (error: unknown): void => {
            console.error('[FavoritesProvider] anon sync failed:', error);
          },
        );
      }
    },
    [editionId, isAuthed],
  );

  const isFavorite = useCallback(
    (eventId: string): boolean => favoriteIds.has(eventId),
    [favoriteIds],
  );

  const value: FavoritesContextValue = useMemo<FavoritesContextValue>(
    () => ({
      favoriteIds,
      isFavorite,
      toggleFavorite,
      count: favoriteIds.size,
      ready,
    }),
    [favoriteIds, isFavorite, toggleFavorite, ready],
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};

/* useFavorites hook ----------------------------------- */
export const useFavorites = (): FavoritesContextValue => {
  const context: FavoritesContextValue | null = useContext(FavoritesContext);
  if(context === null) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};

/* Export FavoritesProvider component ------------------ */
export default FavoritesProvider;
