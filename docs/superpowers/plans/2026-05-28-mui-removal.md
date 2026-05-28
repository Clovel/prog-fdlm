# MUI Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all `@mui/*` and `@emotion/*` dependencies, replacing them with shadcn/ui components and a manual dark mode toggle, while keeping the page's information architecture intact.

**Architecture:** Light refresh — shadcn's `new-york` style with the `neutral` base color, full registry installed up-front (~46 components), `next-themes` for the light/dark/system toggle, `lucide-react` for icons. MUI's `Typography` becomes plain HTML tags with Tailwind utility classes; `Collapse` becomes shadcn's `Collapsible` (Radix); `Alert` is extended with `warning`/`success` variants. The two Emotion `css\`\`` blocks in `EventListItemDetails.tsx` are replaced by a `@layer components` rule in `globals.css` plus inline Tailwind classes on the fixture-side Alert instances.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript 6 · Tailwind CSS v4 · shadcn/ui (`new-york` style, `neutral` base) · `next-themes` · `lucide-react` · pnpm 11 · Node 24

**Spec:** `docs/superpowers/specs/2026-05-28-mui-removal-design.md`

**Branch:** `feature/remove-mui` (created in Task 1)

**Verification model:** This project has no test infrastructure. In place of TDD's red-green cycle, every code change is gated by:

```bash
pnpm tsc:ci  # type check
pnpm lint    # ESLint flat config
pnpm build   # Next.js production build (also runs tsc)
```

Each commit must pass all three. End-of-branch verification is a manual smoke test in `pnpm dev`. The verification commands are stated explicitly in each task — do not skip them.

**Pre-flight requirement:** All commits in this branch are GPG-signed (the user has `commit.gpgsign = true` with key `5E7B2C12A3A2E4BB7F071479A95BCD5E4D400E66`). Before running any `git commit`, confirm the GPG passphrase cache is warm by running `gpg --status-fd=2 -bsau <KEY> </dev/null 2>&1 | grep -q '^\[GNUPG:\] SIG_CREATED'` from inside the agent — if it fails, stop and ask the user to run `echo test | gpg --clearsign --local-user 5E7B2C12A3A2E4BB7F071479A95BCD5E4D400E66 > /dev/null` in a regular terminal. **Do NOT add `--no-gpg-sign` without explicit user authorization.**

---

## Task 1: Scaffold shadcn/ui and dark mode

**Files:**
- Create: `components.json`
- Create: `src/lib/utils.ts`
- Create: `src/components/ui/*.tsx` (~46 files via `npx shadcn add`)
- Create: `src/components/ThemeToggle.tsx`
- Modify: `tsconfig.json` (add `@/` path alias alongside the existing `*` alias)
- Modify: `src/app/globals.css` (shadcn CSS variables and `@layer base`)
- Modify: `src/app/MainLayout.tsx` (replace `ThemeRegistry` with `next-themes` `ThemeProvider`, keep `Header` and `Copyright`)
- Modify: `package.json` (new dev deps via shadcn init + `next-themes`, `lucide-react`)

**Note:** `ThemeRegistry` and `theme.ts` (under `src/components/Theme/`) and the MUI `Alert` extension (`src/components/ui/alert.tsx`) are touched in this task but only what's needed for the new toggle to work. The full deletion of `src/components/Theme/` and the `Alert`-variant extension happen in their dedicated tasks.

### Steps

- [ ] **Step 1.1: Create the feature branch**

```bash
git checkout -b feature/remove-mui
```

Expected: `Switched to a new branch 'feature/remove-mui'`.

- [ ] **Step 1.2: Add the `@/*` path alias to `tsconfig.json`**

shadcn uses `@/lib/utils`, `@/components/ui`, etc. throughout its generated code. The existing `"*": ["./src/*"]` alias stays; we add `"components/*": ["./src/*"]` alongside.

Modify `tsconfig.json`'s `paths` field to:

```json
    "paths": {
      "*": [
        "./src/*"
      ],
      "components/*": [
        "./src/*"
      ]
    }
```

- [ ] **Step 1.3: Run shadcn init non-interactively**

```bash
pnpm dlx shadcn@latest init --base-color neutral --yes
```

Expected: writes `components.json` (style: `new-york`, base color: `neutral`), creates `src/lib/utils.ts` with the `cn()` helper, updates `src/app/globals.css` with shadcn's CSS variables and `@layer base` block, installs `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css` (Tailwind v4 animation helpers).

If the CLI defaults `style` to something other than `new-york`, manually edit `components.json` to set `"style": "new-york"`.

- [ ] **Step 1.4: Clean up `globals.css` after shadcn init**

Open `src/app/globals.css`. Three things to verify and fix:

