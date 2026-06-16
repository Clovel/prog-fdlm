/* Module imports -------------------------------------- */
import { format } from 'date-fns';

/* parseDateString ------------------------------------- */
/**
 * Parse a naive `"YYYY-MM-DD"` (wall-clock, no timezone) into a local Date at
 * midnight. Returns undefined for empty or malformed input. We build the Date
 * from numeric parts (not `new Date(str)`) to avoid any UTC interpretation.
 */
export const parseDateString = (value: string): Date | undefined => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if(match === null) {
    return undefined;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if(Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date;
};

/* formatDateString ------------------------------------ */
/** Format a Date as a naive `"YYYY-MM-DD"` string (local fields). */
export const formatDateString = (date: Date): string => format(date, 'yyyy-MM-dd');

/* splitDateTime --------------------------------------- */
/**
 * Split a `"YYYY-MM-DDTHH:mm"` value into its date and time halves.
 * Empty/partial input yields empty strings for the missing halves.
 */
export const splitDateTime = (value: string): { datePart: string; timePart: string } => {
  if(value === '') {
    return { datePart: '', timePart: '' };
  }
  const [datePart, timePart] = value.split('T');
  return { datePart: datePart ?? '', timePart: timePart ?? '' };
};
