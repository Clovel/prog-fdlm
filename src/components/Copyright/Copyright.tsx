/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import Typography from '@mui/material/Typography';
import MuiLink from '@mui/material/Link';

/* Copyright component --------------------------------- */
const Copyright: React.FC = () => {
  return (
    <Typography
      variant="body2"
      color="text.secondary"
      align="center"
    >
      {'Made with ❤️ by '}
      <MuiLink
        color="inherit"
        href="https://github.com/Clovel"
        target="_blank"
        rel="noopener noreferrer"
      >
        Clovis Durand
      </MuiLink>
      {' '}
      {new Date().getFullYear()}
      .
    </Typography>
  );
};

/* Export Copyright component -------------------------- */
export default Copyright;
