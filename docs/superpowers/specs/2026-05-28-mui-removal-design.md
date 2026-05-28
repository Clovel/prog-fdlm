# Migrate from MUI to Tailwind + shadcn/ui

**Status:** Approved, awaiting implementation plan
**Date:** 2026-05-28
**Author:** Clovis Durand (via Claude Code brainstorming session)

## Goal

Remove all Material UI and Emotion dependencies from the codebase. Replace them with shadcn/ui components built on Tailwind CSS v4 (already installed) and Radix UI primitives. Add a manual light/dark/system theme toggle. Keep the page's information architecture and overall layout, but accept shadcn's default typography scale, spacing, and neutral color palette ("light refresh" scope).

## Non-goals

- Rewriting the event-card layout or the category-section information architecture.
- Reworking the geocoding effect in `EventsMap.tsx`.
- Changing the `Event` type, the fixture event objects, or the event data shape.
- Adding shadcn components that drag in heavy peer dependencies for features the site does not have (see "Components installed" below).
- Touching `react-social-media-embed`, `@react-google-maps/api`, or other non-MUI dependencies.

## End-state stack

**Removed:**

- `@mui/material`, `@mui/icons-material`
- `@emotion/react`, `@emotion/styled`, `@emotion/css`, `@emotion/cache`
- `src/components/Theme/` (entire directory: `ThemeRegistry.tsx`, `theme.ts`, `EmotionCache.tsx`)
- The `modularizeImports` entry for `@mui/icons-material` in `next.config.js`
- The `@media (prefers-color-scheme: dark)` block in `src/app/globals.css` (superseded by `next-themes` + shadcn CSS variables)

**Added:**

