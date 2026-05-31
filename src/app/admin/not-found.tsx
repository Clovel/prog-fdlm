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
      title="Page introuvable 🎵"
      message="Cette page n'existe pas dans l'administration."
      ctaHref="/admin"
      ctaLabel="Retour au tableau de bord"
    />
  );
};

/* Export NotFound component --------------------------- */
export default NotFound;
