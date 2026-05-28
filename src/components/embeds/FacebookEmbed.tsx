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

/* FacebookEmbed component prop types ------------------ */
interface FacebookEmbedProps {
  url: string;
  type?: 'post' | 'video';
  maxWidth?: number;
  showText?: boolean;
  className?: string;
}

const DEFAULT_MAX_WIDTH = 750;
const POST_ASPECT_RATIO = '1.91/1';
const VIDEO_ASPECT_RATIO = '16/9';

/* FacebookEmbed component ----------------------------- */
const FacebookEmbed: React.FC<FacebookEmbedProps> = (
  {
    url,
    type = 'post',
    maxWidth = DEFAULT_MAX_WIDTH,
    showText = true,
    className,
  },
) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inViewport = useInViewport(containerRef);

  useSocialEmbedScript('facebook', inViewport);

  const blockClass = type === 'video' ? 'fb-video' : 'fb-post';
  const aspectRatio = type === 'video' ? VIDEO_ASPECT_RATIO : POST_ASPECT_RATIO;

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
          <div
            className={blockClass}
            data-href={url}
            data-show-text={showText ? 'true' : 'false'}
            data-width="auto"
          /> :
          <EmbedPlaceholder
            platform="facebook"
            aspectRatio={aspectRatio}
          />
      }
    </div>
  );
};

/* Export FacebookEmbed component ---------------------- */
export default FacebookEmbed;
