/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import Header from 'components/Header/Header';
import Copyright from 'components/Copyright/Copyright';
import NotFoundView from 'components/NotFoundView/NotFoundView';

/* NotFound component prop types ----------------------- */
interface NotFoundProps {}

/* NotFound component ---------------------------------- */
const NotFound: React.FC<NotFoundProps> = () => {
  return (
    <>
      <Header />
      <main className="flex-1 min-h-full flex flex-col items-center lg:p-24 lg:pt-8">
        <NotFoundView
          title="Oups, page introuvable 🎵"
          message="Cette page n'existe pas."
          ctaHref="/"
          ctaLabel="Revenir à l'accueil"
        />
      </main>
      <footer className="flex flex-col justify-center h-14">
        <Copyright />
      </footer>
    </>
  );
};

/* Export NotFound component --------------------------- */
export default NotFound;
