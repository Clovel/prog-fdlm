/* Framework imports ----------------------------------- */
import React from 'react';
import Link from 'next/link';

/* Component imports ----------------------------------- */
import { Button } from 'components/ui/button';
import Music404 from 'components/Music404/Music404';

/* NotFoundView component prop types ------------------- */
interface NotFoundViewProps {
  title: string;
  message: string;
  ctaHref: string;
  ctaLabel: string;
}

/* NotFoundView component ------------------------------ */
const NotFoundView: React.FC<NotFoundViewProps> = (
  {
    title,
    message,
    ctaHref,
    ctaLabel,
  },
) => {
  return (
    <div className="flex flex-col items-center justify-center w-full p-8 text-center gap-4">
      <Music404 />
      <h1 className="text-2xl font-semibold">
        {title}
      </h1>
      <p className="text-muted-foreground max-w-md">
        {message}
      </p>
      <Button asChild>
        <Link href={ctaHref}>{ctaLabel}</Link>
      </Button>
    </div>
  );
};

/* Export NotFoundView component ----------------------- */
export default NotFoundView;
