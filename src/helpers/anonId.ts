/* Internal variables ---------------------------------- */
const ANON_ID_KEY = 'fdlm:anon-id';

/** Memory fallback for private mode / disabled storage (per page load). */
let memoryAnonId: string | null = null;

const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/* Helper ---------------------------------------------- */
/**
 * Returns this device's stable anonymous favorite id, creating and persisting
 * one on first use. Client-only — returns a throwaway id during SSR.
 */
export const getOrCreateAnonId = (): string => {
  if(typeof window === 'undefined') {
    return memoryAnonId ?? (memoryAnonId = crypto.randomUUID());
  }
  try {
    const existing: string | null = window.localStorage.getItem(ANON_ID_KEY);
    if(existing !== null && isUuid(existing)) {
      return existing;
    }
    const created: string = crypto.randomUUID();
    window.localStorage.setItem(ANON_ID_KEY, created);
    memoryAnonId = created;
    return created;
  } catch{
    return memoryAnonId ?? (memoryAnonId = crypto.randomUUID());
  }
};
