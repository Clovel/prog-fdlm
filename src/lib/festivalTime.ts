/* Module imports -------------------------------------- */
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';

/* Constants ------------------------------------------- */
const PARIS_ZONE = 'Europe/Paris';

/* Helpers --------------------------------------------- */
/**
 * Interpret a `datetime-local` value ("2024-06-21T19:00", no zone) as
 * Europe/Paris wall-clock time and return the corresponding UTC Date.
 * Mirrors the seed's normalizeToParis approach (date-fns-tz fromZonedTime).
 */
export const parisInputToUtc = (localValue: string): Date => {
  return fromZonedTime(localValue, PARIS_ZONE);
};

/**
 * Format a UTC instant as a Paris `datetime-local` string (yyyy-MM-ddTHH:mm)
 * for pre-filling the edit form.
 */
export const toParisInput = (date: Date): string => {
  return formatInTimeZone(date, PARIS_ZONE, "yyyy-MM-dd'T'HH:mm");
};
