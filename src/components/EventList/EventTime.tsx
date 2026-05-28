/* Framework imports ----------------------------------- */
import React from 'react';

/* EventTime component prop types ---------------------- */
interface EventTimeProps {
  startTime: Date;
  endTime?: Date;
}

/* EventTime component --------------------------------- */
const EventTime: React.FC<EventTimeProps> = (
  {
    startTime,
    endTime,
  }
) => {
  return (
    <span className="inline text-sm">
      {
        endTime !== undefined ?
          'De ' :
          'À '
      }
      {
        startTime.toLocaleTimeString(
          'fr-FR',
          {
            hour: '2-digit',
            minute: '2-digit',
          }
        )
      }
      {
        endTime !== undefined &&
          <>
            {' à '}
            {
              endTime.toLocaleTimeString(
                'fr-FR',
                {
                  hour: 'numeric',
                  minute: '2-digit',
                }
              )
            }
          </>
      }
    </span>
  );
};

/* Export EventTime component -------------------------- */
export default EventTime;
