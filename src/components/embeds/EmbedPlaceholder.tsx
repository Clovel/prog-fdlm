'use client';

/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import { Skeleton } from 'components/ui/skeleton';

/* Type imports ---------------------------------------- */
import type { SocialEmbedPlatform } from 'types/Event';

/* EmbedPlaceholder component prop types --------------- */
interface EmbedPlaceholderProps {
  platform: SocialEmbedPlatform;
  aspectRatio: string;
}

const LABELS: Record<SocialEmbedPlatform, string> = {
  instagram: 'Chargement de la publication Instagram…',
  facebook: 'Chargement de la publication Facebook…',
};

/* EmbedPlaceholder component -------------------------- */
const EmbedPlaceholder: React.FC<EmbedPlaceholderProps> = (
  {
    platform,
    aspectRatio,
  },
) => {
  return (
    <Skeleton
      className="w-full flex items-center justify-center rounded-md"
      style={{ aspectRatio }}
    >
      <span className="text-sm text-muted-foreground">
        {LABELS[platform]}
      </span>
    </Skeleton>
  );
};

/* Export EmbedPlaceholder component ------------------- */
export default EmbedPlaceholder;
