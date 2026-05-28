'use client';

/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports -------------------------------------- */
import { ThemeProvider } from 'next-themes';

/* Component imports ----------------------------------- */
import Header from 'components/Header/Header';
import Copyright from 'components/Copyright/Copyright';

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
      <body className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 min-h-full flex flex-col items-center lg:p-24 lg:pt-8">
          {children}
        </main>
        <footer className="flex flex-col justify-center h-14">
          <Copyright />
        </footer>
      </body>
    </ThemeProvider>
  );
};

/* Export MainLayout component ------------------------- */
export default MainLayout;
