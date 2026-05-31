# Social share meta cards (Open Graph / Twitter)

**Date:** 2026-05-31
**Status:** Design approved, pending implementation plan

## Goal

When the site is shared in chat apps and social feeds — primarily **Facebook
Messenger, Instagram, Telegram, WhatsApp**, and secondarily X/Twitter, Slack,
Discord, etc. — show a rich preview card instead of a bare URL. The card is
**dynamic per edition**: each `/{year}` link renders its own image with that
edition's data.

All target platforms read **Open Graph** tags (`og:*`); X/Twitter additionally
reads `twitter:*`. So correct, absolute-URL'd OG tags plus a `summary_large_image`
Twitter card cover every named platform.

## Current state (what exists today)

- `src/app/layout.tsx` uses a **hand-rolled, non-standard `Metadata` interface**
  (not Next's native API) that manually renders `<title>`, `<meta description>`,
  and viewport into `<head>`. **No `og:*` or `twitter:*` tags exist anywhere.**
  `lang="en"` is wrong for a French site.
- `/` (`(public)/page.tsx`, server) redirects (307) to the latest **published**
  edition `/{year}`.
- `/[year]` (`(public)/[year]/page.tsx`) is a **client component** (`'use client'`),
  so it cannot itself export `generateMetadata` or an image convention file — per-
  edition metadata must live in a sibling server module.
- `editions` table has `year`, `description`, `dayOfFestival` (a `date`),
  `isPublished`. Event count is available via `db.$count(events, eq(events.editionId, …))`.
- `src/components/Music404/Music404.tsx` draws a "404" where the **0 is a vinyl
  record with an eighth note** on the label, using SVG primitives
  (`circle`/`rect`/`ellipse`/`path`/`text`) and `fill-foreground`/`fill-primary`/
  `fill-primary-foreground`.
- `src/lib/festivalTime.ts` already uses `date-fns-tz`; `date-fns` + `fr` locale
  are available for formatting `dayOfFestival`.
- Base URL convention: `process.env.BETTER_AUTH_URL ?? 'https://prog-fdlm.vercel.app'`
  (as in `sitemap.ts` / `robots.ts`).
- Next 16, React 19 — `next/og`'s `ImageResponse` is available.

## Decisions (from brainstorming)

1. **Dynamic per-edition** cards (not a single static brand card).
2. **Visual direction: minimal, matches the site** (monochrome, Inter body +
   mono headers), using the **Music404 vinyl/note motif**.
3. **Motif usage: vinyl + note only, restyled** — drop the two "4"s (which read as
   an *error*), keep the record + eighth note as a hero brand mark sized for the card.
4. **Card content:** Year + Date + Event count + City label ("Bordeaux"), all four.
5. **Approach A** (recommended): Next file-convention `opengraph-image.tsx` +
   native Metadata API.

## Approach

**A. Next file-convention image + native Metadata.** Add an
`opengraph-image.tsx` (+ thin `twitter-image.tsx`) under
`src/app/(public)/[year]/`, a server `[year]/layout.tsx` exporting
`generateMetadata`, and migrate the root `layout.tsx` to Next's native `metadata`
export with `metadataBase`. Next auto-emits `og:image` (+ `width`/`height`/`type`)
and `twitter:image` with absolute URLs, and edge-caches the generated PNG.

Rejected: **(B)** a manual `/api/og` route (more hand-wired meta, no per-route
auto-association) and **(C)** static pre-rendered PNGs (user chose dynamic).

## Card layout (1200×630 PNG, single light theme)

OG previews do **not** honor the viewer's dark mode, so the card ships as a single
**light** variant (token values resolved to their light-theme constants — Satori
cannot read CSS variables; see Fonts & tokens below).

```
┌──────────────────────────────────────────────────────────┐
│  (thin --border frame, --background fill)                  │
│                                                            │
│     ╭─────────╮      FÊTE DE LA MUSIQUE   (mono, muted)    │
│     │ vinyl + │                                           │
│     │  note   │      2026                  (large, fg)     │
│     │ (hero)  │      Bordeaux              (subtitle, fg)  │
│     ╰─────────╯                                            │
│                      Dimanche 21 juin · 142 concerts       │
│                                            (muted line)    │
└──────────────────────────────────────────────────────────┘
```

- **Left:** the restyled vinyl-record-with-eighth-note mark as a hero (record
  grooves / outer ring added so it reads at card scale, not as a tiny inline icon).
- **Right column, stacked:** `FÊTE DE LA MUSIQUE` (mono, muted) → large `{year}`
  (foreground) → `Bordeaux` subtitle → a muted meta line
  `{Jour} {jj} {mois} · {n} concerts` (e.g. `Dimanche 21 juin · 142 concerts`).
- Restrained, dark-on-light, mirroring the site's minimal aesthetic.

## Generation & data flow

`src/app/(public)/[year]/opengraph-image.tsx`:

1. Receives `{ params: { year } }`.
2. Loads the edition by year and a `db.$count` of its events (single lightweight
   read; the OG route runs on the server and may query `db` directly).
3. Formats `dayOfFestival` via `date-fns` `format` with the `fr` locale
   (capitalized French weekday + day + month). `dayOfFestival` is a date-only
   column — format as a calendar date, no timezone math needed.
4. Renders the layout via `ImageResponse`, returning `image/png` at 1200×630.

The vinyl/note motif's shape geometry is **one shared source of truth** consumed by
both `Music404` and the OG card.

> **Implementation note (resolved during build):** Satori mangles deeply-nested
> *inline* `<svg>` trees — resvg then throws `xmlParseEntityRef: no name` and the
> PNG never renders. So `VinylNoteGlyph` exports a `vinylNoteSvg()` string builder
> (sharing the React component's geometry constants), and the card embeds it as a
> **base64 data-URI `<img>`**, which resvg rasterizes directly. (A standalone
> `public/*.svg` is still not needed.)

`twitter-image.tsx` re-exports the same renderer (or shares a common module) so the
Twitter card matches the OG image.

## Metadata wiring

**Root `src/app/layout.tsx`** — replace the custom `Metadata` interface with Next's
native `metadata` export:

- `metadataBase: new URL(BETTER_AUTH_URL ?? 'https://prog-fdlm.vercel.app')`
  (so all relative OG/image URLs resolve to absolute — required by every crawler).
- `lang="fr"` on `<html>`; `openGraph.locale = 'fr_FR'`, `openGraph.type = 'website'`,
  `openGraph.siteName = 'Fête de la Musique à Bordeaux'`.
- Sensible default `title` / `description`, **plus a default OG image** so the bare
  domain is safe even if a crawler does not follow the `/`→`/{year}` redirect.
  (Most crawlers — FB/WhatsApp/Telegram — *do* follow 307s and will land on the
  latest edition's card; the default is a fallback.)
- `twitter.card = 'summary_large_image'`.
- Drop the hand-rendered `<head>` `<title>`/`<meta>`; let Next emit them.

**`src/app/(public)/[year]/layout.tsx`** (new, server component, renders
`{children}` only) — export `generateMetadata({ params })`:

- Per-edition `title` (e.g. `Fête de la Musique 2026 à Bordeaux`) and `description`
  (edition `description` if present, else a generated default).
- `openGraph.title`, `openGraph.alt`. The `og:image` itself is auto-associated by
  the colocated `opengraph-image.tsx` — no manual `images` array needed.

## Error / edge handling

- **Non-numeric / unknown year:** the OG renderer falls back to a **neutral card**
  (logo + `Fête de la Musique` + `Bordeaux`, no date/count line) rather than
  throwing. The page route's own `notFound()` behavior is unchanged.
- **Unpublished or empty edition:** render the card without the count line (or
  `0 concerts`); do not leak any non-public field — only year/date/count/city appear.
- **Size budget:** the flat minimal design produces a small PNG, comfortably under
  WhatsApp's ~300 KB preview ceiling and within Telegram/Messenger limits.
- **Caching:** rely on Next's default OG edge caching. Note in the plan that
  Telegram/Facebook cache previews aggressively — re-scrape via the platform's
  debugger when iterating.

## Fonts & tokens (Satori constraints)

- Satori **cannot read CSS or CSS variables.** **Inter** weights 400 + 700 are
  bundled (`src/lib/shareCard/fonts/*.ttf`) and loaded as buffers via
  `fs.readFile(new URL('./fonts/..', import.meta.url))`, then passed to
  `ImageResponse({ fonts: [...] })`. Only Inter is bundled — the "mono header" look
  is reproduced with letter-spaced uppercase Inter, so no second face is needed.
- Theme `oklch(...)` token values are resolved to concrete light-theme color
  constants in the card module (a small local map), since the tokens aren't
  available to Satori.

## Out of scope

- Dark-theme card variant (OG previews don't honor dark mode).
- Per-event share cards (`/api/events/...`) — only edition-level `/{year}` cards.
- A CMP/consent layer (unrelated to share previews).
- Removing/refactoring `Music404`'s rendering beyond extracting the shared motif
  geometry.

## Verification (no test framework)

- `pnpm tsc:ci` and `pnpm lint` (scope eslint to `src/...` if `pnpm lint` is noisy
  from the stray worktree).
- `pnpm dev`, then open `/{year}/opengraph-image` and eyeball the PNG; check the
  neutral fallback at a bogus year.
- `curl` the `/{year}` page `<head>` and confirm the emitted `og:*` / `twitter:*`
  tags + absolute image URL + `og:image:width/height`.
- Validate real previews: Facebook Sharing Debugger, and a test message in
  Telegram / WhatsApp.
