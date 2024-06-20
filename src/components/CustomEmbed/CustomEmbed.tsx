/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports -------------------------------------- */

/* Component imports ----------------------------------- */
import { InstagramEmbed } from 'react-social-media-embed';

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */
import type { FacebookEmbed } from 'react-social-media-embed';

/* CustomEmbed component prop types -------------------- */
interface CustomEmbedProps {
  url: string;
  maxWidth?: number;
  EmbedComponent?: typeof InstagramEmbed | typeof FacebookEmbed;
}

/* CustomEmbed component ------------------------------- */
const CustomEmbed: React.FC<CustomEmbedProps> = (
  {
    url,
    maxWidth = 600,
    EmbedComponent = InstagramEmbed,
  },
) => {
  return (
    <div
      className="flex justify-center w-full"
    >
      <div
        className="flex justify-center w-full"
        style={{ maxWidth: maxWidth }}
      >
        <EmbedComponent
          width="100%"
          url={url}
        />
      </div>
    </div>
  );
};

/* Export CustomEmbed component ------------------------ */
export default CustomEmbed;
