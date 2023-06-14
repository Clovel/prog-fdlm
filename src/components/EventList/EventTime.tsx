/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports -------------------------------------- */

/* Component imports ----------------------------------- */
import Typography from '@mui/material/Typography';

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */

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
    <Typography
      sx={{ display: 'inline' }}
      component="span"
      variant="body2"
      color="text.primary"
    >
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
    </Typography>
  );
};

/* Export EventTime component -------------------------- */
export default EventTime;
