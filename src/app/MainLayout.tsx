'use client';

/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports -------------------------------------- */
import { ThemeProvider } from 'next-themes';

/* Component imports ----------------------------------- */
import { HeaderProvider } from './HeaderContext';

/* MainLayout component prop types --------------------- */
interface MainLayoutProps {
  children: React.ReactNode;
}

/* MainLayout component -------------------------------- */
const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <HeaderProvider>
        {children}
      </HeaderProvider>
    </ThemeProvider>
  );
};

/* Export MainLayout component ------------------------- */
export default MainLayout;
