// Lightweight bridge that lets the map popup ("Voir plus") ask the agenda list
// to reveal an event. The map subtree and the list subtree are siblings with no
// shared state, so a typed window CustomEvent carries the intent across them.
// Keyed on the event UUID (stable + unique); only the canonical (non-favorites)
// EventListItem listens, so a favorited event is revealed in its category, not
// in the favorites strip.

/* Constants ------------------------------------------- */
export const FOCUS_EVENT_NAME = 'fdlm:focus-event' as const;

/* Type declarations ----------------------------------- */
export interface FocusEventDetail {
  id: string;
}

/* Dispatch -------------------------------------------- */
export const dispatchFocusEvent = (id: string): void => {
  window.dispatchEvent(
    new CustomEvent<FocusEventDetail>(
      FOCUS_EVENT_NAME,
      {
        detail: {
          id,
        },
      },
    ),
  );
};

export const isFocusEventEvent = (event: Event): event is CustomEvent<FocusEventDetail> => {
  return (
    event instanceof CustomEvent &&
    event.type === FOCUS_EVENT_NAME
  );
};
