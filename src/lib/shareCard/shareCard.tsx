/* Framework imports ----------------------------------- */
import { ImageResponse } from 'next/og';

/* Module imports -------------------------------------- */
import { promises as fs } from 'fs';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

/* Module imports (project) ---------------------------- */
import { getEditionCardData } from 'db/queries/getEditionCardData';
import { CARD_COLORS } from './colors';

/* Component imports ----------------------------------- */
import { vinylNoteSvg } from 'components/brand/VinylNote/VinylNoteGlyph';

/* Image route metadata -------------------------------- */
export const size = { width: 1200, height: 630 } as const;
export const contentType = 'image/png' as const;
export const alt = 'Fête de la Musique à Bordeaux' as const;

/* Helpers --------------------------------------------- */
// `fetch()` can't read a file:// URL (fails in Turbopack dev), but fs.readFile
// can — and the `new URL(..., import.meta.url)` form is what the bundler traces
// to copy the .ttf into the serverless function, so this works in dev and on
// Vercel. Copy into a fresh ArrayBuffer so Satori gets an unshared buffer.
const loadFonts = async(): Promise<
  Array<{ name: string; data: ArrayBuffer; weight: 400 | 700; style: 'normal' }>
> => {
  const [regular, bold] = await Promise.all([
    fs.readFile(new URL('./fonts/Inter-Regular.ttf', import.meta.url)),
    fs.readFile(new URL('./fonts/Inter-Bold.ttf', import.meta.url)),
  ]);
  return [
    {
      name: 'Inter',
      data: new Uint8Array(regular).buffer,
      weight: 400,
      style: 'normal',
    },
    {
      name: 'Inter',
      data: new Uint8Array(bold).buffer,
      weight: 700,
      style: 'normal',
    },
  ];
};

// dayOfFestival is date-only ('2026-06-21'); format as a French calendar date.
const formatFestivalDate = (isoDate: string): string => {
  const parts = isoDate.split('-').map(Number);
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  const formatted = format(date, 'EEEE d MMMM', { locale: fr });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

/* Renderer -------------------------------------------- */
export const renderShareCard = async(yearParam: string | null): Promise<ImageResponse> => {
  const fonts = await loadFonts();
  const c = CARD_COLORS;

  // Satori mangles deeply-nested inline <svg> trees (resvg then throws an XML
  // parse error). Build the shared glyph as a standalone SVG string and embed it
  // as a base64 data-URI <img>, which resvg rasterizes directly.
  const glyphSvg = vinylNoteSvg(
    {
      recordColor: c.primary,
      holeColor: c.background,
      noteColor: c.primaryForeground,
      grooveColor: c.mutedForeground,
      groove: true,
    },
    340,
  );
  const glyphDataUri = `data:image/svg+xml;base64,${Buffer.from(glyphSvg).toString('base64')}`;

  const yearNum = yearParam !== null && /^\d{4}$/.test(yearParam) ? Number(yearParam) : null;

  let year = '';
  let metaLine: string | null = null;

  if(yearNum !== null) {
    const data = await getEditionCardData(yearNum);
    if(data !== null) {
      year = String(data.year);
      const countLabel = `${data.eventCount} concert${data.eventCount !== 1 ? 's' : ''}`;
      metaLine = `${formatFestivalDate(data.dayOfFestival)} · ${countLabel}`;
    } else {
      year = String(yearNum);
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: '72px',
          padding: '72px',
          backgroundColor: c.background,
          border: `2px solid ${c.border}`,
          fontFamily: 'Inter',
        }}
      >
        <div style={{ display: 'flex', flexShrink: 0 }}>
          { /* eslint-disable-next-line @next/next/no-img-element -- Satori OG image, not the DOM */ }
          <img
            width={340}
            height={340}
            src={glyphDataUri}
            alt=""
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div
            style={{
              display: 'flex',
              fontSize: '34px',
              fontWeight: 700,
              letterSpacing: '6px',
              color: c.mutedForeground,
            }}
          >
            FÊTE DE LA MUSIQUE
          </div>
          {
            year !== '' &&
              <div
                style={{
                  display: 'flex',
                  fontSize: '180px',
                  fontWeight: 700,
                  lineHeight: 1,
                  color: c.foreground,
                }}
              >
                {year}
              </div>
          }
          <div
            style={{
              display: 'flex',
              fontSize: '64px',
              fontWeight: 700,
              marginTop: year !== '' ? '8px' : '0',
              color: c.foreground,
            }}
          >
            Bordeaux
          </div>
          {
            metaLine !== null &&
              <div
                style={{
                  display: 'flex',
                  fontSize: '32px',
                  marginTop: '24px',
                  color: c.mutedForeground,
                }}
              >
                {metaLine}
              </div>
          }
        </div>
      </div>
    ),
    {
      width: size.width,
      height: size.height,
      fonts,
    },
  );
};
