/* Framework imports ----------------------------------- */
import {
  useEffect,
  useState,
} from 'react';

/* Type imports ---------------------------------------- */
import type { RefObject } from 'react';

/* Hooks ----------------------------------------------- */
/**
 * Returns `true` once a social embed inside `ref` has actually rendered — i.e.
 * the Meta SDK has replaced the placeholder blockquote/div with an `<iframe>`.
 *
 * Used to keep a skeleton in place (reserving layout space) until the embed is
 * really there, so the page doesn't collapse-then-expand as the SDK hydrates.
 *
 * One-shot: once `true`, stays `true`. No-ops until `enabled` is `true`.
 */
export function useEmbedRendered(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
): boolean {
  const [ rendered, setRendered ] = useState<boolean>(false);

  useEffect(
    (): (() => void) | undefined => {
      if(!enabled || rendered) {
        return undefined;
      }

      const element = ref.current;
      if(element === null) {
        return undefined;
      }

      // The Meta SDK inserts the <iframe> at height 0, then resizes it via
      // postMessage. Treat the embed as rendered only once the iframe has a
      // real height, so the skeleton isn't pulled before the content fills in.
      const MIN_RENDERED_HEIGHT = 50;
      const isRendered = (): boolean => {
        const iframe = element.querySelector('iframe');
        return iframe !== null && iframe.clientHeight > MIN_RENDERED_HEIGHT;
      };

      if(isRendered()) {
        setRendered(true);
        return undefined;
      }

      const observer = new MutationObserver(
        (): void => {
          if(isRendered()) {
            setRendered(true);
            observer.disconnect();
          }
        },
      );
      observer.observe(element, { childList: true, subtree: true, attributes: true });

      return (): void => observer.disconnect();
    },
    [
      ref,
      enabled,
      rendered,
    ],
  );

  return rendered;
}
