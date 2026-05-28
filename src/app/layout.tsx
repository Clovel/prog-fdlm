/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports -------------------------------------- */

/* Component imports ----------------------------------- */
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import MainLayout from './MainLayout';
import GoogleInterFont from 'app/fonts/fonts';

/* Style imports --------------------------------------- */
import './globals.css';

/* Type imports ---------------------------------------- */

/* External variables ---------------------------------- */
interface Metadata {
  title: string;
  description?: string;
}

export const metadata: Metadata = {
  title: 'Fête de la musique 2024 à Bordeaux',
  description: 'Le programme de la fête de la musique 2024 à Bordeaux.',
};

/* RootLayout component prop types --------------------- */
interface RootLayoutProps {
  children: React.ReactNode;
}

/* RootLayout component -------------------------------- */
const RootLayout: React.FC<RootLayoutProps> = ({ children }) => {
  return (
    <html
      lang="en"
      className={GoogleInterFont.variable}
    >
      <head>
        <title>
          {metadata.title}
        </title>
        {
          metadata.description !== undefined &&
            <meta
              name="description"
              content={metadata.description}
            />
        }
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />
      </head>
      <Analytics />
      <MainLayout>
        {children}
        <SpeedInsights />
      </MainLayout>
    </html>
  );
};

/* Export RootLayout component ------------------------- */
export default RootLayout;
