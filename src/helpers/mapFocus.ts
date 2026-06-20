// Bridge that lets a list event ("Voir sur la carte") ask the map section to
// reveal its marker. Mirror of helpers/eventFocus.ts in the opposite direction
// (list -> map). A typed window CustomEvent crosses the two sibling subtrees;
// keyed on the event UUID.

/* Constants ------------------------------------------- */
export const FOCUS_MAP_EVENT_NAME = 'fdlm:focus-map' as const;

/* Type declarations ----------------------------------- */
export interface FocusMapDetail {
  id: string;
}

/* Dispatch -------------------------------------------- */
export const dispatchFocusMap = (id: string): void => {
  window.dispatchEvent(
    new CustomEvent<FocusMapDetail>(FOCUS_MAP_EVENT_NAME, { detail: { id } }),
  );
};

/* Type guard ------------------------------------------ */
export const isFocusMapEvent = (
  event: globalThis.Event,
): event is CustomEvent<FocusMapDetail> => {
  return (
    event instanceof CustomEvent &&
    event.type === FOCUS_MAP_EVENT_NAME
  );
};
