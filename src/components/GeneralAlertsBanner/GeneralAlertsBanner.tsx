'use client';

/* Framework imports ----------------------------------- */
import React from 'react';
import { Info, TriangleAlert, CircleAlert, CircleCheck } from 'lucide-react';

/* Component imports ----------------------------------- */
import { Alert, AlertTitle, AlertDescription } from 'components/ui/alert';
import DescriptionRender from 'components/DescriptionRender/DescriptionRender';

/* Type imports ---------------------------------------- */
import type { GeneralAlertView } from 'app/(public)/[year]/types';

/* GeneralAlertsBanner component prop types ------------ */
interface GeneralAlertsBannerProps {
  alerts: GeneralAlertView[];
}

/* Helpers --------------------------------------------- */
const iconFor = (variant: GeneralAlertView['variant']): React.ReactNode => {
  if(variant === 'destructive') { return <CircleAlert className="h-4 w-4" />; }
  if(variant === 'warning') { return <TriangleAlert className="h-4 w-4" />; }
  if(variant === 'success') { return <CircleCheck className="h-4 w-4" />; }
  return <Info className="h-4 w-4" />;
};

/* GeneralAlertsBanner component ----------------------- */
const GeneralAlertsBanner: React.FC<GeneralAlertsBannerProps> = ({ alerts }) => {
  if(alerts.length === 0) {
    return null;
  }
  return (
    <div className="w-full max-w-5xl px-4 mx-auto flex flex-col gap-3 pb-4">
      {
        alerts
        .filter((alert) => alert.isPublished)
        .map(
          (alert) => (
          <Alert key={alert.id} variant={alert.variant}>
            {iconFor(alert.variant)}
            {
              alert.title !== null &&
                <AlertTitle>
                  {alert.title}
                </AlertTitle>
            }
            <AlertDescription>
              <DescriptionRender markdown={alert.content} />
            </AlertDescription>
          </Alert>
        )
      )
      }
    </div>
  );
};

/* Export GeneralAlertsBanner component ---------------- */
export default GeneralAlertsBanner;
