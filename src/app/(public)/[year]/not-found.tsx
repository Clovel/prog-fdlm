/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import NotFoundView from 'components/NotFoundView/NotFoundView';

/* NotFound component prop types ----------------------- */
interface NotFoundProps {}

/* NotFound component ---------------------------------- */
const NotFound: React.FC<NotFoundProps> = () => {
  return (
    <NotFoundView
      title="Oups, fausse note 🎵"
      message="Cette édition de la Fête de la Musique n'existe pas (ou pas encore)."
      ctaHref="/"
      ctaLabel="Revenir à l'accueil"
    />
  );
};

/* Export NotFound component --------------------------- */
export default NotFound;
