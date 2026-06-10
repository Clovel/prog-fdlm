/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports -------------------------------------- */

/* Component imports ----------------------------------- */
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from 'components/ui/alert';
import DescriptionRender from 'components/DescriptionRender/DescriptionRender';

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */
import type { EventAlert as EventAlertData } from 'types/Event';

/* EventAlert component prop types --------------------- */
interface EventAlertProps {
  alert: EventAlertData;
}

/* EventAlert component -------------------------------- */
const EventAlert: React.FC<EventAlertProps> = ({ alert }) => {
  return (
    <Alert
      variant={alert.type}
      className="my-2 max-w-[450px] mx-auto"
    >
      {
        alert.title !== undefined &&
          <AlertTitle>
            {alert.title}
          </AlertTitle>
      }
      <AlertDescription className="event-description">
        <DescriptionRender markdown={alert.content} />
      </AlertDescription>
    </Alert>
  );
};

/* Export EventAlert component ------------------------- */
export default EventAlert;
