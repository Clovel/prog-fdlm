/* Module imports -------------------------------------- */
import { fromZonedTime } from 'date-fns-tz';

/* External variables ---------------------------------- */
const PARIS_ZONE: string = 'Europe/Paris';

/* Helpers --------------------------------------------- */
/**
 * Bare ISO strings in the fixtures (e.g. `2024-06-21T19:00:00`) carry no
 * timezone information and are interpreted in the runtime's local timezone
 * by `new Date(...)`. The festival is in Bordeaux, so we treat any bare
 * string as wall-clock time in Europe/Paris and convert to a UTC `Date`.
 *
 * Strings with explicit offsets (e.g. `2023-06-21T18:00:00+02:00`) and
 * already-constructed `Date` instances are passed through unchanged after
 * reserialization.
 */
export const normalizeToParis = (input: Date | string): Date => {
  if(typeof input === 'string') {
    const hasOffset: boolean = /([+-]\d{2}:?\d{2}|Z)$/.test(input);
    if(hasOffset) {
      return new Date(input);
    }
    return fromZonedTime(input, PARIS_ZONE);
  }
  // `Date` instances built from bare strings were created in local TZ.
  // We can't recover the original wall-clock intent without re-parsing,
  // so re-extract the local components and treat them as Paris wall-clock.
  const yyyy: string = String(input.getFullYear()).padStart(4, '0');
  const mm: string = String(input.getMonth() + 1).padStart(2, '0');
  const dd: string = String(input.getDate()).padStart(2, '0');
  const hh: string = String(input.getHours()).padStart(2, '0');
  const mi: string = String(input.getMinutes()).padStart(2, '0');
  const ss: string = String(input.getSeconds()).padStart(2, '0');
  const wallClock: string = `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
  return fromZonedTime(wallClock, PARIS_ZONE);
};
