'use client';

/* Framework imports ----------------------------------- */
import React, { useRef } from 'react';

/* Module imports -------------------------------------- */
import { useInViewport } from 'hooks/useInViewport';
import { useSocialEmbedScript } from 'hooks/useSocialEmbedScript';

/* Component imports ----------------------------------- */
import EmbedPlaceholder from './EmbedPlaceholder';

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */

/* InstagramEmbed component prop types ----------------- */
interface InstagramEmbedProps {
  url: string;
  maxWidth?: number;
  className?: string;
}

const DEFAULT_MAX_WIDTH = 540;
const ASPECT_RATIO = '4/5';

/* InstagramEmbed component ---------------------------- */
const InstagramEmbed: React.FC<InstagramEmbedProps> = (
  {
    url,
    maxWidth = DEFAULT_MAX_WIDTH,
    className,
  },
) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inViewport = useInViewport(containerRef);

  useSocialEmbedScript('instagram', inViewport);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        maxWidth: maxWidth,
        marginLeft: 'auto',
        marginRight: 'auto',
        width: '100%',
      }}
    >
      {
        inViewport ?
          <blockquote
            className="instagram-media"
            data-instgrm-permalink={url}
            data-instgrm-version="14"
            style={{ margin: 0 }}
          /> :
          <EmbedPlaceholder
            platform="instagram"
            aspectRatio={ASPECT_RATIO}
          />
      }
    </div>
  );
};

/* Export InstagramEmbed component --------------------- */
export default InstagramEmbed;
