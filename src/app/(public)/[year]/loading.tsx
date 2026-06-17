/* Framework imports ----------------------------------- */
import type React from 'react';

/* Component imports ----------------------------------- */
import { Skeleton } from 'components/ui/skeleton';

/* EditionLoading component ---------------------------- */
// Suspense fallback while the Server Component awaits the edition + events
// queries. Mirrors the agenda's vertical rhythm so the swap to real content
// does not shift layout.
const EditionLoading: React.FC = () => {
  return (
    <div className="flex flex-col items-center w-full max-w-5xl gap-6 px-4 py-8 mx-auto">
      <Skeleton className="w-full h-12" />
      <Skeleton className="w-full h-40" />
      <Skeleton className="w-full h-40" />
      <Skeleton className="w-full h-40" />
    </div>
  );
};

/* Export EditionLoading component --------------------- */
export default EditionLoading;
