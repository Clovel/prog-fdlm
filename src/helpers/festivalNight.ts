/* Module imports -------------------------------------- */
import { formatInTimeZone } from 'date-fns-tz';

/* Constants ------------------------------------------- */
export const FESTIVAL_TZ = 'Europe/Paris';

// A festival "night" runs from 06:00 to 06:00 the next day: an event starting
// between midnight and 06:00 Paris belongs to the PREVIOUS calendar day's night
// (e.g. a 00:30 club night on the 21st is part of the night of the 20th). This
// single boundary is the shared source of truth for both day-only filtering and
// the per-event day label, so the two can never drift apart.
export const FESTIVAL_NIGHT_START_HOUR = 6;

const pad2 = (value: number): string => String(value).padStart(2, '0');

/* Festival-night day attribution ---------------------- */
// The Paris calendar day ('YYYY-MM-DD') an instant belongs to, with the small
// hours rolled back across the 06:00 boundary. Wall-clock based (via Paris-zoned
// formatting), so it is DST-correct and byte-identical on a UTC server and a
// Paris client — no hydration mismatch.
export const festivalNightDay = (instant: Date): string => {
  const hour: number = Number(formatInTimeZone(instant, FESTIVAL_TZ, 'H'));
  const day: string = formatInTimeZone(instant, FESTIVAL_TZ, 'yyyy-MM-dd');

  if(hour >= FESTIVAL_NIGHT_START_HOUR) {
    return day;
  }

  // Before 06:00 → the night belongs to the previous calendar day. Parse the
  // Paris day and step back one day via UTC arithmetic (calendar-only, no TZ).
  const [year, month, dayOfMonth] = day.split('-').map(Number);
  const previous = new Date(Date.UTC(year, month - 1, dayOfMonth - 1));
  return `${previous.getUTCFullYear()}-${pad2(previous.getUTCMonth() + 1)}-${pad2(previous.getUTCDate())}`;
};

// The date-only `dayOfFestival` column is a UTC-midnight Date; its UTC fields
// are the intended calendar day. Rendered as 'YYYY-MM-DD' to compare against
// festivalNightDay output.
export const festivalDayString = (feteDeLaMusiqueDay: Date): string =>
  `${feteDeLaMusiqueDay.getUTCFullYear()}-${pad2(feteDeLaMusiqueDay.getUTCMonth() + 1)}-${pad2(feteDeLaMusiqueDay.getUTCDate())}`;

// An event's start is in the festival night iff it shares the festival day's
// night — i.e. its festival-night day equals the festival day.
export const isInFestivalNight = (
  start: Date,
  feteDeLaMusiqueDay: Date,
): boolean => festivalNightDay(start) === festivalDayString(feteDeLaMusiqueDay);
