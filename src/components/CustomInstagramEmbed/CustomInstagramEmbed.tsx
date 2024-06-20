/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports -------------------------------------- */

/* Component imports ----------------------------------- */
import { InstagramEmbed } from 'react-social-media-embed';

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */

/* CustomInstagramEmbed component prop types ----------- */
interface CustomInstagramEmbedProps {
  url: string;
  maxWidth?: number;
}

/* CustomInstagramEmbed component ---------------------- */
const CustomInstagramEmbed: React.FC<CustomInstagramEmbedProps> = (
  {
    url,
    maxWidth = 600,
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
        <InstagramEmbed
          width="100%"
          url={url}
        />
      </div>
    </div>
  );
};

/* Export CustomInstagramEmbed component --------------- */
export default CustomInstagramEmbed;
