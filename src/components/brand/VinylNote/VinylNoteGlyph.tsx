/* Framework imports ----------------------------------- */
import React from 'react';

/* VinylNoteGlyph component prop types ----------------- */
interface VinylNoteGlyphProps {
  recordColor: string;        // vinyl disc + inner ring
  holeColor: string;          // gaps / center hole
  noteColor: string;          // eighth note on the label
  groove?: boolean;           // restyle: add a thin groove ring
  grooveColor?: string;       // stroke color for the groove ring; defaults to holeColor
}

/* VinylNoteGlyph component ---------------------------- */
// Record + eighth note normalized to a 120x120 viewBox (center 60,60, r=60).
// Geometry is the single source of truth shared by Music404 and the OG card.
const VinylNoteGlyph: React.FC<VinylNoteGlyphProps> = (
  {
    recordColor,
    holeColor,
    noteColor,
    groove = false,
    grooveColor,
  },
) => {
  return (
    <g>
      <circle cx="60" cy="60" r="60" fill={recordColor} />
      {
        groove &&
          <circle
            cx="60"
            cy="60"
            r="51"
            fill="none"
            stroke={grooveColor ?? holeColor}
            strokeWidth="2"
          />
      }
      <circle cx="60" cy="60" r="42" fill={holeColor} />
      <circle cx="60" cy="60" r="30" fill={recordColor} />
      <circle cx="60" cy="60" r="6" fill={holeColor} />
      <g fill={noteColor}>
        <ellipse cx="48" cy="74" rx="11" ry="8" transform="rotate(-20 48 74)" />
        <rect x="57" y="32" width="4" height="44" rx="2" />
        <path d="M61 32 q18 4 14 24 q-2 -12 -14 -14 z" />
      </g>
    </g>
  );
};

/* Export VinylNoteGlyph component --------------------- */
export default VinylNoteGlyph;
