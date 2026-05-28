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
  postAspectRatio?: string;
  videoAspectRatio?: string;
}

const DEFAULT_MAX_WIDTH = 750 as const;
const DEFAULT_POST_ASPECT_RATIO = '1.91/1' as const;
const DEFAULT_VIDEO_ASPECT_RATIO = '16/9' as const;

/* FacebookEmbed component ----------------------------- */
const FacebookEmbed: React.FC<FacebookEmbedProps> = (
  {
    url,
    type = 'post',
    maxWidth = DEFAULT_MAX_WIDTH,
    showText = true,
    className,
    postAspectRatio = DEFAULT_POST_ASPECT_RATIO,
    videoAspectRatio = DEFAULT_VIDEO_ASPECT_RATIO,
  },
) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inViewport = useInViewport(containerRef);

  useSocialEmbedScript('facebook', inViewport);

  const blockClass = type === 'video' ? 'fb-video' : 'fb-post';
  const aspectRatio = type === 'video' ? videoAspectRatio : postAspectRatio;

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
