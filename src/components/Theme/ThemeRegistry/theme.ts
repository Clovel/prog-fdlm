'use client';

/* Module imports -------------------------------------- */
import type { ThemeOptions } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';

/* Style imports --------------------------------------- */
import GoogleInterFont from 'app/fonts/fonts';

/* Emotion/MUI theme ----------------------------------- */
// When needed::: first argument is needed if you have common enterprise theme, and second argument is to override your enterprise theme.
// apply fonts to all other typography options like headings, subtitles, etc...
const defaultTheme = createTheme(
  {
    typography: {
      fontFamily: GoogleInterFont.style.fontFamily,
      body1: { fontFamily: GoogleInterFont.style.fontFamily },
      body2: { fontFamily: GoogleInterFont.style.fontFamily },
    },
  },
  {} satisfies ThemeOptions,
);

/* Export Emotion/MUI theme ---------------------------- */
export default defaultTheme;
