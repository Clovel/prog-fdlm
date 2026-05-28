/* Framework imports ----------------------------------- */
import {
  useEffect,
  useState,
} from 'react';

/* Module imports -------------------------------------- */

/* Component imports ----------------------------------- */

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */
import type { RefObject } from 'react';

/* Hooks ----------------------------------------------- */
interface UseInViewportOptions {
  rootMargin?: string;
  threshold?: number;
}

/**
 * Returns `true` once the observed element has entered (or pre-entered, via
 * rootMargin) the viewport. Once `true`, stays `true` — the hook is designed
 * for one-shot lazy loading, not visibility tracking.
 *
 * Falls back to eager-load (`true` on mount) when `IntersectionObserver` is
 * unavailable.
 */
export function useInViewport(
  ref: RefObject<Element | null>,
  options: UseInViewportOptions = {},
): boolean {
  const [ inViewport, setInViewport ] = useState<boolean>(false);

  useEffect(
    () => {
      const element = ref.current;
      if(element === null) {
        return;
      }

      if(typeof IntersectionObserver === 'undefined') {
        queueMicrotask((): void => setInViewport(true));
        return;
      }

      const observer = new IntersectionObserver(
        (entries): void => {
          for(const entry of entries) {
            if(entry.isIntersecting) {
              setInViewport(true);
              observer.disconnect();
              break;
            }
          }
        },
        {
          rootMargin: options.rootMargin ?? '200px',
          threshold: options.threshold ?? 0,
        },
      );

      observer.observe(element);

      return (): void => {
        observer.disconnect();
      };
    },
    [
      ref,
      options.rootMargin,
      options.threshold,
    ],
  );

  return inViewport;
}
