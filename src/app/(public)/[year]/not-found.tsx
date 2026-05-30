/* Framework imports ----------------------------------- */
import React from 'react';
import Link from 'next/link';

/* NotFound component prop types ----------------------- */
interface NotFoundProps {}

/* NotFound component ---------------------------------- */
const NotFound: React.FC<NotFoundProps> = () => {
  return (
    <div className="flex flex-col items-center justify-center w-full p-8 text-center gap-2">
      <h1 className="text-2xl font-semibold">
        Édition introuvable
      </h1>
      <p className="text-muted-foreground">
        Cette édition de la Fête de la musique n&apos;existe pas.
      </p>
      <Link
        href="/"
        className="text-blue-600 dark:text-blue-400 underline-offset-4 hover:underline"
      >
        Revenir à l&apos;édition courante
      </Link>
    </div>
  );
};

/* Export NotFound component --------------------------- */
export default NotFound;
