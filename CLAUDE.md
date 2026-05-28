# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A single-page, French-language, mobile-first website that aggregates events for the **Fête de la Musique** in Bordeaux. The site is read-only for users: there is no backend, no database, and no admin UI. Every event is hand-curated as a TypeScript object inside `src/fixtures/events-YYYY.tsx` and edited directly by maintainers before/during the day of the festival.

The current year shown by the site is whatever fixture `src/app/page.tsx` and `src/components/Header/Header.tsx` happen to import. Past years (e.g. `events-2023.tsx`) are kept in the repo but unused.

## Commands

Package manager is **pnpm** (pinned via `packageManager` in `package.json`). Node must be **>=24 <25** (`.nvmrc` pins `24.12.0`). `npm` and `yarn` are blocked via the `engines` field — use `corepack enable pnpm` if pnpm isn't on `$PATH`.

```bash
pnpm dev          # start Next.js dev server (http://localhost:3000, Turbopack)
pnpm build        # production build
pnpm start        # run the production build
pnpm lint         # ESLint flat config
pnpm lint-fix     # ESLint with --fix
pnpm tsc          # TypeScript compile
pnpm tsc:ci       # TypeScript --noEmit (used in CI)
```

There is no test framework configured. Verification is done via `tsc:ci`, `lint`, and visually in the dev server.

## Environment variables

`src/components/EventsMap/EventsMap.tsx` reads two `NEXT_PUBLIC_*` keys at build/runtime:

- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — required for the Google Map to render; the map block in `page.tsx` is conditionally rendered only if this is set and non-empty.
- `NEXT_PUBLIC_GEOCODING_API_KEY` — passed to `react-geocode` (`setDefaults`) to turn `event.location.addressStr` into lat/lng for marker placement.

`.env.local` is gitignored (see `.gitignore` — both `.env*.local` and an explicit `.env.local` entry). Note `.env.local` currently contains live keys committed to the working tree on disk; do not paste these into commits or external systems.

## Architecture

### Single-page App Router layout

The app uses the Next.js **App Router** (`src/app/`), not the legacy `pages/` router. There is exactly one page:

- `src/app/layout.tsx` — `RootLayout` (server), sets `<html>`/`<head>`, mounts `<Analytics>` and `<MainLayout>`.
- `src/app/MainLayout.tsx` — `'use client'`, wraps `<body>` with `next-themes`' `ThemeProvider` (class-attribute strategy) plus a fixed `Header`/`Copyright`.
- `src/app/page.tsx` — `'use client'`, the home page. The entire site lives here.

`page.tsx` does the work in three stages, all client-side:

1. **Group + sort by category.** `reduceEventsByCategory(events)` produces `Partial<EventsByCategories>` (a map keyed by `EventCategory | 'Autres'`). `Object.entries(...).sort(sortEventsByCategoryEntries)` orders categories using the canonical order defined in `src/types/eventCategories.ts` (`'Centre ville'` first, …, `'Saint-Médard-en-Jalles'` last, with `'Autres'` always pushed to the end).
2. **Render one `EventCategoryView` per category**, which in turn renders an `EventList` of `EventListItem`s. Each item is expandable (`Collapse`) into `EventListItemDetails` showing description + links.
3. **Append the recap, two page-level Instagram embeds (hardcoded in `page.tsx`, NOT driven by `event.embedLinks`), and the Google Map** (`EventsMap`), which geocodes every event with an `addressStr` and drops a `Marker` at the result.

Because everything is one `'use client'` page reading a static fixture, there is no data-fetching layer, no API routes, no server actions. Adding/removing events = editing the fixture file.

### Event data model

`src/types/Event.ts` is the contract:

- `Event` has `id`, optional `name`/`description`/`category`/`status`/`genres`/`artists`/`links`/`price`, plus a required `location: { name; addressStr?; coords? }` and `startTime: Date` (`endTime?` is optional — events may be open-ended or all-nighters).
- `category` is constrained to the const array in `src/types/eventCategories.ts` — **add new neighborhoods there**, not in fixtures, or sorting will silently break (events with an unknown category produce `indexOf === -1` and sort to the very top).
- `status` is one of `'canceled' | 'postponed' | 'rescheduled'` and is rendered as a colored badge in `EventListItem` with the French labels "Annulé" (red), "Reporté" (purple), and "Reprogrammé" (orange). Each color has a `dark:` counterpart (`dark:text-red-400`, `dark:text-purple-400`, `dark:text-orange-400`) for dark mode.
- `description` is typed as `React.ReactNode` for free-form text/JSX. As of the `react-social-media-embed` removal, `description` no longer contains `<InstagramEmbed>` / `<FacebookEmbed>` / `<CustomEmbed>` JSX — embeds are stored as structured data in `event.embedLinks: EventEmbedLink[]` and rendered by `<EventRender />`. Inline `<Alert>` JSX (e.g. cancellation notices) still belongs inside `description`. Embeds always render AFTER the description; positional interleaving inside the description is not supported by the new model.
- `embedLinks?: EventEmbedLink[]` — optional, an array of `{ type: 'instagram' | 'facebook'; url: string }`. Used by `<EventRender />` to render embeds below the description. No per-embed `maxWidth` field by design.
- `EventLink.label` is typed as `React.ReactNode` (for cases where the label needs richer JSX). Fixtures are `.tsx`, not `.ts` or JSON, so JSX in `description` / `label` works.

