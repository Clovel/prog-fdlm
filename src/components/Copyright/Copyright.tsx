/* Framework imports ----------------------------------- */
import React from 'react';

/* Copyright component --------------------------------- */
const Copyright: React.FC = () => {
  return (
    <p className="text-sm text-muted-foreground text-center">
      {'Made with ❤️ by '}
      <a
        href="https://github.com/Clovel"
        target="_blank"
        rel="noopener noreferrer"
        className="underline-offset-4 hover:underline"
      >
        Clovis Durand
      </a>
      {', Copyright '}
      {new Date().getFullYear()}
      .
    </p>
  );
};

/* Export Copyright component -------------------------- */
export default Copyright;
