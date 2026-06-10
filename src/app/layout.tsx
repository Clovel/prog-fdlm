/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports (project) ---------------------------- */
import { OG_SITE } from 'lib/shareCard/ogBase';
import { getCanonicalBaseUrl } from 'lib/baseUrl';

/* Component imports ----------------------------------- */
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import MainLayout from './MainLayout';
import GoogleInterFont from 'app/fonts/fonts';

/* Style imports --------------------------------------- */
import './globals.css';

/* Type imports ---------------------------------------- */
import type { Metadata } from 'next';

/* Metadata -------------------------------------------- */
export const metadata: Metadata = {
  metadataBase: new URL(getCanonicalBaseUrl()),
  title: 'Fête de la musique à Bordeaux',
  description: 'Le programme de la fête de la musique à Bordeaux.',
  openGraph: {
    ...OG_SITE,
    title: 'Fête de la musique à Bordeaux',
    description: 'Le programme de la fête de la musique à Bordeaux.',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

/* RootLayout component prop types --------------------- */
interface RootLayoutProps {
  children: React.ReactNode;
}

/* RootLayout component -------------------------------- */
const RootLayout: React.FC<RootLayoutProps> = ({ children }) => {
  return (
    <html
      lang="fr"
      className={GoogleInterFont.variable}
      suppressHydrationWarning
    >
      <body className="flex flex-col min-h-screen">
        <MainLayout>
          {children}
          <Analytics />
          <SpeedInsights />
        </MainLayout>
      </body>
    </html>
  );
};

/* Export RootLayout component ------------------------- */
export default RootLayout;
