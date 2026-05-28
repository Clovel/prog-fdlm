/* Module imports -------------------------------------- */

/* Type imports ---------------------------------------- */

/* Window globals injected by Meta scripts ------------- */
declare global {
  interface Window {
    instgrm?: {
      Embeds: {
        process: () => void;
      };
    };
    FB?: {
      XFBML: {
        parse: (element?: HTMLElement) => void;
      };
    };
  }
}

export {};
