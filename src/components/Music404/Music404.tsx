/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import VinylNoteGlyph from 'components/brand/VinylNote/VinylNoteGlyph';

/* Music404 component prop types ----------------------- */
interface Music404Props {}

/* Music404 component ---------------------------------- */
const Music404: React.FC<Music404Props> = () => {
  return (
    <svg
      viewBox="0 0 360 180"
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
      {/* The vinyl record (with eighth note) standing in for the 0 */}
      <g transform="translate(120,30)">
        <VinylNoteGlyph
          recordColor="var(--primary)"
          holeColor="var(--background)"
          noteColor="var(--primary-foreground)"
        />
      </g>
    </svg>
  );
};

/* Export Music404 component --------------------------- */
export default Music404;
