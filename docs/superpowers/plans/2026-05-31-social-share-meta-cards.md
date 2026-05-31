# Social Share Meta Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render dynamic per-edition Open Graph / Twitter preview cards so links to `/{year}` show a rich, on-brand image in Messenger, Instagram, Telegram, WhatsApp, and X.

**Architecture:** A shared `renderShareCard(year)` builds a 1200×630 PNG via Next's `next/og` `ImageResponse`, reusing the site's vinyl+note motif (extracted into a shared `VinylNoteGlyph`) and an Inter font bundled as a buffer. Next's file conventions (`opengraph-image.tsx` / `twitter-image.tsx`) wire the image to routes automatically; the root `layout.tsx` migrates to Next's native Metadata API (with `metadataBase`, `lang="fr"`, default OG) and a new `[year]/layout.tsx` adds per-edition `generateMetadata`.

**Tech Stack:** Next 16 App Router, React 19, `next/og` (Satori), Drizzle (`db.$count`), `date-fns` + `fr` locale, Inter TTF (fontsource CDN).

> **No test framework in this repo.** Verification is `pnpm tsc:ci`, `pnpm lint`, `pnpm build`, plus `curl`/visual checks against a running dev server — not unit tests. Each task's verification steps reflect that. Scope eslint to `src/...` if `pnpm lint` is noisy from the stray `.claude/worktrees` artifact.

---

## File Structure

