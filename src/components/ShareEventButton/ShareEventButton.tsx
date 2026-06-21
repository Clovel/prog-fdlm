'use client';

/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports -------------------------------------- */
import { toast } from 'sonner';

/* Component imports ----------------------------------- */
import { Share2 } from 'lucide-react';
import { Button } from 'components/ui/button';

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';

/* ShareEventButton component prop types --------------- */
interface ShareEventButtonProps {
  event: Event;
}

/* ShareEventButton component -------------------------- */
const ShareEventButton: React.FC<ShareEventButtonProps> = (
  {
    event,
  },
) => {
  // Feature detection lives HERE (click time), never in render: the server has
  // no `navigator`, so branching in JSX would desync server/client markup and
  // trip a hydration mismatch. One stable button; behaviour decided on click.
  const handleShare = (): void => {
    const title: string = event.name ?? event.location.name;
    const url = `${window.location.origin}${window.location.pathname}?event=${event.id}`;

    if(typeof navigator.share === 'function') {
      void navigator
        .share({
          title,
          text: `${title} — Fête de la Musique`,
          url,
        })
        .catch((): void => undefined);
      return;
    }

    void navigator.clipboard
      .writeText(url)
      .then((): void => {
        toast.success('Lien copié');
      })
      .catch((): void => {
        toast.error('Impossible de copier le lien');
      });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="grow shrink-0"
      onClick={handleShare}
    >
      <Share2 className="h-4 w-4" />
      Partager
    </Button>
  );
};

/* Export ShareEventButton component ------------------- */
export default ShareEventButton;
