/* Framework imports ----------------------------------- */
import React from 'react';

/* Music404 component prop types ----------------------- */
interface Music404Props {}

/* Music404 component ---------------------------------- */
const Music404: React.FC<Music404Props> = () => {
  return (
    <svg
      viewBox="0 0 360 180"
      role="img"
      aria-hidden="true"
      className="w-48 sm:w-64 h-auto"
    >
      {/* The two 4s */}
      <text
        x="58"
        y="132"
        textAnchor="middle"
        fontSize="150"
        fontWeight="800"
        fontFamily="inherit"
        className="fill-foreground"
      >
        4
      </text>
      <text
        x="302"
        y="132"
        textAnchor="middle"
        fontSize="150"
        fontWeight="800"
        fontFamily="inherit"
        className="fill-foreground"
      >
        4
      </text>
      {/* The vinyl record standing in for the 0 */}
      <circle cx="180" cy="90" r="60" className="fill-primary" />
      <circle cx="180" cy="90" r="42" className="fill-background" />
      <circle cx="180" cy="90" r="30" className="fill-primary" />
      <circle cx="180" cy="90" r="6" className="fill-background" />
      {/* An eighth note resting on the label */}
      <g className="fill-foreground">
        <ellipse cx="168" cy="104" rx="11" ry="8" transform="rotate(-20 168 104)" />
        <rect x="177" y="62" width="4" height="44" rx="2" />
        <path d="M181 62 q18 4 14 24 q-2 -12 -14 -14 z" />
      </g>
    </svg>
  );
};

/* Export Music404 component --------------------------- */
export default Music404;
