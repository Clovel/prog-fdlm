'use client';

/* Component imports ----------------------------------- */
import Script from 'next/script';

/* GoogleAnalytics component prop types ---------------- */
interface GoogleAnalyticsProps {
  GA_TRACKING_ID: string;
}

/* GoogleAnalytics component --------------------------- */
const GoogleAnalytics: React.FC<GoogleAnalyticsProps> = ({ GA_TRACKING_ID }) => {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
        strategy="afterInteractive"
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
      >
        {
          `
          window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', ${GA_TRACKING_ID});
          `
        }
      </Script>
    </>
  );
};

export default GoogleAnalytics;
