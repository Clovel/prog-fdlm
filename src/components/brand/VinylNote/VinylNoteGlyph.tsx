/* Framework imports ----------------------------------- */
import React from 'react';

/* Shared glyph geometry (single source of truth) ------ */
// Vinyl record + eighth note normalized to a 120x120 viewBox (center 60,60).
// Consumed two ways: the React <VinylNoteGlyph> (Music404, DOM, theme-aware via
// CSS vars) and the vinylNoteSvg() standalone-SVG string (OG share card). Satori
// mangles deeply-nested inline <svg> trees — resvg then throws an XML parse error
// — so the card embeds vinylNoteSvg as a base64 data-URI <img> instead. Both
// representations read the constants below so they cannot drift apart.
const R_RECORD = 60; // outer vinyl disc
const R_GROOVE = 51; // restyle groove ring
const R_HOLE = 42;   // label gap
const R_INNER = 30;  // inner record ring
const R_CENTER = 6;  // spindle hole
const NOTE_PATH = 'M61 32 q18 4 14 24 q-2 -12 -14 -14 z';

/* Glyph color options --------------------------------- */
export interface VinylNoteColors {
  recordColor: string;        // vinyl disc + inner ring
  holeColor: string;          // gaps / center hole
  noteColor: string;          // eighth note on the label
  groove?: boolean;           // restyle: add a thin groove ring
  grooveColor?: string;       // stroke color for the groove ring; defaults to holeColor
}

/* VinylNoteGlyph component ---------------------------- */
const VinylNoteGlyph: React.FC<VinylNoteColors> = (
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
      <circle cx="60" cy="60" r={R_RECORD} fill={recordColor} />
      {
        groove &&
          <circle
            cx="60"
            cy="60"
            r={R_GROOVE}
            fill="none"
            stroke={grooveColor ?? holeColor}
            strokeWidth="2"
          />
      }
      <circle cx="60" cy="60" r={R_HOLE} fill={holeColor} />
      <circle cx="60" cy="60" r={R_INNER} fill={recordColor} />
      <circle cx="60" cy="60" r={R_CENTER} fill={holeColor} />
      <g fill={noteColor}>
        <ellipse cx="48" cy="74" rx="11" ry="8" transform="rotate(-20 48 74)" />
        <rect x="57" y="32" width="4" height="44" rx="2" />
        <path d={NOTE_PATH} />
      </g>
    </g>
  );
};

/* vinylNoteSvg — standalone SVG string for Satori / OG - */
// Same geometry as the component above, emitted as a complete <svg> document so
// resvg can rasterize it directly. Whitespace between tags is harmless.
export const vinylNoteSvg = (
  {
    recordColor,
    holeColor,
    noteColor,
    groove = false,
    grooveColor,
  }: VinylNoteColors,
  sizePx: number,
): string => {
  const grooveRing = groove
    ? `<circle cx="60" cy="60" r="${R_GROOVE}" fill="none" stroke="${grooveColor ?? holeColor}" stroke-width="2"/>`
    : '';
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="${sizePx}" height="${sizePx}">`,
    `<circle cx="60" cy="60" r="${R_RECORD}" fill="${recordColor}"/>`,
    grooveRing,
    `<circle cx="60" cy="60" r="${R_HOLE}" fill="${holeColor}"/>`,
    `<circle cx="60" cy="60" r="${R_INNER}" fill="${recordColor}"/>`,
    `<circle cx="60" cy="60" r="${R_CENTER}" fill="${holeColor}"/>`,
    `<g fill="${noteColor}">`,
    `<ellipse cx="48" cy="74" rx="11" ry="8" transform="rotate(-20 48 74)"/>`,
    `<rect x="57" y="32" width="4" height="44" rx="2"/>`,
    `<path d="${NOTE_PATH}"/>`,
    '</g>',
    '</svg>',
  ].join('');
};

/* Export VinylNoteGlyph component --------------------- */
export default VinylNoteGlyph;
