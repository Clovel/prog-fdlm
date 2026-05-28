/* Framework imports ----------------------------------- */
import { useEffect } from 'react';

/* Module imports -------------------------------------- */

/* Component imports ----------------------------------- */

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */
import type { SocialEmbedPlatform } from 'types/Event';

/* Constants ------------------------------------------- */
const SCRIPTS = {
  instagram: {
    id: 'ig-embed',
    src: 'https://www.instagram.com/embed.js',
  },
  facebook: {
    id: 'fb-jssdk',
    src: 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v19.0',
  },
} as const;

/* Hooks ----------------------------------------------- */
/**
 * Loads the social-media embed script for the given platform once per page
 * and re-runs the platform's parser when a new embed is mounted.
 *
 * The script tag is injected the first time `enabled === true`. Subsequent
 * mounts on the same page only trigger a re-parse, not another script load.
 *
 * The hook re-runs the parser whenever `enabled` flips to `true` so that
 * lazy-loaded embeds get hydrated on demand.
 */
export function useSocialEmbedScript(
  platform: SocialEmbedPlatform,
  enabled: boolean,
): void {
  useEffect(
    () => {
      if(!enabled) {
        return;
      }

      const { id, src } = SCRIPTS[platform];
      const existing = document.getElementById(id);

      // NOTE: `parse()`/`process()` are called document-wide (no element arg)
      // because (a) Instagram's `Embeds.process()` takes no element, so symmetry
      // is easier, and (b) the page never has more than ~20 embeds at this
      // project's scale. If embed count grows, pass a `RefObject<HTMLElement>`
      // through the hook signature and call `window.FB?.XFBML.parse(ref.current)`
      // for the Facebook branch.
      const reparse = (): void => {
        if(platform === 'instagram') {
          window.instgrm?.Embeds.process();
        } else {
          window.FB?.XFBML.parse();
        }
      };

      if(existing === null) {
        const script = document.createElement('script');
        script.id = id;
        script.src = src;
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.addEventListener('load', reparse);
        document.body.appendChild(script);
        return;
      }

      // Script tag exists. It may still be loading — call reparse
      // unconditionally; the optional chain will no-op until the global is ready,
      // and once it IS ready, reparse() hydrates any embeds the script's
      // own auto-scan missed.
      reparse();
    },
    [
      platform,
      enabled,
    ],
  );
}
