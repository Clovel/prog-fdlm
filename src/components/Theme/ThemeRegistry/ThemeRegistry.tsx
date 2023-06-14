'use client';

/* Framework imports ----------------------------------- */
import * as React from 'react';

/* Module imports -------------------------------------- */
import theme from './theme';

/* Component imports ----------------------------------- */
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import NextAppDirEmotionCacheProvider from './EmotionCache';

/* ThemeRegistry component prop types ------------------ */
interface ThemeRegistryProps {
  children: React.ReactNode;
}

/* ThemeRegistry component prop types ------------------ */
const ThemeRegistry: React.FC <ThemeRegistryProps> = ({ children }) => {
  return (
    <React.Fragment>
      <CssBaseline />
      <NextAppDirEmotionCacheProvider options={{ key: 'mui' }}>
        <ThemeProvider theme={theme}>
          {children}
        </ThemeProvider>
      </NextAppDirEmotionCacheProvider>
    </React.Fragment>
  );
};

/* Export ThemeRegistry component ---------------------- */
export default ThemeRegistry;
