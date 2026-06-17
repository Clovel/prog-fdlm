'use client';

/* Framework imports ----------------------------------- */
import React, { useEffect } from 'react';

/* Component imports ----------------------------------- */
import { Button } from 'components/ui/button';

/* EditionError component prop types ------------------- */
interface EditionErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/* EditionError component ------------------------------ */
const EditionError: React.FC<EditionErrorProps> = ({ error, reset }) => {
  useEffect(
    (): void => {
      console.error('[EditionPage] load failed:', error);
    },
    [error],
  );

  return (
    <div className="flex flex-col items-center gap-4 w-full py-16">
      <p className="text-destructive">Impossible de charger les événements.</p>
      <Button variant="outline" onClick={(): void => { reset(); }}>
        Réessayer
      </Button>
    </div>
  );
};

/* Export EditionError component ----------------------- */
export default EditionError;