1. The `@theme { --background-image-gradient-radial: ...; --background-image-gradient-conic: ...; }` block from the Tailwind v4 migration must still be there — shadcn init may have overwritten parts of the file. If missing, re-add it above shadcn's `@layer base` block.
2. **Delete the old `@media (prefers-color-scheme: dark)` block** if shadcn init didn't already remove it. It's superseded by shadcn's `.dark` class + `next-themes`. Also delete the old `:root` block with `--foreground-rgb` / `--background-start-rgb` / `--background-end-rgb` — those variables aren't referenced anywhere in code anymore (the `body { color: rgb(var(--foreground-rgb)); }` rule should also be removed since shadcn's globals.css sets `body` colors via its own tokens).
3. The `body { color: rgb(var(--foreground-rgb)); }` rule from the pre-migration CSS is also stale — delete if present.

After cleanup, `globals.css` should contain (in order): `@import "tailwindcss";`, the custom `@theme` block for gradients, shadcn's CSS variable blocks (`:root` and `.dark`), shadcn's `@theme inline` mapping, and shadcn's `@layer base` block.

- [ ] **Step 1.5: Add all shadcn components**

```bash
pnpm dlx shadcn@latest add \
  accordion alert alert-dialog aspect-ratio avatar badge breadcrumb \
  button calendar card carousel chart checkbox collapsible command \
  context-menu date-picker dialog drawer dropdown-menu form hover-card \
  input input-otp label menubar navigation-menu pagination popover \
  progress radio-group resizable scroll-area select separator sheet \
  sidebar skeleton slider sonner switch table tabs textarea toggle \
  toggle-group tooltip --yes
```

Expected: ~46 files created under `src/components/ui/`. The CLI also installs transitive peer deps (`@radix-ui/*`, `react-hook-form`, `zod`, `recharts`, `react-day-picker`, `embla-carousel-react`, `cmdk`, `vaul`, `input-otp`, `react-resizable-panels`, `sonner`).

If the CLI errors out on any individual component (e.g. registry unavailable), retry just that component once; if it still fails, note it and move on — that component can be added later.

- [ ] **Step 1.6: Install `next-themes` and `lucide-react`**

`lucide-react` is normally pulled in by shadcn init, but confirm and install explicitly to be safe:

```bash
pnpm add next-themes lucide-react
```

Expected: both packages added to `dependencies` in `package.json`.

- [ ] **Step 1.6a: Wire the Inter font to `--font-sans` for Tailwind**

The Inter font is loaded via `next/font/google` in `src/app/fonts/fonts.ts` but currently only flows to MUI via the deleted `theme.ts`. Tailwind/shadcn read the font from a `--font-sans` CSS variable, so we need to:

1. Update `src/app/fonts/fonts.ts`:

```ts
/* Module imports -------------------------------------- */
import { Inter } from 'next/font/google';

/* Google Inter Font ----------------------------------- */
const GoogleInterFont = Inter({
  subsets: [ 'latin' ],
  variable: '--font-sans',
});

/* Export Google Inter Font ---------------------------- */
export default GoogleInterFont;
```

2. Apply the font's `variable` class to `<html>` in `src/app/layout.tsx`. Find the `<html lang="en">` line and change it to:

```tsx
import GoogleInterFont from 'app/fonts/fonts';

// ... inside the component:
    <html
      lang="en"
      className={GoogleInterFont.variable}
    >
```

Add the import at the top with the other imports if it's not already there. Confirm shadcn's `:root` block in `globals.css` references `--font-sans` (e.g. `--font-sans: var(--font-sans);` — yes, this circular-looking declaration is the shadcn convention when the variable comes from `next/font`). If shadcn's generated `:root` block uses a literal font family like `"Inter", sans-serif` instead, edit it to read `var(--font-sans)` so the `next/font`-loaded Inter is what's actually used.

- [ ] **Step 1.7: Create the `ThemeToggle` component**

Create `src/components/ThemeToggle.tsx`:

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports -------------------------------------- */
import { useTheme } from 'next-themes';

/* Component imports ----------------------------------- */
import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from 'components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from 'components/ui/dropdown-menu';

/* ThemeToggle component ------------------------------- */
const ThemeToggle: React.FC = () => {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={(): void => setTheme('light')}>
          <Sun className="mr-2 h-4 w-4" />
          Clair
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(): void => setTheme('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          Sombre
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(): void => setTheme('system')}>
          <Monitor className="mr-2 h-4 w-4" />
          Système
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/* Export ThemeToggle component ------------------------ */
export default ThemeToggle;
```

- [ ] **Step 1.8: Replace `ThemeRegistry` with `next-themes` in `MainLayout.tsx`**

Replace the entire body of `src/app/MainLayout.tsx` with:

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports -------------------------------------- */
import { ThemeProvider } from 'next-themes';

/* Component imports ----------------------------------- */
import Header from 'components/Header/Header';
import Copyright from 'components/Copyright/Copyright';

/* MainLayout component prop types --------------------- */
interface MainLayoutProps {
  children: React.ReactNode;
}

/* MainLayout component -------------------------------- */
const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <body className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 min-h-full flex flex-col items-center lg:p-24 lg:pt-8">
          {children}
        </main>
        <footer className="flex flex-col justify-center h-14">
          <Copyright />
        </footer>
      </body>
    </ThemeProvider>
  );
};

/* Export MainLayout component ------------------------- */
export default MainLayout;
```

**Important:** `src/components/Theme/` is **not deleted yet** — the old `ThemeRegistry.tsx`, `theme.ts`, and `EmotionCache.tsx` files remain on disk but are no longer imported from anywhere. Their deletion happens in Task 5.

- [ ] **Step 1.9: Verify the gates**

```bash
pnpm tsc:ci && pnpm lint && pnpm build
```

Expected: all three exit 0. If `tsc:ci` complains about unused imports in the orphaned `Theme/` files, ignore — those files are deleted in Task 5.

If `lint` reports new errors from the freshly-added shadcn `ui/` files (e.g. `@typescript-eslint/explicit-function-return-type` warnings on the generated code), add this block at the end of `eslint.config.mjs` to relax the rules for vendored code:

```js
  {
    files: [ 'src/components/ui/**/*.{ts,tsx}', 'src/lib/**/*.ts' ],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      'react/no-unknown-property': 'off',
      'react/prop-types': 'off',
      'react/display-name': 'off',
    },
  },
```

Re-run `pnpm lint` and confirm it's clean.

- [ ] **Step 1.10: Commit**

Confirm GPG is warm (see pre-flight requirement). Then:

```bash
git add \
  tsconfig.json \
  components.json \
  src/lib \
  src/components/ui \
  src/components/ThemeToggle.tsx \
  src/app/MainLayout.tsx \
  src/app/layout.tsx \
  src/app/fonts/fonts.ts \
  src/app/globals.css \
  package.json \
  pnpm-lock.yaml
git add eslint.config.mjs 2>/dev/null || true
git commit -m "Scaffolded shadcn/ui and dark mode"
```

Expected: a single commit on `feature/remove-mui` with all ~50 new files staged. `git status` after should show no new shadcn files. The `eslint.config.mjs` line is conditional — if step 1.9 didn't need to modify it, the `git add` will be a no-op silently.

---

## Task 2: Migrate leaf components to shadcn

**Files:**
- Modify: `src/components/Copyright/Copyright.tsx`
- Modify: `src/components/Header/Header.tsx`
- Modify: `src/components/EventCategoryView/EventCategoryView.tsx`
- Modify: `src/components/EventList/EventTime.tsx`
- Modify: `src/components/EventsRecap/EventsRecap.tsx`
- Modify: `src/components/EventsMap/EventInfoWindow.tsx`
- Modify: `src/components/WeatherAlert/WeatherAlert.tsx`
- Modify: `src/components/ui/alert.tsx` (extend cva with `warning` and `success` variants)

Each is a self-contained edit. Order chosen so that the Alert variant extension lands before `WeatherAlert.tsx` is migrated (otherwise the type check fails).

### Steps

- [ ] **Step 2.1: Extend the shadcn `Alert` cva with `warning` and `success` variants**

Open `src/components/ui/alert.tsx`. Find the `alertVariants` definition (a `cva()` call). It will look roughly like:

```ts
const alertVariants = cva(
  'relative w-full rounded-lg border ...',
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground',
        destructive: 'text-destructive bg-card *:data-[slot=alert-description]:text-destructive/90 [&>svg]:text-current',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);
```

Add two new variants to the `variant` object:

```ts
        warning: 'border-amber-500/50 text-amber-700 dark:text-amber-400 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400',
        success: 'border-emerald-500/50 text-emerald-700 dark:text-emerald-400 [&>svg]:text-emerald-600 dark:[&>svg]:text-emerald-400',
```

The exact class strings should mirror the structure of `destructive` (whichever Tailwind utilities shadcn's version uses). If `destructive` uses different class slots, match its shape — the point is that warning is amber, success is emerald, both have an SVG icon recolor.

- [ ] **Step 2.2: Migrate `Copyright.tsx`**

Replace the file body of `src/components/Copyright/Copyright.tsx` with:

```tsx
/* Framework imports ----------------------------------- */
import React from 'react';

/* Copyright component --------------------------------- */
const Copyright: React.FC = () => {
  return (
    <p className="text-sm text-muted-foreground text-center">
      {'Made with ❤️ by '}
      <a
        href="https://github.com/Clovel"
        target="_blank"
        rel="noopener noreferrer"
        className="underline-offset-4 hover:underline"
      >
        Clovis Durand
      </a>
      {', Copyright '}
      {new Date().getFullYear()}
      .
    </p>
  );
};

/* Export Copyright component -------------------------- */
export default Copyright;
```

- [ ] **Step 2.3: Migrate `Header.tsx`**

Replace the file body of `src/components/Header/Header.tsx` with:

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports -------------------------------------- */
import { events } from 'fixtures/events-2024';

/* Component imports ----------------------------------- */
import ThemeToggle from 'components/ThemeToggle';

/* Header component prop types ------------------------- */
interface HeaderProps {
  showEventsCount?: boolean;
}

/* Header component ------------------------------------ */
const Header: React.FC<HeaderProps> = (
  {
    showEventsCount = false,
  }
) => {
  return (
    <header className="w-full font-mono flex flex-col lg:flex-row items-center justify-between gap-2 lg:p-16">
      <div>
        <p className="w-full justify-center border-b border-border bg-gradient-to-b from-muted/50 to-transparent pb-6 pt-8 backdrop-blur-2xl lg:rounded-xl lg:border lg:bg-muted/50 lg:p-4 p-2">
          Liste des événements de la fête de la musique 2024 à Bordeaux
          {
            showEventsCount === true &&
              <>
                <br />
                <br />
                {events.length}
                {' '}
                événement
                {events.length !== 1 ? 's' : ''}
                {' '}
                cette année.
              </>
          }
        </p>
      </div>
      <div className="flex items-center gap-2">
        <p>
          {'Made with ❤️ by '}
          <a
            href="https://github.com/Clovel"
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-4 hover:underline"
          >
            Clovis Durand
          </a>
        </p>
        <ThemeToggle />
      </div>
    </header>
  );
};

/* Export Header component ----------------------------- */
export default Header;
```

The commented-out alternative header block at the bottom of the old file is dropped — it's been dead code since at least the 2024 commit.

- [ ] **Step 2.4: Migrate `EventCategoryView.tsx`**

Replace the file body of `src/components/EventCategoryView/EventCategoryView.tsx` with:

```tsx
/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import EventList from '../EventList/EventList';

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';

/* EventCategoryView component prop types -------------- */
interface EventCategoryViewProps {
  categoryTitle: React.ReactNode;
  categoryEvents: Event[];
}

/* EventCategoryView component ------------------------- */
const EventCategoryView: React.FC<EventCategoryViewProps> = (
  {
    categoryTitle,
    categoryEvents,
  },
) => {
  return (
    <section className="flex flex-col w-full max-w-screen lg:max-w-5xl px-2 lg:py-8 mx-auto lg:px-0">
      <div className="flex justify-between items-center">
        <h4 className="text-2xl font-semibold tracking-tight py-4">
          {categoryTitle}
        </h4>
        <span>
          {categoryEvents.length}
          {' '}
          event
          {categoryEvents.length !== 1 ? 's' : ''}
        </span>
      </div>
      <EventList events={categoryEvents} />
    </section>
  );
};

/* Export EventCategoryView component ------------------ */
export default EventCategoryView;
```

- [ ] **Step 2.5: Migrate `EventTime.tsx`**

Replace the file body of `src/components/EventList/EventTime.tsx` with:

```tsx
/* Framework imports ----------------------------------- */
import React from 'react';

/* EventTime component prop types ---------------------- */
interface EventTimeProps {
  startTime: Date;
  endTime?: Date;
}

/* EventTime component --------------------------------- */
const EventTime: React.FC<EventTimeProps> = (
  {
    startTime,
    endTime,
  }
) => {
  return (
    <span className="inline text-sm">
      {
        endTime !== undefined ?
          'De ' :
          'À '
      }
      {
        startTime.toLocaleTimeString(
          'fr-FR',
          {
            hour: '2-digit',
            minute: '2-digit',
          }
        )
      }
      {
        endTime !== undefined &&
          <>
            {' à '}
            {
              endTime.toLocaleTimeString(
                'fr-FR',
                {
                  hour: 'numeric',
                  minute: '2-digit',
                }
              )
            }
          </>
      }
    </span>
  );
};

/* Export EventTime component -------------------------- */
export default EventTime;
```

- [ ] **Step 2.6: Migrate `EventsRecap.tsx`**

`src/components/EventsRecap/EventsRecap.tsx` doesn't actually use MUI today, but verify the import list and remove any MUI/Emotion imports if you spot them.

If no MUI imports are present, skip this step.

- [ ] **Step 2.7: Migrate `EventInfoWindow.tsx`**

Replace the file body of `src/components/EventsMap/EventInfoWindow.tsx` with:

```tsx
/* Framework imports ----------------------------------- */
import React from 'react';

/* Type imports ---------------------------------------- */
import type { MarkerInfo } from './EventsMap';

/* EventInfoWindow component prop types ---------------- */
interface EventInfoWindowProps {
  markerInfo: MarkerInfo;
}

/* EventInfoWindow component --------------------------- */
const EventInfoWindow: React.FC<EventInfoWindowProps> = (
  {
    markerInfo,
  },
) => {
  return (
    <div>
      <h5 className="text-xl font-semibold">
        {markerInfo.event.name}
      </h5>
      <h6 className="text-base font-semibold mt-2">
        Adresse :
      </h6>
      <p>
        {markerInfo.event.location.name}
      </p>
      <p>
        {markerInfo.event.location.addressStr}
      </p>
      {
        markerInfo.event.links &&
        markerInfo.event.links.length > 0 &&
          <>
            <h6 className="text-base font-semibold mt-2">
              Liens :
            </h6>
            <ul>
              {
                markerInfo.event.links.map(
                  (link, index) => (
                    <li key={`${link.url}-${index}`}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block underline-offset-4 hover:underline"
                      >
                        {link.label}
                      </a>
                    </li>
                  ),
                )
              }
            </ul>
          </>
      }
      {
        markerInfo.event.description !== undefined &&
          <>
            <h6 className="text-base font-semibold mt-2">
              Description :
            </h6>
            <div>
              {markerInfo.event.description}
            </div>
          </>
      }
    </div>
  );
};

/* Export EventInfoWindow component -------------------- */
export default EventInfoWindow;
```

- [ ] **Step 2.8: Migrate `WeatherAlert.tsx`**

Replace the file body of `src/components/WeatherAlert/WeatherAlert.tsx` with:

```tsx
/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import { Alert, AlertDescription } from 'components/ui/alert';

/* WeatherAlert component prop types ------------------- */
interface WeatherAlertProps {}

/* WeatherAlert component ------------------------------ */
const WeatherAlert: React.FC<WeatherAlertProps> = () => {
  return (
    <div className="flex flex-col place-items-center min-w-full py-4 lg:py-0">
      <Alert
        variant="destructive"
        className="lg:my-2 lg:p-2 w-full"
      >
        <AlertDescription>
          <p>
            A cause des orages annoncés pour ce soir, ne nombreux événements en plein air sont annulés ou reprogrammés dans des lieux abrités.
          </p>
          <br />
          <p>
            Par exemple, les évènements suivants ont été reprogrammés :
          </p>
          <ul className="list-disc list-inside">
            <li>
              Amplitudes, Cmd+O & L'Orangeade : Darwin de 18 et 21h45, IBOAT de 21h et 4h
            </li>
            <li>
              ③⑥①⑤𝘽𝙀𝘽𝙊𝙋 : Les BROC'S Saint Michel, de 16h à 2h
            </li>
            <li>
              WHYNOT, l'Astrodøme et Musique d'Apéritif : Deus Ex Machina, de 19h à 00h
            </li>
          </ul>
          <br />
          <p>
            Pour Darwin, pensez a vous inscrire sur la liste d'attente :
            {' '}
            <a
              href="https://dice.fm/event/yaedr-hh-fte-de-la-musique-et-du-skate-21st-jun-darwin-bordeaux-tickets"
              target="_blank"
              rel="noreferrer noopener"
              className="text-blue-500 hover:underline"
            >
              Billetterie DICE
            </a>
          </p>
        </AlertDescription>
      </Alert>
      <Alert
        variant="warning"
        className="lg:my-2 lg:p-2 w-full"
      >
        <AlertDescription>
          Les annulations et déplacement des évènements sont en cours de mise à jour.
        </AlertDescription>
      </Alert>
      <Alert
        variant="success"
        className="lg:my-2 lg:p-2 w-full"
      >
        <AlertDescription>
          Merci beaucoup aux lieux qui accueillent les artistes et les évènements qui ont été annulés à cause de la pluie !
          Sans eux la fête serait annulée !
        </AlertDescription>
      </Alert>
    </div>
  );
};

/* Export WeatherAlert component ----------------------- */
export default WeatherAlert;
```

- [ ] **Step 2.9: Verify the gates**

```bash
pnpm tsc:ci && pnpm lint && pnpm build
```

Expected: all three exit 0. Note: this commit's tree still has the old `src/components/Theme/` directory and `Divider`/`Typography` MUI imports in `page.tsx` and `EventListItem.tsx` / `EventListItemDetails.tsx` — those are migrated in Task 3.

- [ ] **Step 2.10: Commit**

```bash
git add src/components/Copyright src/components/Header src/components/EventCategoryView src/components/EventList/EventTime.tsx src/components/EventsRecap src/components/EventsMap/EventInfoWindow.tsx src/components/WeatherAlert src/components/ui/alert.tsx
git commit -m "Migrated leaf components to shadcn"
```

---

## Task 3: Migrate the EventList family and `page.tsx`

**Files:**
- Modify: `src/app/page.tsx` (drop `Typography` and `Divider`)
- Modify: `src/components/EventList/EventList.tsx` (drop MUI `List`)
- Modify: `src/components/EventList/EventListItem.tsx` (rewrite expand/collapse using shadcn `Collapsible` + `Button`)
- Modify: `src/components/EventList/EventListItemDetails.tsx` (drop MUI imports + Emotion `css\`\`` blocks)
- Modify: `src/app/globals.css` (add `@layer components` rule for `.event-description`)

This task swaps the most structurally entangled MUI components — `Collapse`, `List`, `ListItem`, `ListItemButton`, `ListItemText`. The expand/collapse interaction moves from MUI's open-state-by-parent pattern to shadcn's `Collapsible`/`CollapsibleTrigger`/`CollapsibleContent` pattern.

### Steps

- [ ] **Step 3.1: Migrate `page.tsx`**

Open `src/app/page.tsx`. Replace the imports and the JSX that uses `Typography` and `Divider`:

Imports — remove:

```tsx
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
```

Imports — add:

```tsx
import { Separator } from 'components/ui/separator';
```

Inside the component body, replace:

```tsx
                  {
                    array.length - 1 !== index &&
                      <Divider className="w-full" />
                  }
```

with:

```tsx
                  {
                    array.length - 1 !== index &&
                      <Separator className="w-full" />
                  }
```

And replace:

```tsx
        <Typography
          variant="h4"
          className="pb-4"
        >
          Cartes des événements
        </Typography>
```

with:

```tsx
        <h4 className="text-2xl font-semibold tracking-tight pb-4">
          Cartes des événements
        </h4>
```

- [ ] **Step 3.2: Migrate `EventList.tsx`**

Replace the file body of `src/components/EventList/EventList.tsx` with:

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import EventListItem from './EventListItem';

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';

/* EventList component prop types ---------------------- */
interface EventListProps {
  events: Event[];
}

/* EventList component --------------------------------- */
const EventList: React.FC<EventListProps> = ({ events = []}) => {
  return (
    <ul className="min-w-full divide-y divide-border">
      {
        events.map(
          (event, index) => (
            <EventListItem
              key={`${event.name ?? event.location.name}-${index}`}
              event={event}
            />
          )
        )
      }
    </ul>
  );
};

/* Export EventList component -------------------------- */
export default EventList;
```

Note: the `divider` prop is gone — the `divide-y divide-border` Tailwind utility on the parent `<ul>` handles between-item separators.

- [ ] **Step 3.3: Migrate `EventListItem.tsx`**

Replace the file body of `src/components/EventList/EventListItem.tsx` with:

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React, {
  useMemo,
  useState,
} from 'react';

/* Module imports -------------------------------------- */
import { formatPrice } from 'helpers/formatPrice';

/* Component imports ----------------------------------- */
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from 'components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from 'components/ui/collapsible';
import EventTime from './EventTime';
import EventListItemDetails from './EventListItemDetails';

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';

/* EventListItem component prop types ------------------ */
interface EventListItemProps {
  event: Event;
}

/* EventListItem component ----------------------------- */
const EventListItem: React.FC<EventListItemProps> = (
  {
    event,
  },
) => {
  const [ open, setOpen ] = useState<boolean>(false);

  const collapsiblePresent: boolean = useMemo<boolean>(
    () => {
      return event.description !== undefined;
    },
    [
      event.description,
    ]
  );

  return (
    <li className="py-2">
      <Collapsible
        open={open}
        onOpenChange={setOpen}
      >
        <div className="flex items-start justify-between gap-2 px-4">
          <div className="flex-1 min-w-0">
            <div className="text-lg font-medium">
              <span className="font-bold">
                {event.name ?? event.location.name}
              </span>
              {
                event.status !== undefined &&
                  ' - '
              }
              {
                event.status === 'rescheduled' &&
                  <span className="text-orange-600">
                    Reprogrammé
                  </span>
              }
              {
                event.status === 'canceled' &&
                  <span className="text-red-600">
                    Annulé
                  </span>
              }
              {
                event.status === 'postponed' &&
                  <span className="text-purple-600">
                    Reporté
                  </span>
              }
            </div>
            <div className="text-sm">
              <span className="font-semibold">
                {
                  event.name !== undefined &&
                      event.location.name
                }
              </span>
              <span>
                {
                  event.name !== undefined &&
                    event.location.addressStr !== undefined &&
                      ', '
                }
                {
                  event.location.addressStr !== undefined &&
                    event.location.addressStr
                }
              </span>
              {
                event.genres !== undefined &&
                event.genres.length > 0 &&
                  <p>
                    - Genres :
                    {' '}
                    {event.genres.join(', ')}
                  </p>
              }
              {
                event.artists !== undefined &&
                event.artists.length > 0 &&
                  <p>
                    - Artistes :
                    {' '}
                    {event.artists.join(', ')}
                  </p>
              }
              {
                event.price !== undefined &&
                  <p>
                    - Prix :
                    {' '}
                    {formatPrice(event.price)}
                  </p>
              }
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <EventTime
              startTime={event.startTime}
              endTime={event.endTime}
            />
            {
              collapsiblePresent &&
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={open ? 'Replier' : 'Déplier'}
                  >
                    {
                      open ?
                        <ChevronUp className="h-5 w-5" /> :
                        <ChevronDown className="h-5 w-5" />
                    }
                  </Button>
                </CollapsibleTrigger>
            }
          </div>
        </div>
        {
          collapsiblePresent &&
            <CollapsibleContent>
              <EventListItemDetails event={event} />
            </CollapsibleContent>
        }
      </Collapsible>
    </li>
  );
};

/* Export EventListItem component ---------------------- */
export default EventListItem;
```

**Behavior change:** the old version made the entire row clickable to expand. The new version only the chevron button toggles (cleaner UX — the row content is now selectable). The `Collapsible` controlled state pattern keeps the chevron icon in sync with `open`.

**Bug fix:** the old code displayed "Reprogrammé" for both `status === 'rescheduled'` and `status === 'canceled'`. Fixed to show "Annulé" for the canceled case.

- [ ] **Step 3.4: Add the `.event-description` rule to `globals.css`**

Open `src/app/globals.css`. Add (after the existing `@theme` block and shadcn's `@layer base` block):

```css
@layer components {
  .event-description ul {
    list-style: inside;
  }

  .event-description p {
    padding-bottom: 0.5rem;
  }
}
```

- [ ] **Step 3.5: Migrate `EventListItemDetails.tsx`**

Replace the file body of `src/components/EventList/EventListItemDetails.tsx` with:

```tsx
/* Framework imports ----------------------------------- */
import React from 'react';

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';

/* EventListItemDetails component prop types ----------- */
interface EventListItemDetailsProps {
  event: Event;
}

/* EventListItemDetails component ---------------------- */
const EventListItemDetails: React.FC<EventListItemDetailsProps> = (
  {
    event,
  }
) => {
  return (
    <div className="event-description flex flex-col w-full px-4 py-2">
      {
        event.description !== undefined &&
          <article className="w-full">
            <h6 className="text-base font-semibold text-muted-foreground">
              Description de l'événement :
            </h6>
            <br />
            <div className="text-sm text-muted-foreground">
              {event.description}
            </div>
          </article>
      }
      {
        event.links !== undefined &&
        event.links.length > 0 &&
          <article className="flex flex-col w-full mt-4">
            <h6 className="text-base font-semibold text-muted-foreground">
              Liens :
            </h6>
            <ul>
              {
                event.links.map(
                  (link, index) => (
                    <li key={`${link.url}-${index}`}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block underline-offset-4 hover:underline"
                      >
                        {link.label}
                      </a>
                    </li>
                  ),
                )
              }
            </ul>
          </article>
      }
    </div>
  );
};

/* Export EventListItemDetails component --------------- */
export default EventListItemDetails;
```

The `open` and `divider` props are gone — the parent `Collapsible`/`CollapsibleContent` handles open state, and `divide-y` on the parent `<ul>` handles separators.

- [ ] **Step 3.6: Verify the gates**

```bash
pnpm tsc:ci && pnpm lint && pnpm build
```

Expected: all three exit 0. After this commit, the only remaining `@mui/*` imports are in `src/fixtures/events-2023.tsx` and `src/fixtures/events-2024.tsx` (the Alert blocks) and in the orphaned `src/components/Theme/` directory. Confirm with:

```bash
grep -rn "@mui\|@emotion" src --include="*.tsx" --include="*.ts" | grep -v "/Theme/"
```

The output should only list the two fixture files.

- [ ] **Step 3.7: Commit**

```bash
git add src/app/page.tsx src/app/globals.css src/components/EventList
git commit -m "Migrated EventList family to shadcn"
```

---

## Task 4: Migrate fixture Alerts to shadcn

**Files:**
- Modify: `src/fixtures/events-2024.tsx` (1 inline `<Alert>`)
- Modify: `src/fixtures/events-2023.tsx` (5 inline `<Alert>`)

All fixture alerts use `severity="warning"`. The migration is mechanical.

### Steps

- [ ] **Step 4.1: Migrate `events-2024.tsx`**

In `src/fixtures/events-2024.tsx`:

Replace the import line:

```tsx
import { Alert } from '@mui/material';
```

with:

```tsx
import { Alert, AlertDescription } from 'components/ui/alert';
```

Find the inline `<Alert severity="warning">...</Alert>` block (around line 898) and replace `severity="warning"` with `variant="warning"`. Wrap the inner content in `<AlertDescription>...</AlertDescription>` (this matches the WeatherAlert pattern).

Add a `className="my-2 max-w-[450px] mx-auto"` to the `<Alert>` to replicate the styling the deleted Emotion `descriptionTypographyDiv` block used to provide for in-description alerts.

Example transformation:

```tsx
// BEFORE
<Alert
  severity="warning"
  // ... other props
>
  <p>Some content</p>
</Alert>

// AFTER
<Alert
  variant="warning"
  className="my-2 max-w-[450px] mx-auto"
>
  <AlertDescription>
    <p>Some content</p>
  </AlertDescription>
</Alert>
```

If the original `<Alert>` had a `className` prop already, merge it with the new one.

- [ ] **Step 4.2: Migrate `events-2023.tsx`**

Repeat Step 4.1 for `src/fixtures/events-2023.tsx`. There are 5 `<Alert severity="warning">` blocks at approximately lines 549, 628, 842, 1188, 1982. Same transformation each time:

- Replace import
- `severity="warning"` → `variant="warning"`
- Wrap inner content in `<AlertDescription>`
- Add `className="my-2 max-w-[450px] mx-auto"`

- [ ] **Step 4.3: Verify the gates**

```bash
pnpm tsc:ci && pnpm lint && pnpm build
```

Expected: all three exit 0.

```bash
grep -rn "@mui\|@emotion" src --include="*.tsx" --include="*.ts" | grep -v "/Theme/"
```

Expected: **no matches**. All MUI/Emotion imports outside the orphaned `Theme/` directory are gone.

- [ ] **Step 4.4: Commit**

```bash
git add src/fixtures
git commit -m "Migrated fixture Alerts to shadcn"
```

---

## Task 5: Remove MUI, Emotion, and the theme registry

**Files:**
- Delete: `src/components/Theme/` (entire directory: `ThemeRegistry/ThemeRegistry.tsx`, `ThemeRegistry/theme.ts`, `ThemeRegistry/EmotionCache.tsx`)
- Modify: `package.json` (remove `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`, `@emotion/css`, `@emotion/cache`)
- Modify: `next.config.js` (remove the `modularizeImports` entry)
- Modify: `CLAUDE.md` (rewrite the "Styling stack — three things at once" section and the MUI-specific guidance)

### Steps

- [ ] **Step 5.1: Delete `src/components/Theme/`**

```bash
git rm -r src/components/Theme
```

Expected: removes 3 files (`ThemeRegistry.tsx`, `theme.ts`, `EmotionCache.tsx`) and their parent directories.

- [ ] **Step 5.2: Uninstall MUI and Emotion packages**

```bash
pnpm remove @mui/material @mui/icons-material @emotion/react @emotion/styled @emotion/css @emotion/cache
```

Expected: removes six entries from `dependencies` in `package.json`, updates `pnpm-lock.yaml`.

- [ ] **Step 5.3: Remove the `modularizeImports` entry from `next.config.js`**

Open `next.config.js` and replace the body so it reads:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = nextConfig;
```

(Drop the `modularizeImports: { '@mui/icons-material': { ... } }` block — there are no `@mui/icons-material` imports left to optimize.)

- [ ] **Step 5.4: Update `CLAUDE.md`**

Open `CLAUDE.md`. Find the section starting with `### Styling stack — three things at once` and replace it with:

```markdown
### Styling stack

- **Tailwind CSS v4** for layout/spacing/typography utilities. CSS-first config in `src/app/globals.css` inside `@theme { ... }` blocks. Source files are auto-detected. PostCSS pipeline uses `@tailwindcss/postcss`.
- **shadcn/ui (`new-york` style, `neutral` base)** for components. All components live under `src/components/ui/` as plain `.tsx` files we own — edit them freely. The full registry was installed up-front (~46 components); only a handful are wired into the page (`alert`, `button`, `collapsible`, `dropdown-menu`, `separator`). The rest are ready for future use.
- **Theme tokens** are defined as CSS variables (`--background`, `--foreground`, `--primary`, `--muted-foreground`, etc.) in `src/app/globals.css`. Light/dark are scoped via a `.dark` class on `<html>`. Use `text-muted-foreground`, `bg-card`, `border-border` etc. in component code — do NOT reach for raw color names like `text-zinc-700`.
- **Dark mode** is toggled by `next-themes` (`attribute="class"`, `defaultTheme="system"`). The toggle dropdown lives in `src/components/ThemeToggle.tsx` and is mounted in the header.
- **Icons** are `lucide-react`.
- **Custom one-offs** that don't fit a utility (e.g. the in-description `<ul>` / `<p>` defaults) live as a `@layer components` block in `globals.css`, scoped via the `.event-description` class.
```

Find the section starting with `## ESLint — non-obvious rules you'll trip over`. Add a bullet at the end of the rule list:

```markdown
- **shadcn-generated code is exempt from several strict rules.** `eslint.config.mjs` relaxes `explicit-function-return-type`, `no-unsafe-*`, `strict-boolean-expressions`, and a few React rules for files under `src/components/ui/` and `src/lib/`. Don't try to "fix" the relaxations — the generated code is meant to be edited as-is and re-relaxed if needed.
```

Then sweep the rest of `CLAUDE.md` for stale references. Specifically:

1. Search for `MUI`, `Material UI`, `@mui`, `Emotion`, `@emotion`, `ThemeRegistry`, `EmotionCache`, `slotProps`, `Pigment` (case-insensitive grep). For each hit:
   - In the "Styling stack" section: already rewritten above — confirm no leftovers.
   - In "Notable code changes" / migration notes: leave as historical record (these describe what the upgrade commits did).
   - In "ESLint" / "Environment variables" / other sections: rewrite or delete the sentence.
2. The "Component conventions" section mentions `import type` and the file banner format — keep, those still apply.
3. The path-aliases section still applies — but add a one-line note that shadcn-generated code uses the `@/` alias variant (e.g. `@/components/ui/button`), while project code uses the bare `fixtures/...` / `components/...` style. Both resolve to `./src/*` per `tsconfig.json`.

- [ ] **Step 5.5: Verify the gates**

```bash
pnpm tsc:ci && pnpm lint && pnpm build
```

Expected: all three exit 0.

Hard verification — there must be **no remaining MUI/Emotion references** anywhere in `src/`:

```bash
grep -rn "@mui\|@emotion\|MuiAlert\|MuiLink\|Typography\|createTheme\|ThemeRegistry\|CssBaseline" src
```

Expected: no matches. If `Typography` shows up in any file as JSX, fix it. If `@mui` or `@emotion` shows up in any file, fix it. Then re-run the gates.

Also verify the dependencies are clean:

```bash
grep -E "@mui|@emotion" package.json
```

Expected: no matches.

- [ ] **Step 5.6: Smoke-test in the dev server**

```bash
pnpm dev
```

Open `http://localhost:3000` (or whatever port the dev server picks). Verify visually:

- [ ] Page renders (no blank screen, no console errors in the browser dev tools).
- [ ] All category sections appear in order (`Centre ville` first, `Autres` last if present).
- [ ] An event with a description has a chevron-down icon; clicking it expands the description and the icon flips to chevron-up.
- [ ] An event whose description contains an embedded Alert (cancellation notice) renders the new shadcn Alert with the amber/emerald variant, not the old MUI blue/red.
- [ ] The theme toggle in the header (sun/moon icon) opens a dropdown with Clair / Sombre / Système. Each option switches the page colors. The `<html>` element should gain `class="dark"` when Sombre is picked.
- [ ] The Google Map loads at the bottom and shows markers (if you have `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` set).
- [ ] No `[ERROR]` or `[WARN]` lines in the dev server log other than the geocoding ones that already existed before the migration.

Stop the dev server.

- [ ] **Step 5.7: Commit**

```bash
git add CLAUDE.md next.config.js package.json pnpm-lock.yaml
git commit -m "Removed MUI, Emotion, and theme registry"
```

`git status` after should show a clean working tree (apart from the pre-existing uncommitted `src/types/Event.ts` from the user's `EventEmbedLink` WIP, which is intentionally not touched).

---

## End of plan

After all five commits land on `feature/remove-mui`, leave the branch unpushed. The user makes the call on merging to `main` and pushing.

Total expected commits: **5** (one per task). Total expected file deletions: **3** (the `Theme/` directory). Total expected new files: **~50** (~46 shadcn components + `lib/utils.ts` + `components.json` + `ThemeToggle.tsx`).
