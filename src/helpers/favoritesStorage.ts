/* Internal variables ---------------------------------- */
const STORAGE_PREFIX = 'fdlm:favorites:';

/** Fallback store used when localStorage is unavailable (e.g. private mode). */
const memoryFallback: Map<string, string[]> = new Map();

const storageKey = (editionId: string): string => `${STORAGE_PREFIX}${editionId}`;

/* Helpers --------------------------------------------- */
/** Reads the stored favorite event ids for an edition. Returns [] when none/SSR. */
export const readStoredFavorites = (editionId: string): string[] => {
  const key: string = storageKey(editionId);
  if(typeof window === 'undefined') {
    return [];
  }
  try {
    const raw: string | null = window.localStorage.getItem(key);
    if(raw === null) {
      return memoryFallback.get(key) ?? [];
    }
    const parsed: unknown = JSON.parse(raw);
    if(Array.isArray(parsed)) {
      return parsed.filter((value): value is string => typeof value === 'string');
    }
    return [];
  } catch{
    return memoryFallback.get(key) ?? [];
  }
};

/** Writes favorite event ids for an edition (mirrors to memory too). */
export const writeStoredFavorites = (editionId: string, eventIds: string[]): void => {
  const key: string = storageKey(editionId);
  memoryFallback.set(key, eventIds);
  if(typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(eventIds));
  } catch{
    /* private mode / quota exceeded — memoryFallback already holds the value */
  }
};
