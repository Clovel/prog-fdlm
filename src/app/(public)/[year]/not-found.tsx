/* Framework imports ----------------------------------- */
import React from 'react';
import Link from 'next/link';

/* Component imports ----------------------------------- */
import { Button } from 'components/ui/button';
import Music404 from './Music404';

/* NotFound component prop types ----------------------- */
interface NotFoundProps {}

/* NotFound component ---------------------------------- */
const NotFound: React.FC<NotFoundProps> = () => {
  return (
    <div className="flex flex-col items-center justify-center w-full p-8 text-center gap-4">
      <Music404 />
      <h1 className="text-2xl font-semibold">
        Oups, fausse note 🎵
      </h1>
      <p className="text-muted-foreground max-w-md">
        Cette édition de la Fête de la Musique n&apos;existe pas (ou pas encore).
      </p>
      <Button asChild>
        <Link href="/">Revenir à l&apos;accueil</Link>
      </Button>
    </div>
  );
};

/* Export NotFound component --------------------------- */
export default NotFound;
