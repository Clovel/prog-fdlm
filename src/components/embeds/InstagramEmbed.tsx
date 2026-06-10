'use client';

/* Framework imports ----------------------------------- */
import React, { useRef } from 'react';

/* Module imports -------------------------------------- */
import { useInViewport } from 'hooks/useInViewport';
import { useSocialEmbedScript } from 'hooks/useSocialEmbedScript';
import { useEmbedRendered } from 'hooks/useEmbedRendered';

/* Component imports ----------------------------------- */
import EmbedPlaceholder from './EmbedPlaceholder';

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */

/* InstagramEmbed component prop types ----------------- */
interface InstagramEmbedProps {
  url: string;
  maxWidth?: number;
  className?: string;
  aspectRatio?: string;
}

const DEFAULT_MAX_WIDTH = 540 as const;
const DEFAULT_ASPECT_RATIO = '4/5' as const;

/* InstagramEmbed component ---------------------------- */
const InstagramEmbed: React.FC<InstagramEmbedProps> = (
  {
    url,
    maxWidth = DEFAULT_MAX_WIDTH,
    className,
    aspectRatio = DEFAULT_ASPECT_RATIO,
  },
) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inViewport = useInViewport(containerRef);
  const rendered = useEmbedRendered(containerRef, inViewport);

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
          <div style={{ position: 'relative' }}>
            {
              !rendered &&
                <EmbedPlaceholder
                  platform="instagram"
                  aspectRatio={aspectRatio}
                />
            }
            {/* Rendered transparently under the skeleton so the SDK can size it
                to the real width; promoted to in-flow once the iframe exists. */}
            <div
              style={
                rendered ?
                  undefined :
                  { position: 'absolute', inset: 0, opacity: 0, pointerEvents: 'none' }
              }
            >
              <blockquote
                className="instagram-media"
                data-instgrm-permalink={url}
                data-instgrm-version="14"
                style={{ margin: 0 }}
              />
            </div>
          </div> :
          <EmbedPlaceholder
            platform="instagram"
            aspectRatio={aspectRatio}
          />
      }
    </div>
  );
};

/* Export InstagramEmbed component --------------------- */
export default InstagramEmbed;
