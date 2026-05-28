/* Framework imports ----------------------------------- */
import React, { useMemo } from 'react';

/* Constants ------------------------------------------- */
const DEFAULT_FETE_DE_LA_MUSIQUE_DAY = new Date('2026-06-21');
const FESTIVAL_NIGHT_MORNING_CUTOFF_HOUR = 12 as const;

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
const isSameCalendarDay = (
  date: Date,
  referenceDate: Date,
): boolean => {
  return (
    date.getFullYear() === referenceDate.getFullYear() &&
    date.getMonth() === referenceDate.getMonth() &&
    date.getDate() === referenceDate.getDate()
  );
};

const isMorningAfterFeteDeLaMusique = (
  date: Date,
  feteDeLaMusiqueDay: Date,
): boolean => {
  const morningAfterFeteDeLaMusique = new Date(feteDeLaMusiqueDay);
  morningAfterFeteDeLaMusique.setDate(feteDeLaMusiqueDay.getDate() + 1);

  return (
    isSameCalendarDay(date, morningAfterFeteDeLaMusique) &&
    date.getHours() < FESTIVAL_NIGHT_MORNING_CUTOFF_HOUR
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

      const providedTimes = [
        startTime,
        endTime,
      ].filter((date): date is Date => date !== undefined);

      const shouldTreatAsFeteDeLaMusiqueDay = providedTimes.every(
        (date) => {
          return isMorningAfterFeteDeLaMusique(
            date,
            feteDeLaMusiqueDay,
          );
        },
      );

      const shouldDisplayDay = (
        !shouldTreatAsFeteDeLaMusiqueDay &&
        !isSameCalendarDay(referenceDate, feteDeLaMusiqueDay)
      );

      return shouldDisplayDay ?
        {
          shouldDisplayDay: true,
          dayStr: referenceDate.toLocaleDateString(
            'fr-FR',
            {
              day: '2-digit',
              month: 'long',
            },
          ),
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
          },
        )}`;
      }

      const startTimeStr = startTime.toLocaleTimeString(
        'fr-FR',
        {
          hour: '2-digit',
          minute: '2-digit',
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
