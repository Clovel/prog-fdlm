/* Framework imports ----------------------------------- */
import React from 'react';

/* EmptyEditionView component prop types --------------- */
interface EmptyEditionViewProps {}

/* EmptyEditionView component -------------------------- */
/**
 * Friendly empty state shown on an edition page that has no events yet.
 * Mirrors the centered look of `NotFoundView` but reuses the vinyl/note
 * illustration language of `Music404` (without the "404" digits).
 */
const EmptyEditionView: React.FC<EmptyEditionViewProps> = () => {
  return (
    <div className="flex flex-col items-center justify-center w-full p-8 py-16 text-center gap-4">
      <svg
        viewBox="0 0 200 200"
        aria-hidden="true"
        className="w-40 sm:w-52 h-auto"
      >
        {/* Floating notes */}
        <text
          x="26"
          y="52"
          fontSize="34"
          fontFamily="inherit"
          className="fill-muted-foreground/40"
        >
          ♪
        </text>
        <text
          x="156"
          y="170"
          fontSize="26"
          fontFamily="inherit"
          className="fill-muted-foreground/40"
        >
          ♫
        </text>
        {/* The vinyl record */}
        <circle cx="100" cy="100" r="66" className="fill-primary" />
        <circle cx="100" cy="100" r="46" className="fill-background" />
        <circle cx="100" cy="100" r="32" className="fill-primary" />
        <circle cx="100" cy="100" r="6" className="fill-background" />
        {/* An eighth note resting on the label */}
        <g className="fill-primary-foreground">
          <ellipse cx="90" cy="116" rx="11" ry="8" transform="rotate(-20 90 116)" />
          <rect x="99" y="74" width="4" height="44" rx="2" />
          <path d="M103 74 q18 4 14 24 q-2 -12 -14 -14 z" />
        </g>
      </svg>
      <h1 className="text-2xl font-semibold">
        Le programme arrive bientôt
      </h1>
      <p className="text-muted-foreground max-w-md">
        Les événements de cette édition seront annoncés ici très vite. Revenez nous voir !
      </p>
    </div>
  );
};

/* Export EmptyEditionView component ------------------- */
export default EmptyEditionView;