- `lucide-react` — icon set (replaces `@mui/icons-material`)
- `next-themes` — dark mode toggle support
- `class-variance-authority`, `clsx`, `tailwind-merge` — shadcn dependencies
- `@radix-ui/*` primitives, pulled in transitively as each shadcn component is added
- `sonner` — toast (separate package, depended on by shadcn's sonner wrapper)
- shadcn components living at `src/components/ui/*.tsx`

## Theming

- shadcn's CSS variable system in `src/app/globals.css`, replacing the existing custom `--foreground-rgb` / `--background-start-rgb` / `--background-end-rgb` variables.
- Base color: **`neutral`** (shadcn default).
- Style: **`new-york`** (more compact than `default`, better suited to the event-listing density).
- Dark mode: **manual toggle** with `next-themes`, `attribute="class"`, `defaultTheme="system"`, `enableSystem`. The provider wraps the app inside `src/app/MainLayout.tsx`, replacing the current `ThemeRegistry` wrapper.
- Toggle UI: a `<Button variant="ghost" size="icon">` placed in `Header.tsx`, opening a `DropdownMenu` with Light / Dark / System options (the canonical shadcn pattern). Icons: `Sun`, `Moon`, `Monitor` from `lucide-react`.
- Inter font: the existing `next/font/google` setup in `src/app/fonts/fonts.ts` stays; the font-family is exposed via the `--font-sans` CSS variable consumed by Tailwind.

## Components installed

The full shadcn/ui registry. Per maintainer request, everything is installed up front to avoid `npx shadcn@latest add` round-trips during future development. The marginal cost is bigger `node_modules` for the heavy peer deps (`recharts`, `embla-carousel-react`, `react-day-picker`, etc.) and additional files in `src/components/ui/` that lint/TS process.

**Installed (~46 components):**

`accordion`, `alert`, `alert-dialog`, `aspect-ratio`, `avatar`, `badge`, `breadcrumb`, `button`, `calendar`, `card`, `carousel`, `chart`, `checkbox`, `collapsible`, `command`, `context-menu`, `date-picker`, `dialog`, `drawer`, `dropdown-menu`, `form`, `hover-card`, `input`, `input-otp`, `label`, `menubar`, `navigation-menu`, `pagination`, `popover`, `progress`, `radio-group`, `resizable`, `scroll-area`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `slider`, `sonner`, `switch`, `table`, `tabs`, `textarea`, `toggle`, `toggle-group`, `tooltip`

**Peer dependencies pulled in transitively:**

`react-hook-form` + `zod` + `@hookform/resolvers` (form), `recharts` (chart), `react-day-picker` (calendar, date-picker), `embla-carousel-react` (carousel), `cmdk` (command), `vaul` (drawer), `input-otp` (input-otp), `react-resizable-panels` (resizable), `sonner` (sonner toast).

**Not available in the shadcn registry:**

| Requested | Status |
|---|---|
| Time picker | No native shadcn component. Standard workaround is a custom composition (`Input type="time"`, or `Select` for hours/minutes, optionally inside a `Popover`). Out of scope for this migration — flagged here so it's not a surprise later. |
| Date picker | Installed. shadcn's `date-picker` is a small example file composing `Calendar` + `Popover` + `Button`, also added as `src/components/ui/date-picker.tsx`. |

**Used immediately during the migration:**

`alert` (extended with `warning` and `success` variants), `button`, `collapsible`, `dropdown-menu` (for the theme toggle), `separator`. The other ~40 components ship unused, ready for future development.

## Component mapping (MUI → replacement)

| MUI | Replacement | Notes |
|---|---|---|
| `Typography variant="h4"` | `<h4 className="text-2xl font-semibold tracking-tight">` | shadcn's heading scale |
| `Typography variant="h5"` / `h6` | `<h5>` / `<h6>` with matching Tailwind classes | |
| `Typography variant="subtitle1"` | `<span className="text-lg font-medium">` | Replaces the `1.2rem` font-size override |
| `Typography variant="body2" color="text.secondary"` | `<p className="text-sm text-muted-foreground">` | `text-muted-foreground` is a shadcn CSS variable |
| `List` / `ListItem` / `ListItemButton` / `ListItemText` | Plain `<ul>` / `<li>` / `<button>` with Tailwind | Hover state via `hover:bg-accent`, focus ring via shadcn defaults |
| `Collapse` (auto-height anim) | shadcn `Collapsible` | Radix-based; CSS-driven height animation |
| `IconButton` | `<Button variant="ghost" size="icon">` | shadcn `Button` covers this |
| `Alert` (4 severities) | shadcn `Alert` extended with 4 variants | `default` (info), `destructive` (error), **new `warning`**, **new `success`**. Done by editing the `cva` config in `src/components/ui/alert.tsx`. Note: shadcn's `default` variant is neutral (no blue background), so MUI's `severity="info"` style is a minor visual drift. |
| `Link` / `MuiLink` | Plain `<a>` with `className="underline-offset-4 hover:underline"` | Applies to both standalone links (Header, Copyright, EventInfoWindow, EventListItemDetails) and in-fixture description links. No `next/link` migration needed — no internal links exist today. |
| `Divider` | shadcn `Separator` | |
| `CssBaseline` | shadcn's `globals.css` reset | |
| `ExpandLess` / `ExpandMore` | `ChevronUp` / `ChevronDown` from `lucide-react` | |

## Specific tricky bits

### Description-embedded Alerts

`src/components/EventList/EventListItemDetails.tsx` has two Emotion `css\`\`` blocks. The second (`descriptionTypographyDiv`) targets MUI's internal `.MuiAlert-root` and `.MuiAlert-message` class names because event descriptions in the fixtures sometimes contain `<Alert>` JSX (e.g. cancellation notices). After migration, those selectors die.

**Resolution:** delete the second `css\`\`` block. Style the in-description alerts by passing Tailwind classes directly on the new shadcn `Alert` instances inside the fixtures (e.g. `<Alert variant="warning" className="my-2 max-w-[450px] mx-auto">...</Alert>`). The first `css\`\`` block (`descriptionSpan`'s `& ul { list-style: inside }` and `& p { padding-bottom: 0.5rem }`) is converted to a single `@layer components` block in `src/app/globals.css`, scoped via a `.event-description` class that `EventListItemDetails.tsx` applies to the wrapping `<div>` around `event.description` and the links list.

### Fixture Alert migration

Six inline `<Alert severity="...">` calls in `events-2023.tsx`, `events-2024.tsx`, and `WeatherAlert.tsx` (which also has 3 of them). The migration:

1. Swap `import { Alert } from '@mui/material'` for `import { Alert } from 'components/ui/alert'`.
2. Rename the `severity` prop to `variant` (`severity="warning"` → `variant="warning"`, `severity="error"` → `variant="destructive"`, `severity="info"` → `variant="default"`, `severity="success"` → `variant="success"`).
3. Keep the JSX bodies unchanged. shadcn's `Alert` accepts arbitrary children, so existing `<p>`, `<ul>`, `<li>` content inside the alerts works without forcing the `AlertTitle` / `AlertDescription` sub-component split.

### Theme registry deletion

`src/components/Theme/ThemeRegistry/` contains `ThemeRegistry.tsx`, `theme.ts`, `EmotionCache.tsx`. All three are deleted at the end. `MainLayout.tsx` is rewritten to wrap children in the `next-themes` `ThemeProvider` directly. No more Emotion server-side cache plumbing because no more Emotion.

## Commit plan

On a new branch `feature/remove-mui`:

1. **`Scaffolded shadcn/ui and dark mode`** — `components.json`, base CSS variables + theme tokens in `globals.css`, `next-themes` install, `ThemeProvider` in `MainLayout.tsx`, all 36 shadcn components added (`npx shadcn add ...`), `lucide-react` install.
2. **`Migrated leaf components to shadcn`** — `Copyright`, `Header` (incl. theme toggle dropdown), `EventCategoryView`, `EventTime`, `WeatherAlert`, `EventsRecap`, `EventInfoWindow`.
3. **`Migrated EventList family to shadcn`** — `EventList`, `EventListItem`, `EventListItemDetails`. Includes the `descriptionTypographyDiv` → `@layer components` rewrite.
4. **`Migrated fixture Alerts to shadcn`** — `events-2023.tsx`, `events-2024.tsx`, and the Alert imports in `WeatherAlert.tsx` (if not already done in step 2).
5. **`Removed MUI, Emotion, and theme registry`** — uninstall MUI/Emotion packages, delete `src/components/Theme/`, remove the `modularizeImports` entry from `next.config.js`, update `CLAUDE.md` to drop the "three styling systems" section and the MUI-specific guidance.

Each commit must pass `pnpm tsc:ci` + `pnpm lint` + `pnpm build` before moving to the next. Visual verification happens at the end of the branch by running `pnpm dev` and exercising the page.

## Verification

End-of-branch checklist:

- [ ] `pnpm tsc:ci` clean
- [ ] `pnpm lint` clean
- [ ] `pnpm build` clean
- [ ] No references to `@mui/*` or `@emotion/*` remain (`grep -r "@mui\|@emotion" src`)
- [ ] `package.json` no longer lists any MUI / Emotion dependency
- [ ] `pnpm dev` smoke test:
  - Home page renders, all category sections present
  - Expand-collapse on an event with a description
  - Event description that contains an embedded Alert (e.g. cancellation notice) renders with the new shadcn Alert
  - Theme toggle in the header cycles Light / Dark / System and the page updates
  - Header, Copyright, WeatherAlert all render in both light and dark
  - Google Map still loads with markers (smoke check that the migration didn't break unrelated code)

## Risks / open questions

- **Visual drift on the Alert component.** shadcn's Alert has a different visual treatment than MUI's (no colored background by default, more subtle). For the in-description Alerts inside event cards, this may look meaningfully different. Acceptable per the "light refresh" scope.
- **Theme toggle button placement.** The current header is two-column on desktop, stacked on mobile. The toggle adds a third element; layout may need a minor tweak. Expected resolution: put the toggle on the same row as the "Made with ❤️" credit.
- **`use client` directives.** Several components currently work as server components (they're under `MainLayout` which is `'use client'`, so it propagates). After the migration, the `next-themes` `ThemeProvider` is the only required client boundary; nothing else needs `'use client'` unless it uses hooks. No deliberate refactor of server/client split — keep what works.
