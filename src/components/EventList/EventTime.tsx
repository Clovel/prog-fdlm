/* Framework imports ----------------------------------- */
import React, { useMemo } from 'react';

/* Module imports -------------------------------------- */
import {
  FESTIVAL_TZ,
  festivalDayString,
  festivalNightDay,
} from 'helpers/festivalNight';

/* Constants ------------------------------------------- */
const DEFAULT_FETE_DE_LA_MUSIQUE_DAY = new Date('2026-06-21');

/* Type declarations ----------------------------------- */
type ReferenceDateInfo = {
  shouldDisplayDay: true;
  dayStr: string;
} | {
  shouldDisplayDay: false;
};

/* EventTime component prop types ---------------------- */
type EventTimeProps = ({
  startTime: Date;
  endTime?: Date;
} | {
  startTime?: Date;
  endTime: Date;
}) & {
  feteDeLaMusiqueDay?: Date;
};

/* Helper functions ------------------------------------ */
// Render a festival-night day ('YYYY-MM-DD') as a French calendar date. The
// string is a pure calendar day, so format it at UTC noon with timeZone 'UTC'
// to avoid any zone shifting back into a neighbouring day.
const formatNightDayLabel = (nightDay: string): string => {
  const [year, month, day] = nightDay.split('-').map(Number);
  const labelDate = new Date(Date.UTC(year, month - 1, day, 12));

  return labelDate.toLocaleDateString(
    'fr-FR',
    {
      day: '2-digit',
      month: 'long',
      timeZone: 'UTC',
    },
  );
};

/* EventTime component --------------------------------- */
const EventTime: React.FC<EventTimeProps> = (
  {
    startTime,
    endTime,
    feteDeLaMusiqueDay = DEFAULT_FETE_DE_LA_MUSIQUE_DAY,
  },
) => {
  const referenceDateInfo = useMemo<ReferenceDateInfo>(
    () => {
      const referenceDate: Date | undefined = startTime ?? endTime;

      if(referenceDate === undefined) {
        return {
          shouldDisplayDay: false,
        };
      }

      // Attribute the event to its festival-night day (small hours roll back
      // across the 06:00 boundary — same model as the day-only filter). Only
      // label nights other than the festival night itself.
      const nightDay: string = festivalNightDay(referenceDate);
      const shouldDisplayDay: boolean =
        nightDay !== festivalDayString(feteDeLaMusiqueDay);

      return shouldDisplayDay ?
        {
          shouldDisplayDay: true,
          dayStr: formatNightDayLabel(nightDay),
        } :
        {
          shouldDisplayDay: false,
        };
    },
    [
      startTime,
      endTime,
      feteDeLaMusiqueDay,
    ],
  );

  const timeString = useMemo<string>(
    () => {
      if(startTime === undefined) {
        if(endTime === undefined) {
          return '';
        }

        return `Jusqu'à ${endTime.toLocaleTimeString(
          'fr-FR',
          {
            hour: 'numeric',
            minute: '2-digit',
            timeZone: FESTIVAL_TZ,
          },
        )}`;
      }

      const startTimeStr = startTime.toLocaleTimeString(
        'fr-FR',
        {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: FESTIVAL_TZ,
        },
      );

      if(endTime === undefined) {
        return startTimeStr;
      }

      return `${startTimeStr} à ${endTime.toLocaleTimeString(
        'fr-FR',
        {
          hour: 'numeric',
          minute: '2-digit',
          timeZone: FESTIVAL_TZ,
        },
      )}`;
    },
    [
      startTime,
      endTime,
    ],
  );

  return (
    <div className="flex flex-col gap-0 items-end">
      {
        referenceDateInfo.shouldDisplayDay &&
          <span className="inline text-sm">
            {referenceDateInfo.dayStr}
          </span>
      }
      <span className="inline text-sm">
        {timeString}
      </span>
    </div>
  );
};

/* Export EventTime component -------------------------- */
export default EventTime;