- **Create** `src/lib/shareCard/colors.ts` — concrete light-theme color constants (Satori can't read CSS vars).
- **Create** `src/lib/shareCard/fonts/Inter-Regular.ttf`, `Inter-Bold.ttf` — bundled font buffers.
- **Create** `src/lib/shareCard/shareCard.tsx` — `renderShareCard(year)` + `size`/`contentType`/`alt`; owns the ImageResponse JSX, font loading, date formatting.
- **Create** `src/components/brand/VinylNote/VinylNoteGlyph.tsx` — shared SVG-primitive motif (record + eighth note), color-prop driven, optional groove ring. Single source of truth for the shape.
- **Modify** `src/components/Music404/Music404.tsx` — consume `VinylNoteGlyph` for the "0".
- **Create** `src/db/queries/getEditionCardData.ts` — focused query: `{ year, description, dayOfFestival, eventCount }` by year.
- **Create** `src/app/(public)/[year]/opengraph-image.tsx` + `twitter-image.tsx` — per-edition image routes.
- **Create** `src/app/opengraph-image.tsx` + `twitter-image.tsx` — root default (neutral) card.
- **Create** `src/app/(public)/[year]/layout.tsx` — server layout exporting `generateMetadata`.
- **Modify** `src/app/layout.tsx` — native Metadata API, `metadataBase`, `lang="fr"`, default OG.

---

## Task 1: Bundle Inter fonts + light-theme color map

**Files:**
- Create: `src/lib/shareCard/fonts/Inter-Regular.ttf`
- Create: `src/lib/shareCard/fonts/Inter-Bold.ttf`
- Create: `src/lib/shareCard/colors.ts`

- [ ] **Step 1: Download the two Inter static TTF weights**

```bash
mkdir -p src/lib/shareCard/fonts
curl -sL -o src/lib/shareCard/fonts/Inter-Regular.ttf "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf"
curl -sL -o src/lib/shareCard/fonts/Inter-Bold.ttf    "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-normal.ttf"
```

- [ ] **Step 2: Verify the files are real TrueType fonts**

Run: `file src/lib/shareCard/fonts/*.ttf && ls -l src/lib/shareCard/fonts/`
Expected: both report `TrueType Font data` (or `font/ttf`), each ~68 KB. If either is HTML/tiny, the download failed — re-run Step 1.

- [ ] **Step 3: Create the color map**

`src/lib/shareCard/colors.ts`:

```ts
/* Concrete light-theme token values (Satori cannot resolve oklch CSS vars). */
/* Mirrors src/app/globals.css :root — the Tailwind v4 neutral scale. */
export const CARD_COLORS = {
  background: '#ffffff',        // --background  oklch(1 0 0)
  foreground: '#0a0a0a',        // --foreground  oklch(0.145 0 0)
  primary: '#171717',           // --primary     oklch(0.205 0 0)
  primaryForeground: '#fafafa', // --primary-foreground oklch(0.985 0 0)
  mutedForeground: '#737373',   // --muted-foreground   oklch(0.556 0 0)
  border: '#e5e5e5',            // --border      oklch(0.922 0 0)
} as const;
```

- [ ] **Step 4: Verify it compiles**

Run: `pnpm tsc:ci`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/shareCard/fonts src/lib/shareCard/colors.ts
git commit -m "Bundle Inter TTFs and light-theme color map for share cards"
```

---

## Task 2: Extract the vinyl+note motif into a shared glyph

The current `Music404` draws the record/note inline in a 360×180 viewBox (record centered at cx180/cy90). We extract just the record+note as a `<g>` normalized to a 120×120 box (center 60,60), parameterized by color props so both the DOM (`Music404`, theme-aware via CSS vars) and Satori (OG card, concrete hex) can use it.

**Files:**
- Create: `src/components/brand/VinylNote/VinylNoteGlyph.tsx`
- Modify: `src/components/Music404/Music404.tsx`

- [ ] **Step 1: Create the shared glyph**

`src/components/brand/VinylNote/VinylNoteGlyph.tsx`:

```tsx
/* Framework imports ----------------------------------- */
import React from 'react';

/* VinylNoteGlyph component prop types ----------------- */
interface VinylNoteGlyphProps {
  recordColor: string;        // vinyl disc + inner ring
  holeColor: string;          // gaps / center hole
  noteColor: string;          // eighth note on the label
  groove?: boolean;           // restyle: add a thin groove ring
  grooveColor?: string;
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
```

- [ ] **Step 2: Refactor Music404 to use the glyph (preserve exact look)**

Replace the record/note block (the `<circle .../>` group and the eighth-note `<g>`) in `src/components/Music404/Music404.tsx` with the glyph translated into its original position. The two `4` `<text>` elements stay unchanged. Add the import and replace lines 38-48:

```tsx
/* Component imports ----------------------------------- */
import VinylNoteGlyph from 'components/brand/VinylNote/VinylNoteGlyph';
```

```tsx
      {/* The vinyl record (with eighth note) standing in for the 0 */}
      <g transform="translate(120,30)">
        <VinylNoteGlyph
          recordColor="var(--primary)"
          holeColor="var(--background)"
          noteColor="var(--primary-foreground)"
        />
      </g>
```

(The glyph's 120×120 box at `translate(120,30)` reproduces the original cx180/cy90 placement.)

- [ ] **Step 3: Verify compile + lint**

Run: `pnpm tsc:ci && pnpm exec eslint src/components/brand src/components/Music404`
Expected: no errors.

- [ ] **Step 4: Visual check (light + dark)**

Run: `pnpm dev`, then visit `http://localhost:3000/2099` (a year with no edition → the 404/not-found view that renders `Music404`). Confirm the record+note is unchanged in light mode, then toggle dark mode and confirm it inverts as before.
Expected: identical to pre-refactor appearance in both themes.

- [ ] **Step 5: Commit**

```bash
git add src/components/brand/VinylNote/VinylNoteGlyph.tsx src/components/Music404/Music404.tsx
git commit -m "Extract vinyl+note motif into shared VinylNoteGlyph"
```

---

## Task 3: Edition card data query

**Files:**
- Create: `src/db/queries/getEditionCardData.ts`

- [ ] **Step 1: Write the query**

`src/db/queries/getEditionCardData.ts`:

```ts
/* Module imports -------------------------------------- */
import { eq } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../index';
import { editions, events } from '../schema';

/* Query ----------------------------------------------- */
export interface EditionCardData {
  year: number;
  description: string | null;
  dayOfFestival: string; // date-only column ('YYYY-MM-DD')
  eventCount: number;
}

// Returns lightweight share-card data for any edition by year (published or
// not — unpublished editions aren't linked publicly, and an admin previewing a
// link still gets a real card). Returns null when no edition has that year.
export const getEditionCardData = async (year: number): Promise<EditionCardData | null> => {
  const rows = await db
    .select({
      year: editions.year,
      description: editions.description,
      dayOfFestival: editions.dayOfFestival,
      eventCount: db.$count(events, eq(events.editionId, editions.id)),
    })
    .from(editions)
    .where(eq(editions.year, year))
    .limit(1);

  return rows[0] ?? null;
};
```

(`db.$count(events, eq(events.editionId, editions.id))` in a `select` is the proven pattern from `src/db/queries/admin/listAllEditions.ts` — drizzle qualifies the correlated count correctly here, unlike a raw `sql` count.)

- [ ] **Step 2: Verify compile**

Run: `pnpm tsc:ci`
Expected: no errors.

- [ ] **Step 3: Verify it returns real data**

With `pnpm dev` running (or via `pnpm db:studio`), confirm an existing published year resolves. Quick check — add a temporary line to a scratch and run, OR rely on the route test in Task 5. Skip a throwaway script; Task 5 exercises this end-to-end.

- [ ] **Step 4: Commit**

```bash
git add src/db/queries/getEditionCardData.ts
git commit -m "Add getEditionCardData query (year, date, event count)"
```

---

## Task 4: Share-card renderer

**Files:**
- Create: `src/lib/shareCard/shareCard.tsx`

- [ ] **Step 1: Write the renderer**

`src/lib/shareCard/shareCard.tsx`:

```tsx
/* Framework imports ----------------------------------- */
import { ImageResponse } from 'next/og';

/* Module imports -------------------------------------- */
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

/* Module imports (project) ---------------------------- */
import { getEditionCardData } from 'db/queries/getEditionCardData';
import { CARD_COLORS } from './colors';

/* Component imports ----------------------------------- */
import VinylNoteGlyph from 'components/brand/VinylNote/VinylNoteGlyph';

/* Image route metadata -------------------------------- */
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Fête de la Musique à Bordeaux';

/* Helpers --------------------------------------------- */
const loadFonts = async (): Promise<
  Array<{ name: string; data: ArrayBuffer; weight: 400 | 700; style: 'normal' }>
> => {
  const [regular, bold] = await Promise.all([
    fetch(new URL('./fonts/Inter-Regular.ttf', import.meta.url)).then(async(r) => r.arrayBuffer()),
    fetch(new URL('./fonts/Inter-Bold.ttf', import.meta.url)).then(async(r) => r.arrayBuffer()),
  ]);
  return [
    { name: 'Inter', data: regular, weight: 400, style: 'normal' },
    { name: 'Inter', data: bold, weight: 700, style: 'normal' },
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
          <svg width="340" height="340" viewBox="0 0 120 120">
            <VinylNoteGlyph
              recordColor={c.primary}
              holeColor={c.background}
              noteColor={c.primaryForeground}
              grooveColor={c.mutedForeground}
              groove
            />
          </svg>
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
```

- [ ] **Step 2: Verify compile + lint**

Run: `pnpm tsc:ci && pnpm exec eslint src/lib/shareCard`
Expected: no errors. (If `strict-boolean-expressions` flags any check, mirror the explicit `!== null` / `!== ''` patterns already used above.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/shareCard/shareCard.tsx
git commit -m "Add renderShareCard ImageResponse renderer"
```

---

## Task 5: Per-edition image routes

**Files:**
- Create: `src/app/(public)/[year]/opengraph-image.tsx`
- Create: `src/app/(public)/[year]/twitter-image.tsx`

- [ ] **Step 1: Create the opengraph-image route**

`src/app/(public)/[year]/opengraph-image.tsx`:

```tsx
/* Module imports (project) ---------------------------- */
import { renderShareCard, size, contentType, alt } from 'lib/shareCard/shareCard';

/* Image route metadata -------------------------------- */
export { size, contentType, alt };

/* Image handler --------------------------------------- */
const Image = async({ params }: { params: Promise<{ year: string }> }): Promise<Response> => {
  const { year } = await params;
  return renderShareCard(year);
};

export default Image;
```

- [ ] **Step 2: Create the twitter-image route (same image)**

`src/app/(public)/[year]/twitter-image.tsx`:

```tsx
export { default, size, contentType, alt } from './opengraph-image';
```

- [ ] **Step 3: Verify compile**

Run: `pnpm tsc:ci`
Expected: no errors.

- [ ] **Step 4: Visually verify the generated PNG**

With `pnpm dev` running, open in a browser (pick a real published year, e.g. 2026):
`http://localhost:3000/2026/opengraph-image`
Expected: a 1200×630 PNG — vinyl+note hero on the left, `FÊTE DE LA MUSIQUE` / `2026` / `Bordeaux` / `<date> · <n> concerts` stacked on the right. Then open `http://localhost:3000/2099/opengraph-image` (no such edition) and confirm the neutral card (logo + `FÊTE DE LA MUSIQUE` + `Bordeaux`, no year/date/count).
Troubleshooting: if the font is missing/boxy, re-check Task 1 Step 2. If a motif shape is missing, Satori may not support a primitive — confirm `circle`/`ellipse`/`rect`/`path` all render; simplify the note `path` to overlapping `ellipse`+`rect` only if needed.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(public)/[year]/opengraph-image.tsx" "src/app/(public)/[year]/twitter-image.tsx"
git commit -m "Add per-edition opengraph/twitter image routes"
```

---

## Task 6: Per-edition metadata layout

**Files:**
- Create: `src/app/(public)/[year]/layout.tsx`

- [ ] **Step 1: Create the server layout with generateMetadata**

`src/app/(public)/[year]/layout.tsx`:

```tsx
/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports (project) ---------------------------- */
import { getEditionCardData } from 'db/queries/getEditionCardData';

/* Type imports ---------------------------------------- */
import type { Metadata } from 'next';

/* Metadata -------------------------------------------- */
export const generateMetadata = async(
  { params }: { params: Promise<{ year: string }> },
): Promise<Metadata> => {
  const { year } = await params;
  const yearNum = /^\d{4}$/.test(year) ? Number(year) : null;
  const data = yearNum !== null ? await getEditionCardData(yearNum) : null;

  const title = data !== null
    ? `Fête de la Musique ${data.year} à Bordeaux`
    : 'Fête de la Musique à Bordeaux';

  const desc = data?.description ?? null;
  const description = desc !== null && desc.length > 0
    ? desc
    : 'Le programme de la fête de la musique à Bordeaux.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
  };
};

/* EditionLayout component prop types ------------------ */
interface EditionLayoutProps {
  children: React.ReactNode;
}

/* EditionLayout component ----------------------------- */
const EditionLayout: React.FC<EditionLayoutProps> = ({ children }) => {
  return <>{children}</>;
};

/* Export EditionLayout component ---------------------- */
export default EditionLayout;
```

- [ ] **Step 2: Verify compile + lint**

Run: `pnpm tsc:ci && pnpm exec eslint "src/app/(public)/[year]/layout.tsx"`
Expected: no errors.

- [ ] **Step 3: Verify the page still renders**

With `pnpm dev`, open `http://localhost:3000/2026` — the agenda must render exactly as before (the layout only passes children through).
Expected: no visual change to the page.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(public)/[year]/layout.tsx"
git commit -m "Add per-edition generateMetadata layout"
```

---

## Task 7: Root metadata migration + default card

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/app/opengraph-image.tsx`
- Create: `src/app/twitter-image.tsx`

- [ ] **Step 1: Migrate the root layout to the native Metadata API**

Replace `src/app/layout.tsx` entirely with:

```tsx
/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports -------------------------------------- */

/* Component imports ----------------------------------- */
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import MainLayout from './MainLayout';
import GoogleInterFont from 'app/fonts/fonts';

/* Style imports --------------------------------------- */
import './globals.css';

/* Type imports ---------------------------------------- */
import type { Metadata } from 'next';

/* Metadata -------------------------------------------- */
const baseUrl = process.env.BETTER_AUTH_URL ?? 'https://prog-fdlm.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: 'Fête de la musique à Bordeaux',
  description: 'Le programme de la fête de la musique à Bordeaux.',
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'Fête de la Musique à Bordeaux',
    title: 'Fête de la musique à Bordeaux',
    description: 'Le programme de la fête de la musique à Bordeaux.',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

/* RootLayout component prop types --------------------- */
interface RootLayoutProps {
  children: React.ReactNode;
}

/* RootLayout component -------------------------------- */
const RootLayout: React.FC<RootLayoutProps> = ({ children }) => {
  return (
    <html
      lang="fr"
      className={GoogleInterFont.variable}
      suppressHydrationWarning
    >
      <body className="flex flex-col min-h-screen">
        <MainLayout>
          {children}
          <Analytics />
          <SpeedInsights />
        </MainLayout>
      </body>
    </html>
  );
};

/* Export RootLayout component ------------------------- */
export default RootLayout;
```

(Drops the hand-rolled `Metadata` interface and the manual `<head>`; Next injects `<title>`/`<meta>`/OG from the `metadata` export. `lang` is now `fr`. The default viewport Next emits matches the one previously hard-coded.)

- [ ] **Step 2: Create the root default image routes (neutral card)**

`src/app/opengraph-image.tsx`:

```tsx
/* Module imports (project) ---------------------------- */
import { renderShareCard, size, contentType, alt } from 'lib/shareCard/shareCard';

/* Image route metadata -------------------------------- */
export { size, contentType, alt };

/* Image handler --------------------------------------- */
const Image = async(): Promise<Response> => {
  return renderShareCard(null);
};

export default Image;
```

`src/app/twitter-image.tsx`:

```tsx
export { default, size, contentType, alt } from './opengraph-image';
```

- [ ] **Step 3: Verify compile + lint + build**

Run: `pnpm tsc:ci && pnpm exec eslint src/app/layout.tsx src/app/opengraph-image.tsx src/app/twitter-image.tsx && pnpm build`
Expected: all pass; the build output lists `/[year]/opengraph-image` and `/opengraph-image` routes.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/app/opengraph-image.tsx src/app/twitter-image.tsx
git commit -m "Migrate root layout to native Metadata API + default share card"
```

---

## Task 8: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Full gate**

Run: `pnpm tsc:ci && pnpm lint && pnpm build`
Expected: all pass. (If `pnpm lint` reports errors only under `.claude/worktrees/.../.next/`, ignore them — they're build artifacts, not source.)

- [ ] **Step 2: Confirm emitted tags on a real edition**

With `pnpm dev`, run:
```bash
curl -s http://localhost:3000/2026 | grep -iE 'og:|twitter:|<title|description'
```
Expected: `<title>Fête de la Musique 2026 à Bordeaux`, `og:title`, `og:description`, `og:image` (absolute URL under `baseUrl`, pointing at `/2026/opengraph-image`), `og:image:width` 1200 / `og:image:height` 630, `og:locale` fr_FR, `og:type` website, `twitter:card` summary_large_image, `twitter:image`.

- [ ] **Step 3: Confirm the bare-domain default**

Run:
```bash
curl -s http://localhost:3000/ -i | grep -iE 'location|og:image' ; curl -s http://localhost:3000/login | grep -iE 'og:image'
```
Expected: `/` 307-redirects to the latest published `/{year}` (crawlers follow it to the edition card); the root/default `og:image` is present on non-edition pages.

- [ ] **Step 4: Validate real previews**

Deploy the branch (or use a public preview URL) and check:
- Facebook Sharing Debugger (`developers.facebook.com/tools/debug/`) — re-scrape, confirm the 1200×630 card and no OG warnings.
- Send the link to yourself in Telegram and WhatsApp — confirm the card renders (re-send if Telegram cached an old scrape).

Expected: the per-edition card appears with title/description/image across all four target apps.

- [ ] **Step 5: Finish the branch**

Invoke the `superpowers:finishing-a-development-branch` skill to choose merge / PR / cleanup.

---

## Self-Review

- **Spec coverage:** dynamic per-edition card (T4/T5) ✓; minimal site-matching style + vinyl/note motif (T2/T4) ✓; vinyl+note restyled, no "4"s (T2 glyph + `groove` in T4) ✓; year+date+count+city (T4) ✓; approach A — opengraph-image convention + native Metadata (T5/T6/T7) ✓; root metadataBase + lang fr + default OG (T7) ✓; neutral fallback for unknown year (T4/T5) ✓; Satori font buffers + concrete colors (T1/T4) ✓; verification via tsc/lint/build/curl/visual + platform debuggers (T8) ✓.
- **Placeholder scan:** every code step shows full code; commands have expected output. No TBD/TODO.
- **Type consistency:** `renderShareCard(year: string | null)`, `getEditionCardData(year: number) → EditionCardData | null`, exported `size`/`contentType`/`alt` reused across routes — consistent across T3–T7.
