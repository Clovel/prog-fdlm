/* Framework imports ----------------------------------- */
import { ImageResponse } from 'next/og';

/* Module imports -------------------------------------- */
import { promises as fs } from 'fs';
import { formatInTimeZone } from 'date-fns-tz';
import { fr } from 'date-fns/locale';

/* Module imports (project) ---------------------------- */
import { CARD_COLORS } from './colors';

/* Component imports ----------------------------------- */
import { vinylNoteSvg } from 'components/brand/VinylNote/VinylNoteGlyph';

/* Type imports ---------------------------------------- */
import type { EventShareData } from 'db/queries/getEventShareData';

/* Image route metadata -------------------------------- */
export const size = { width: 1200, height: 630 } as const;
export const contentType = 'image/png' as const;

/* Helpers --------------------------------------------- */
const loadFonts = async(): Promise<
  Array<{ name: string; data: ArrayBuffer; weight: 400 | 700; style: 'normal' }>
> => {
  const [regular, bold] = await Promise.all([
    fs.readFile(new URL('./fonts/Inter-Regular.ttf', import.meta.url)),
    fs.readFile(new URL('./fonts/Inter-Bold.ttf', import.meta.url)),
  ]);
  return [
    { name: 'Inter', data: new Uint8Array(regular).buffer, weight: 400, style: 'normal' },
    { name: 'Inter', data: new Uint8Array(bold).buffer, weight: 700, style: 'normal' },
  ];
};

// startTime is a full instant; render it in Europe/Paris (the festival TZ).
const formatEventDate = (iso: string): string => {
  const formatted = formatInTimeZone(new Date(iso), 'Europe/Paris', "EEEE d MMMM '·' HH'h'mm", { locale: fr });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

/* Renderer -------------------------------------------- */
export const renderEventShareCard = async(data: EventShareData): Promise<ImageResponse> => {
  const fonts = await loadFonts();
  const c = CARD_COLORS;

  const glyphSvg = vinylNoteSvg(
    {
      recordColor: c.primary,
      holeColor: c.background,
      noteColor: c.primaryForeground,
      grooveColor: c.mutedForeground,
      groove: true,
    },
    220,
  );
  const glyphDataUri = `data:image/svg+xml;base64,${Buffer.from(glyphSvg).toString('base64')}`;

  const title: string = data.name ?? data.venueName;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px',
          backgroundColor: c.background,
          border: `2px solid ${c.border}`,
          fontFamily: 'Inter',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          { /* eslint-disable-next-line @next/next/no-img-element -- Satori OG image, not the DOM */ }
          <img width={96} height={96} src={glyphDataUri} alt="" />
          <div
            style={{
              display: 'flex',
              fontSize: '30px',
              fontWeight: 700,
              letterSpacing: '6px',
              color: c.mutedForeground,
            }}
          >
            {`FÊTE DE LA MUSIQUE ${data.year} · BORDEAUX`}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              fontSize: '76px',
              fontWeight: 700,
              lineHeight: 1.05,
              color: c.foreground,
            }}
          >
            {title}
          </div>
          <div style={{ display: 'flex', fontSize: '36px', marginTop: '24px', color: c.foreground }}>
            {data.venueName}
          </div>
          <div style={{ display: 'flex', fontSize: '32px', marginTop: '8px', color: c.mutedForeground }}>
            {formatEventDate(data.startTime)}
          </div>
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
