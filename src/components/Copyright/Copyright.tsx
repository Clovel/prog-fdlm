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
        className="text-blue-600 dark:text-blue-400 underline underline-offset-4"
      >
        Clovel
      </a>
      {', Copyright '}
      {new Date().getFullYear()}
      .
    </p>
  );
};

/* Export Copyright component -------------------------- */
export default Copyright;
