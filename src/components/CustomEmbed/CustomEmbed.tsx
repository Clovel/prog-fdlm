/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports -------------------------------------- */

/* Component imports ----------------------------------- */
import {
  InstagramEmbed,
  FacebookEmbed,
} from 'components/embeds';

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */
import type { EventEmbedLinkType } from 'types/Event';

/* CustomEmbed component prop types -------------------- */
interface CustomEmbedProps {
  url: string;
  type: EventEmbedLinkType;
  maxWidth?: number;
}

/* CustomEmbed component ------------------------------- */
const CustomEmbed: React.FC<CustomEmbedProps> = (
  {
    url,
    type,
    maxWidth,
  },
) => {
  switch(type) {
    case 'instagram':
      return (
        <InstagramEmbed
          url={url}
          maxWidth={maxWidth}
        />
      );
    case 'facebook':
      return (
        <FacebookEmbed
          url={url}
          maxWidth={maxWidth}
        />
      );
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
};

/* Export CustomEmbed component ------------------------ */
export default CustomEmbed;
