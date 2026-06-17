'use client';

/* Framework imports ----------------------------------- */
import { useEffect, useRef } from 'react';

/* Module imports -------------------------------------- */
import { authClient } from 'auth/client';
import { getOrCreateAnonId } from 'helpers/anonId';
import { readStoredFavorites } from 'helpers/favoritesStorage';

/* Type imports ---------------------------------------- */
import type React from 'react';

/* FavoritesAuthSync component prop types -------------- */
interface FavoritesAuthSyncProps {
  editionId: string;
  onAuthChange: (isAuthed: boolean) => void;
  onServerFavorites: (eventIds: string[]) => void;
}

/* FavoritesAuthSync component ------------------------- */
// Loaded by FavoritesProvider via next/dynamic with ssr:false. It calls
// better-auth's useSession, which cannot run during SSR (better-auth is a
// serverExternalPackage → a second React copy → "invalid hook call"). Isolating
// it here lets FavoritesProvider — and the event cards it wraps — render on the
// server. Renders nothing.
const FavoritesAuthSync: React.FC<FavoritesAuthSyncProps> = (
  {
    editionId,
    onAuthChange,
    onServerFavorites,
  },
) => {
  const { data: sessionData } = authClient.useSession();
  const isAuthed: boolean = sessionData !== null && sessionData !== undefined;
  // Guards the authed reconcile so it runs once per (editionId, auth) pair.
  const reconciledRef = useRef<boolean>(false);

  // Report auth state up so the provider's toggle picks DB vs anon sync.
  useEffect(
    (): void => {
      onAuthChange(isAuthed);
    },
    [isAuthed, onAuthChange],
  );

  // Reset the reconcile guard when edition or auth changes.
  useEffect(
    (): void => {
      reconciledRef.current = false;
    },
    [editionId, isAuthed],
  );

  // Authed reconcile: merge local up, claim anon, then DB wins.
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
        onServerFavorites([...localIds, ...body.eventIds]);
      };

      reconcile().catch(
        (error: unknown): void => {
          console.error('[FavoritesAuthSync] reconcile failed:', error);
        },
      );
    },
    [isAuthed, editionId, onServerFavorites],
  );

  return null;
};

/* Export FavoritesAuthSync component ------------------ */
export default FavoritesAuthSync;
