# Visitor-friendly 404 page for `/[year]`

**Date:** 2026-05-31
**Status:** Approved (pending spec review)
**Scope:** Public site — the `(public)/[year]` route's not-found experience.

## Problem

The `(public)/[year]` route already renders Next's nearest `not-found.tsx` when an
edition cannot be found, but the current page
(`src/app/(public)/[year]/not-found.tsx`) is bare: a heading, one line of text, and a
plain text link. Two gaps:

1. It is not "visitor-friendly" — no branding, no warmth, no music theme.
2. Malformed years never reach it. The `[year]` dynamic segment matches anything
   (e.g. `/banane`, `/99`). A non-4-digit year fails the API's `^\d{4}$` Zod check and
   returns **400**, so `page.tsx` throws and shows the generic error
   ("Impossible de charger les événements.") instead of a 404.

## Goal

A polished, music-themed 404 page with a custom illustration, friendly French copy, and a
single "go back" button to `/` (which already redirects to the latest published edition).
All not-found cases — genuine 404s **and** malformed years — should land here.

## Non-goals (YAGNI)

- No list of available editions (the single CTA to `/` suffices).
- No new dependencies, no static image assets.
- No changes to the API routes or to the root-page "Aucune édition disponible" empty
  state.

## Design

### 1. `src/app/(public)/[year]/not-found.tsx` (rewrite)

Remains a **server component** and renders inside the existing public layout
(`(public)/layout.tsx` → `Header` + footer), so the header and footer continue to show.

Centered column, mobile-first, top to bottom:

- The music-themed SVG illustration (§2).
- Headline: **"Oups, fausse note 🎵"**.
- Sub-line: **"Cette édition de la Fête de la Musique n'existe pas (ou pas encore)."**
- Primary action: shadcn `<Button asChild>` wrapping `<Link href="/">` with label
  **"Revenir à l'accueil"**. `/` redirects to the latest published edition.

Container mirrors the current file's pattern:
`flex flex-col items-center justify-center w-full p-8 text-center gap-…`. Theme tokens
only (`text-foreground`, `text-muted-foreground`); no raw color names. Apostrophes
escaped as in the existing file (`&apos;` / string literals), per repo convention.

### 2. The illustration

A self-contained **inline SVG** composing **`4 ◉♪ 4`** — two large "4" glyphs flanking a
vinyl-record / musical-note motif as the "0".

- Lives in a small sibling component `Music404.tsx` (same folder) for readability, or
  inline in `not-found.tsx` if it stays short. Either is acceptable; prefer a sibling
  component if it exceeds ~30 lines.
- Strokes/fills use `currentColor` and theme tokens (`text-primary`,
  `text-muted-foreground`) so a single SVG works in both light and dark mode — no second
  asset.
- Responsive size (e.g. `w-48 sm:w-64 h-auto`).
- Decorative: `aria-hidden="true"` on the SVG, with the accessible meaning carried by the
  visible headline text.
- Follows the repo's component banner convention if it becomes its own file
  (`/* Framework imports */`, `/* <Name> component */`, default export, `React.FC`).

### 3. Route malformed years to the 404 — `src/app/(public)/[year]/page.tsx`

Two changes:

1. **Early synchronous guard** at the top of the component body: if `year` does not match
   `/^\d{4}$/`, call `notFound()` immediately (before the effect/fetch). This avoids a
   doomed network round-trip and the generic-error flash, and renders the 404 boundary
   synchronously.
2. **Defensive API handling**: in `fetchEdition` and `fetchEvents`, treat **400** the same
   as **404** (`response.status === 404 || response.status === 400` → `notFound()`), so
   any malformed year that bypasses the guard still lands on the friendly page rather than
   the error state.

`notFound()` is already called from inside these fetch helpers for the 404 case, so the
pattern is unchanged — only the status check widens.

### 4. Behavior matrix

| Path        | API result        | Outcome                          |
|-------------|-------------------|----------------------------------|
| `/2024`     | 200               | Edition renders                  |
| `/3000`     | 404 (no edition)  | Friendly 404                     |
| `/banane`   | guard / 400       | Friendly 404                     |
| `/99`       | guard / 400       | Friendly 404                     |
| network/500 | throws            | Generic error (unchanged)        |

Genuine load failures (network errors, 500s) still show the existing error message — only
not-found and malformed-year cases are redirected to the 404.

## Verification

- `pnpm tsc:ci` — no type errors.
- `pnpm lint` — clean (mind `strict-boolean-expressions`, `keyword-spacing` no-space-after
  `if`, trailing commas, single quotes in JS / double in JSX, explicit return types).
- Visual check in `pnpm dev`:
  - `/3000` (well-formed, no edition) → friendly 404.
  - `/banane` (malformed) → friendly 404, no error flash.
  - Both in light and dark mode; header and footer present.

## Files touched

- `src/app/(public)/[year]/not-found.tsx` — rewrite.
- `src/app/(public)/[year]/Music404.tsx` — new (if illustration is extracted).
- `src/app/(public)/[year]/page.tsx` — guard + widened status check.
