'use client';

/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports -------------------------------------- */

/* Component imports ----------------------------------- */
import { Button } from '@/components/ui/button';

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */
import type { SocialEmbedPlatform } from 'types/Event';

/* EmbedPlaceholder component prop types --------------- */
interface EmbedPlaceholderProps {
  platform: SocialEmbedPlatform;
  aspectRatio: string;
  consented: boolean;
  onConsent: () => void;
}

const LABELS: Record<SocialEmbedPlatform, string> = {
  instagram: 'Charger la publication Instagram',
  facebook: 'Charger la publication Facebook',
};

/* EmbedPlaceholder component -------------------------- */
const EmbedPlaceholder: React.FC<EmbedPlaceholderProps> = (
  {
    platform,
    aspectRatio,
    consented,
    onConsent,
  },
) => {
  return (
    <div
      className="w-full flex items-center justify-center bg-muted/40 border border-border rounded-md"
      style={{ aspectRatio }}
    >
      {
        consented ?
          <span className="text-sm text-muted-foreground">
            Chargement…
          </span> :
          <Button
            variant="outline"
            size="sm"
            onClick={onConsent}
          >
            {LABELS[platform]}
          </Button>
      }
    </div>
  );
};

/* Export EmbedPlaceholder component ------------------- */
export default EmbedPlaceholder;