### Component conventions

Every component file follows a strict comment-banner layout that ESLint does not enforce but every existing file uses — keep it when editing:

```
/* Framework imports ----------------------------------- */
/* Module imports -------------------------------------- */
/* Component imports ----------------------------------- */
/* Style imports --------------------------------------- */
/* Type imports ---------------------------------------- */
/* <ComponentName> component prop types ---------------- */
/* <ComponentName> component --------------------------- */
/* Export <ComponentName> component -------------------- */
```

Components are typed as `React.FC<Props>`, default-exported, and prop interfaces live above the component (named `<Name>Props`, often empty `{}`). Type-only imports use `import type { ... }` — `@typescript-eslint/consistent-type-imports` enforces it.

### Styling stack

- **Tailwind CSS v4** for layout/spacing/typography utilities. CSS-first config in `src/app/globals.css` inside `@theme { ... }` blocks. Source files are auto-detected. PostCSS pipeline uses `@tailwindcss/postcss`.
- **shadcn/ui (`new-york` style, `neutral` base)** for components. All components live under `src/components/ui/` as plain `.tsx` files we own — edit them freely. The full registry was installed up-front (~46 components); only a handful are wired into the page (`alert`, `button`, `collapsible`, `dropdown-menu`, `separator`). The rest are ready for future use.
- **Theme tokens** are defined as CSS variables (`--background`, `--foreground`, `--primary`, `--muted-foreground`, etc.) in `src/app/globals.css`. Light/dark are scoped via a `.dark` class on `<html>`. Use `text-muted-foreground`, `bg-card`, `border-border` etc. in component code — do NOT reach for raw color names like `text-zinc-700`.
- **Dark mode** is toggled by `next-themes` (`attribute="class"`, `defaultTheme="system"`, `enableSystem`). The toggle dropdown lives in `src/components/ThemeToggle/ThemeToggle.tsx` and is mounted in the header.
- **Icons** are `lucide-react`.
- **Custom one-offs** that don't fit a utility (e.g. the in-description `<ul>` / `<p>` defaults) live as a `@layer components` block in `globals.css`, scoped via the `.event-description` class.

### Social media embeds

Instagram and Facebook embeds are owned in-tree under `src/components/embeds/`:

- `InstagramEmbed` and `FacebookEmbed` are public exports from `src/components/embeds/index.ts`. Each takes a `url` (and `<FacebookEmbed>` optionally `type: 'post' | 'video'`); width is fluid up to a CSS-driven `maxWidth` cap (default 540 px Instagram, 750 px Facebook). The `maxWidth` is a per-instance prop on the component, NOT a per-`EventEmbedLink` field — the data model intentionally has no per-embed width override (was a hand-tuned prop in the old `react-social-media-embed` wrappers; dropped during the rsme removal for simplicity).
- `<CustomEmbed type="instagram" | "facebook" url={...} maxWidth={...} />` (at `src/components/CustomEmbed/CustomEmbed.tsx`) is a thin dispatcher that picks the right component. The `maxWidth` prop is forwarded to the underlying `<InstagramEmbed>` / `<FacebookEmbed>`. Useful when the embed kind is data-driven (e.g. when rendering an `EventEmbedLink`). `<EventRender />` does NOT use `CustomEmbed` — it dispatches inline via its own `renderEmbed` helper. `CustomEmbed` is currently unused by the app — it exists for future data-driven callers.
- The Meta SDK scripts are loaded lazily, once per page, by `src/hooks/useSocialEmbedScript.ts`, gated on a viewport check from `src/hooks/useInViewport.ts`. There is no consent gating — embeds load directly once the host card scrolls into view. If a CMP is introduced later, wire it into the embed components alongside the viewport check.
- Fluid iframe overrides live in `src/components/embeds/embeds.css`, imported via `src/app/globals.css`.

### Path aliases

`tsconfig.json` defines two aliases that both resolve to `./src/*`:

