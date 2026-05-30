/* Framework imports ----------------------------------- */
import React from 'react';

/* EventsPlaceholderPage component --------------------- */
const EventsPlaceholderPage = (): React.ReactElement => {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">Événements</h1>
      <p className="text-muted-foreground">Bientôt disponible.</p>
    </div>
  );
};

/* Export EventsPlaceholderPage component --------------- */
export default EventsPlaceholderPage;
