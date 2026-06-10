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
  const rendered = useEmbedRendered(containerRef, inViewport);

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
          <div style={{ position: 'relative' }}>
            {
              !rendered &&
                <EmbedPlaceholder
                  platform="facebook"
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
              <div
                className={blockClass}
                data-href={url}
                data-show-text={showText ? 'true' : 'false'}
                data-width="auto"
              />
            </div>
          </div> :
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