- `*` — used by project code (`fixtures/...`, `components/...`, `types/...`, `helpers/...`).

```ts
import { events } from 'fixtures/events-2024';
import { reduceEventsByCategory } from 'helpers/reduceEventsByCategory';
import EventList from 'components/EventList/EventList';
import type { Event } from 'types/Event';
```

Use this style, not `../../../`.

## ESLint — non-obvious rules you'll trip over

`eslint.config.mjs` (flat config, ESLint 9) layers `js.configs.recommended`, `typescript-eslint`'s `recommendedTypeChecked`, `eslint-config-next/core-web-vitals`, `eslint-plugin-react/recommended`, `eslint-plugin-react-hooks/recommended`, and `eslint-plugin-promise/recommended`. The custom rules that actually matter when editing:

- **2-space indent**, **Unix line endings**, **always-multiline trailing commas** (incl. imports/exports), **single quotes in JS**, **double quotes in JSX**, **semicolons required**.
- `@typescript-eslint/strict-boolean-expressions` is **error** — you cannot do `if(maybeString)`; you must write `if(maybeString !== undefined && maybeString.length > 0)`. The fixtures and components everywhere follow this pattern; copy it.
- `@typescript-eslint/explicit-function-return-type` is **warn** — annotate return types on non-trivial arrow functions, including handlers.
- `keyword-spacing` overrides: **no space after `if`/`switch`/`for`/`while`/`catch`** (i.e. `if(x)`, not `if (x)`). This is unusual but consistent across the repo.
- `prefer-template` — no string concatenation with `+`.
- `promise/always-return` + `promise/catch-or-return` (with `allowFinally`) — every promise chain must `.catch()` (or `.finally()`) and every `then` must return something. See `EventsMap.tsx`'s `fetchEventMarkers().catch(...).finally(...)` as the template.
- `react-hooks/set-state-in-effect` (new in `eslint-plugin-react-hooks` v7) — flags synchronous `setState` calls inside `useEffect`. `EventsMap.tsx` disables it for one line where the pattern is correct (mark-loading → fetch → mark-loaded); follow the same pattern if you hit it.
- **shadcn-generated code is exempt from several strict rules.** `eslint.config.mjs` relaxes `explicit-function-return-type`, `no-unsafe-*`, `strict-boolean-expressions`, and a few React rules for files under `src/components/ui/`, `src/lib/`, and `src/hooks/use-mobile.ts`. Don't try to "fix" the relaxations — the generated code is meant to be edited as-is and re-relaxed if needed.

**ESLint is pinned to v9, not v10.** v10's new scope-manager API breaks `eslint-plugin-react`'s old `eslint-scope` dependency (and transitively `eslint-config-next`'s plugins). Bump to v10 only once the React/Next plugin ecosystem catches up. Several rules from the old `.eslintrc.js` were dropped during the flat-config migration because their plugins haven't been updated: `eslint-config-standard`, `@spence1115/eslint-plugin-modules-newlines`, and several of the verbose `react/jsx-*` formatting rules. The codebase still follows the old conventions (one prop per line, one expression per line, multi-import wrapping) — the rules just don't enforce them anymore.

When in doubt, run `pnpm lint-fix` and mirror the style of a neighbouring file.

## Editing the event list (the most common task)

1. Open `src/fixtures/events-2024.tsx` (or whatever the current year file is).
2. Add an object to the `events` array. `id` is a free-form string but must be **unique within the file** — `EventsMap` uses it as the React `key` and as the `Marker` id.
3. Set `category` to one of the values in `src/types/eventCategories.ts`, or omit it to fall under `'Autres'` (rendered last).
4. Provide `location.addressStr` if you want the event to appear on the map — `EventsMap` skips events without an `addressStr` and logs a `console.warn` for any address Google can't geocode.
5. `description` and `links[].label` can be JSX (paragraphs, `<br />`, `<a>`, shadcn `<Alert>`, etc.). Embeds are NOT JSX — to attach an Instagram or Facebook post to an event, add an entry to `embedLinks: [{ type: 'instagram' | 'facebook', url: '...' }, ...]`. The embed renders below the description, in order.
6. Switching years: update the import in both `src/app/page.tsx` and `src/components/Header/Header.tsx` (Header reads `events.length` for the count).

## Deployment

Hosted on **Vercel** — `@vercel/analytics` and `@vercel/speed-insights` are wired into `layout.tsx`. No custom CI config in the repo; pushes to the connected branch deploy automatically. Set the two `NEXT_PUBLIC_*` Google keys as Vercel env vars, and ensure the Vercel project's "Install Command" / Node version match `pnpm` and Node 24 (the `packageManager` and `engines` fields drive auto-detection on recent Vercel builders).
