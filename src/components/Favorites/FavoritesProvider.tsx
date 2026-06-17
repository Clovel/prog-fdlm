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
import dynamic from 'next/dynamic';

/* Module imports -------------------------------------- */
import { getOrCreateAnonId } from 'helpers/anonId';
import {
  readStoredFavorites,
  writeStoredFavorites,
} from 'helpers/favoritesStorage';

/* Type imports ---------------------------------------- */
import type { ReactNode } from 'react';

/* Lazy client-only session sync ----------------------- */
// Isolates better-auth's useSession (a serverExternalPackage that breaks during
// SSR) so this provider — and the event cards it wraps — can be server-rendered.
const FavoritesAuthSync = dynamic(
  () => import('./FavoritesAuthSync'),
  { ssr: false },
);

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
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState<boolean>(false);
  const [isAuthed, setIsAuthed] = useState<boolean>(false);
  const favoriteIdsRef = useRef<Set<string>>(favoriteIds);

  /* Initial load from localStorage -------------------- */
  useEffect(
    (): void => {
      const stored: Set<string> = new Set(readStoredFavorites(editionId));
      favoriteIdsRef.current = stored;
      /* eslint-disable react-hooks/set-state-in-effect */
      setFavoriteIds(stored);
      setReady(true);
      /* eslint-enable react-hooks/set-state-in-effect */
    },
    [editionId],
  );

  /* Apply server-reconciled favorites (from FavoritesAuthSync) -- */
  const applyServerFavorites = useCallback(
    (eventIds: string[]): void => {
      const merged: Set<string> = new Set(eventIds);
      favoriteIdsRef.current = merged;
      setFavoriteIds(merged);
      writeStoredFavorites(editionId, [...merged]);
    },
    [editionId],
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
      <FavoritesAuthSync
        editionId={editionId}
        onAuthChange={setIsAuthed}
        onServerFavorites={applyServerFavorites}
      />
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
