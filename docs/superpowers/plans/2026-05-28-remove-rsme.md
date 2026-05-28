# Remove `react-social-media-embed` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drop the `react-social-media-embed` dependency and replace it with hand-written Instagram + Facebook embed components, while restructuring how events store and render their embeds (move from JSX-in-`description` to a structured `embedLinks` field rendered by a new `<EventRender />`).

**Architecture:**
1. New `src/components/embeds/` module owns the Instagram/Facebook rendering, with a shared script loader hook (`useSocialEmbedScript`), a viewport-detection hook (`useInViewport`), a per-instance consent placeholder, and one CSS file for fluid sizing. The hooks live in `src/hooks/` per project convention (next to the existing `use-mobile.ts`), not under `src/components/embeds/`.
2. `Event` gains a structured `embedLinks: EventEmbedLink[]` field. `description` becomes pure text/JSX (Alerts still allowed, but no embed components inside it).
3. A new `<EventRender />` composes description + embedLinks + external links, replacing `<EventListItemDetails />`. A new `<EventTitleBlock />` extracts the title block from `<EventListItem />`. `<EventListItem />` becomes a thin shell (`<li>` + `<Collapsible>` + `<EventTitleBlock />` + `<EventTime />` + chevron + `<CollapsibleContent>` wrapping `<EventRender />`).
4. `<CustomEmbed />` becomes a thin dispatcher (5-line component) that delegates to the new `<InstagramEmbed />` / `<FacebookEmbed />` based on its `type` prop.

**Tech Stack:** Next.js 16 App Router · React 19 · TypeScript 6 · Tailwind v4 · shadcn/ui · ESLint 9 flat config · pnpm 11 · Node 24

**Spec:** see the in-conversation spec posted by the user. Key project-specific adaptations:

- **No CMP in this project.** Consent hook (`useSocialEmbedConsent`) is implemented as a stub returning `true` (env-var-flippable). Per-instance click-to-load placeholder still applies as a soft gate. The spec's "Path A with CMP" lands as "Path A always-enabled" until a CMP is added.
- **No test infrastructure** (no Vitest/Jest/Playwright/Storybook). The spec's acceptance items for unit tests, Storybook stories, and Playwright smoke tests are explicitly skipped. Verification is `pnpm tsc:ci && pnpm lint && pnpm build` + manual smoke in `pnpm dev`. Future test infra is a separate plan.
- **Lighthouse acceptance criteria** (script-not-loaded-before-scroll, CLS ≤ 0.1) become best-effort design goals enforced by code structure, not measured. We rely on the lazy-load architecture being correct.

**Branch:** `feature/remove-rsme` (created in Task 0).

**Verification model:** No tests exist. Every commit is gated by:

```bash
pnpm tsc:ci  # type check
pnpm lint    # ESLint flat config
pnpm build   # Next.js production build
```

All three must exit 0 before commit. End-of-branch verification is `pnpm dev` + browser smoke.

**Pre-flight requirement:** All commits in this branch are GPG-signed (key `5E7B2C12A3A2E4BB7F071479A95BCD5E4D400E66`). Confirm the cache is warm with:

```bash
echo test | gpg --status-fd=2 -bsau 5E7B2C12A3A2E4BB7F071479A95BCD5E4D400E66 > /dev/null 2>&1 && echo "warm" || echo "cold"
```

If cold, ask the user to run `echo test | gpg --clearsign --local-user 5E7B2C12A3A2E4BB7F071479A95BCD5E4D400E66 > /dev/null` in a regular terminal. **DO NOT use `--no-gpg-sign`** without explicit authorization.

---

## Task 0: Set up the feature branch from a clean state

**Files:**
- None modified.

The user has 3 uncommitted/untracked items on `main` that are exploratory stepping-stones for this work:

- `src/types/Event.ts` (modified — adds `EventEmbedLink` + `embedLinks` field)
- `src/components/CustomEmbed/CustomEmbed.tsx` (modified — switched to a `type`-prop API but still imports from `react-social-media-embed`)
- `src/hooks/useSocialEmbedScript.ts` (untracked — early version of the script-loader hook)

Per the user's direction, we DON'T literally preserve these files; we re-implement their content cleanly inside the relevant tasks. Stash them so they're out of the way but recoverable.

### Steps

- [ ] **Step 0.1: Confirm we're on main and have the expected WIP**

```bash
git -C /home/clovel/repository/perso/prog-fdlm status --short
git -C /home/clovel/repository/perso/prog-fdlm branch --show-current
```

Expected output:
```
 M src/components/CustomEmbed/CustomEmbed.tsx
 M src/types/Event.ts
?? src/hooks/useSocialEmbedScript.ts
```
on branch `main`.

If `git status` shows additional unexpected files, stop and report to the user.

- [ ] **Step 0.2: Stash the WIP (including the untracked hook file)**

```bash
git -C /home/clovel/repository/perso/prog-fdlm stash push -u -m "pre-rsme-removal: CustomEmbed + Event + useSocialEmbedScript WIP" -- \
  src/components/CustomEmbed/CustomEmbed.tsx \
  src/types/Event.ts \
  src/hooks/useSocialEmbedScript.ts
```

Expected: `Saved working directory and index state On main: pre-rsme-removal: ...`.

`git status` after should be clean.

- [ ] **Step 0.3: Verify `main` is buildable in its committed state**

Now that the WIP is stashed, `main`'s tip should be the post-MUI-removal commit and should build cleanly.

```bash
pnpm tsc:ci && pnpm lint && pnpm build
```

All three exit 0. If any fail, the working state has another problem unrelated to this plan — stop and report.

- [ ] **Step 0.4: Create the feature branch**

```bash
git -C /home/clovel/repository/perso/prog-fdlm checkout -b feature/remove-rsme
```

Expected: `Switched to a new branch 'feature/remove-rsme'`.

No commit yet — the next tasks land commits on this branch.

---

## Task 1: Scaffold the embed module + hooks + type changes

**Files:**
- Create: `src/components/embeds/InstagramEmbed.tsx`
- Create: `src/components/embeds/FacebookEmbed.tsx`
- Create: `src/components/embeds/EmbedPlaceholder.tsx`
- Create: `src/components/embeds/embeds.css`
- Create: `src/components/embeds/index.ts`
- Create: `src/hooks/useSocialEmbedScript.ts` (re-implementing the user's WIP polished to project conventions)
- Create: `src/hooks/useInViewport.ts`
- Create: `src/hooks/useSocialEmbedConsent.ts` (stub, env-var-flippable)
- Create: `src/types/global.d.ts` (window.instgrm + window.FB type declarations)
- Modify: `src/types/Event.ts` (add `EventEmbedLinkType` and `EventEmbedLink` types + `embedLinks?: EventEmbedLink[]` field to `Event`)
- Modify: `src/app/globals.css` (import `embeds.css`)

After Task 1, the new module exists end-to-end but is NOT used anywhere yet. Build stays green because nothing references the new components.

### Steps

- [ ] **Step 1.1: Create the `src/types/global.d.ts` ambient type file**

```ts
/* Module imports -------------------------------------- */

/* Type imports ---------------------------------------- */

/* Window globals injected by Meta scripts ------------- */
declare global {
  interface Window {
    instgrm?: {
      Embeds: {
        process: () => void;
      };
    };
    FB?: {
      XFBML: {
        parse: (element?: HTMLElement) => void;
      };
    };
  }
}

export {};
```

The trailing `export {}` makes this a module file (so the `declare global` block is honored). Without it, TypeScript would treat the file as a script and ignore the augmentation.

- [ ] **Step 1.2: Extend `src/types/Event.ts` with `EventEmbedLink`**

Add at the appropriate place in the file (after the existing `EventLink` interface):

```ts
/* Event embed link declaration ------------------------ */
export type EventEmbedLinkType = 'instagram' | 'facebook';

export interface EventEmbedLink {
  type: EventEmbedLinkType;
  url: string;
}
```

And inside the `Event` interface, add a new optional field after `links`:

```ts
  embedLinks?: EventEmbedLink[];
```

Don't change anything else in this file.

- [ ] **Step 1.3: Create `src/hooks/useSocialEmbedConsent.ts`**

```ts
/* Framework imports ----------------------------------- */

/* Module imports -------------------------------------- */

/* Component imports ----------------------------------- */

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */

/* Hooks ----------------------------------------------- */
/**
 * Returns whether the user has consented to loading third-party social media
 * scripts (Instagram, Facebook).
 *
 * This project has no CMP yet. The hook currently always returns `true` unless
 * `NEXT_PUBLIC_DISABLE_SOCIAL_EMBEDS` is set to `'true'`, which provides an
 * env-var kill-switch for testing. When a CMP is added, swap this for the real
 * adapter.
 */
export function useSocialEmbedConsent(): boolean {
  return process.env.NEXT_PUBLIC_DISABLE_SOCIAL_EMBEDS !== 'true';
}
```

- [ ] **Step 1.4: Create `src/hooks/useInViewport.ts`**

```ts
/* Framework imports ----------------------------------- */
import {
  useEffect,
  useState,
} from 'react';

/* Module imports -------------------------------------- */

/* Component imports ----------------------------------- */

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */
import type { RefObject } from 'react';

/* useInViewport hook ---------------------------------- */
interface UseInViewportOptions {
  rootMargin?: string;
  threshold?: number;
}

/**
 * Returns `true` once the observed element has entered (or pre-entered, via
 * rootMargin) the viewport. Once `true`, stays `true` — the hook is designed
 * for one-shot lazy loading, not visibility tracking.
 *
 * Falls back to eager-load (`true` on mount) when `IntersectionObserver` is
 * unavailable.
 */
export function useInViewport(
  ref: RefObject<Element | null>,
  options: UseInViewportOptions = {},
): boolean {
  const [ inViewport, setInViewport ] = useState<boolean>(false);

  useEffect(
    () => {
      const element = ref.current;
      if(element === null) {
        return;
      }

      if(typeof IntersectionObserver === 'undefined') {
        setInViewport(true);
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          for(const entry of entries) {
            if(entry.isIntersecting) {
              setInViewport(true);
              observer.disconnect();
              break;
            }
          }
        },
        {
          rootMargin: options.rootMargin ?? '200px',
          threshold: options.threshold ?? 0,
        },
      );

      observer.observe(element);

      return () => {
        observer.disconnect();
      };
    },
    [
      ref,
      options.rootMargin,
      options.threshold,
    ],
  );

  return inViewport;
}
```

- [ ] **Step 1.5: Create `src/hooks/useSocialEmbedScript.ts`**

```ts
/* Framework imports ----------------------------------- */
import { useEffect } from 'react';

/* Module imports -------------------------------------- */

/* Component imports ----------------------------------- */

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */

/* Constants ------------------------------------------- */
const SCRIPTS = {
  instagram: {
    id: 'ig-embed',
    src: 'https://www.instagram.com/embed.js',
  },
  facebook: {
    id: 'fb-jssdk',
    src: 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v19.0',
  },
} as const;

export type SocialEmbedPlatform = keyof typeof SCRIPTS;

/* Hooks ----------------------------------------------- */
/**
 * Loads the social-media embed script for the given platform once per page
 * and re-runs the platform's parser when a new embed is mounted.
 *
 * The script tag is injected the first time `enabled === true`. Subsequent
 * mounts on the same page only trigger a re-parse, not another script load.
 *
 * The hook re-runs the parser whenever `enabled` flips to `true` so that
 * lazy-loaded embeds get hydrated on demand.
 */
export function useSocialEmbedScript(
  platform: SocialEmbedPlatform,
  enabled: boolean,
): void {
  useEffect(
    () => {
      if(!enabled) {
        return;
      }

      const { id, src } = SCRIPTS[platform];
      const existing = document.getElementById(id);

      if(existing === null) {
        const script = document.createElement('script');
        script.id = id;
        script.src = src;
        script.async = true;
        script.crossOrigin = 'anonymous';
        document.body.appendChild(script);
        return;
      }

      // Script is already loaded — re-parse for the newly-mounted node.
      if(platform === 'instagram') {
        window.instgrm?.Embeds.process();
      } else {
        window.FB?.XFBML.parse();
      }
    },
    [
      platform,
      enabled,
    ],
  );
}
```

- [ ] **Step 1.6: Create `src/components/embeds/EmbedPlaceholder.tsx`**

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports -------------------------------------- */

/* Component imports ----------------------------------- */
import { Button } from '@/components/ui/button';

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */
import type { SocialEmbedPlatform } from 'hooks/useSocialEmbedScript';

/* EmbedPlaceholder component prop types --------------- */
interface EmbedPlaceholderProps {
  platform: SocialEmbedPlatform;
  aspectRatio: string;
  consented: boolean;
  onConsent: () => void;
}

const LABELS: Record<SocialEmbedPlatform, string> = {
  instagram: 'Charger la publication Instagram',
  facebook: 'Charger la publication Facebook',
};

/* EmbedPlaceholder component -------------------------- */
const EmbedPlaceholder: React.FC<EmbedPlaceholderProps> = (
  {
    platform,
    aspectRatio,
    consented,
    onConsent,
  },
) => {
  return (
    <div
      className="w-full flex items-center justify-center bg-muted/40 border border-border rounded-md"
      style={{ aspectRatio }}
    >
      {
        consented ?
          <span className="text-sm text-muted-foreground">
            Chargement…
          </span> :
          <Button
            variant="outline"
            size="sm"
            onClick={onConsent}
          >
            {LABELS[platform]}
          </Button>
      }
    </div>
  );
};

/* Export EmbedPlaceholder component ------------------- */
export default EmbedPlaceholder;
```

- [ ] **Step 1.7: Create `src/components/embeds/embeds.css`**

```css
/* Fluid sizing for Meta's embed iframes -------------- */

/* Instagram ---------------------------------------- */
.instagram-media,
.instagram-media iframe {
  max-width: 100% !important;
  min-width: 0 !important;
  width: 100% !important;
}

/* Facebook ----------------------------------------- */
.fb-post,
.fb-post > span,
.fb-post iframe,
.fb-video,
.fb-video > span,
.fb-video iframe {
  max-width: 100% !important;
  min-width: 0 !important;
  width: 100% !important;
}
```

- [ ] **Step 1.8: Create `src/components/embeds/InstagramEmbed.tsx`**

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React, {
  useRef,
  useState,
} from 'react';

/* Module imports -------------------------------------- */
import { useInViewport } from 'hooks/useInViewport';
import { useSocialEmbedConsent } from 'hooks/useSocialEmbedConsent';
import { useSocialEmbedScript } from 'hooks/useSocialEmbedScript';

/* Component imports ----------------------------------- */
import EmbedPlaceholder from './EmbedPlaceholder';

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */

/* InstagramEmbed component prop types ----------------- */
interface InstagramEmbedProps {
  url: string;
  maxWidth?: number;
  className?: string;
}

const DEFAULT_MAX_WIDTH = 540;
const ASPECT_RATIO = '4/5';

/* InstagramEmbed component ---------------------------- */
const InstagramEmbed: React.FC<InstagramEmbedProps> = (
  {
    url,
    maxWidth = DEFAULT_MAX_WIDTH,
    className,
  },
) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inViewport = useInViewport(containerRef);
  const globalConsent = useSocialEmbedConsent();
  const [ localConsent, setLocalConsent ] = useState<boolean>(false);

  const consented = globalConsent || localConsent;
  const shouldLoad = consented && inViewport;

  useSocialEmbedScript('instagram', shouldLoad);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        maxWidth: maxWidth,
        marginLeft: 'auto',
        marginRight: 'auto',
        width: '100%',
      }}
    >
      {
        shouldLoad ?
          <blockquote
            className="instagram-media"
            data-instgrm-permalink={url}
            data-instgrm-version="14"
            style={{ margin: 0 }}
          /> :
          <EmbedPlaceholder
            platform="instagram"
            aspectRatio={ASPECT_RATIO}
            consented={consented}
            onConsent={(): void => setLocalConsent(true)}
          />
      }
    </div>
  );
};

/* Export InstagramEmbed component --------------------- */
export default InstagramEmbed;
```

- [ ] **Step 1.9: Create `src/components/embeds/FacebookEmbed.tsx`**

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React, {
  useRef,
  useState,
} from 'react';

/* Module imports -------------------------------------- */
import { useInViewport } from 'hooks/useInViewport';
import { useSocialEmbedConsent } from 'hooks/useSocialEmbedConsent';
import { useSocialEmbedScript } from 'hooks/useSocialEmbedScript';

/* Component imports ----------------------------------- */
import EmbedPlaceholder from './EmbedPlaceholder';

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */

/* FacebookEmbed component prop types ------------------ */
interface FacebookEmbedProps {
  url: string;
  type?: 'post' | 'video';
  maxWidth?: number;
  showText?: boolean;
  className?: string;
}

const DEFAULT_MAX_WIDTH = 750;
const POST_ASPECT_RATIO = '1.91/1';
const VIDEO_ASPECT_RATIO = '16/9';

/* FacebookEmbed component ----------------------------- */
const FacebookEmbed: React.FC<FacebookEmbedProps> = (
  {
    url,
    type = 'post',
    maxWidth = DEFAULT_MAX_WIDTH,
    showText = true,
    className,
  },
) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inViewport = useInViewport(containerRef);
  const globalConsent = useSocialEmbedConsent();
  const [ localConsent, setLocalConsent ] = useState<boolean>(false);

  const consented = globalConsent || localConsent;
  const shouldLoad = consented && inViewport;

  useSocialEmbedScript('facebook', shouldLoad);

  const blockClass = type === 'video' ? 'fb-video' : 'fb-post';
  const aspectRatio = type === 'video' ? VIDEO_ASPECT_RATIO : POST_ASPECT_RATIO;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        maxWidth: maxWidth,
        marginLeft: 'auto',
        marginRight: 'auto',
        width: '100%',
      }}
    >
      {
        shouldLoad ?
          <div
            className={blockClass}
            data-href={url}
            data-show-text={showText ? 'true' : 'false'}
            data-width="auto"
          /> :
          <EmbedPlaceholder
            platform="facebook"
            aspectRatio={aspectRatio}
            consented={consented}
            onConsent={(): void => setLocalConsent(true)}
          />
      }
    </div>
  );
};

/* Export FacebookEmbed component ---------------------- */
export default FacebookEmbed;
```

- [ ] **Step 1.10: Create `src/components/embeds/index.ts`**

```ts
/* Re-exports ------------------------------------------ */
export { default as InstagramEmbed } from './InstagramEmbed';
export { default as FacebookEmbed } from './FacebookEmbed';
```

- [ ] **Step 1.11: Wire `embeds.css` into globals**

Append to the end of `src/app/globals.css`:

```css
@import "../components/embeds/embeds.css";
```

This is a Tailwind v4 `@import` and resolves relative to the file. Tailwind/PostCSS processes it as a plain CSS bundle.

If the import path doesn't resolve (Tailwind v4's `@import` is picky about paths), fall back to importing the CSS file in `src/components/embeds/index.ts` instead:

```ts
import './embeds.css';
```

Either location works; pick whichever the build accepts.

- [ ] **Step 1.12: Verify the gates**

```bash
pnpm tsc:ci && pnpm lint && pnpm build
```

All three exit 0.

- [ ] **Step 1.13: Commit**

```bash
git add \
  src/components/embeds \
  src/hooks/useInViewport.ts \
  src/hooks/useSocialEmbedScript.ts \
  src/hooks/useSocialEmbedConsent.ts \
  src/types/global.d.ts \
  src/types/Event.ts \
  src/app/globals.css
git commit -m "Added embed components, hooks, and EventEmbedLink type"
```

Confirm signed.

---

## Task 2: Build `<EventTitleBlock />`, `<EventRender />`, refactor `<EventListItem />`

**Files:**
- Create: `src/components/EventTitleBlock/EventTitleBlock.tsx`
- Create: `src/components/EventRender/EventRender.tsx`
- Modify: `src/components/EventList/EventListItem.tsx`
- Delete: `src/components/EventList/EventListItemDetails.tsx`

After Task 2, the page renders identically to before (because no event currently has any `embedLinks`), but the component tree is restructured.

### Steps

- [ ] **Step 2.1: Create `src/components/EventTitleBlock/EventTitleBlock.tsx`**

This component absorbs the title block currently inlined in `EventListItem.tsx` (the name + status badge + location + genres + artists + price). It does NOT include the `EventTime` or the chevron — those stay in `EventListItem`.

```tsx
/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports -------------------------------------- */
import { formatPrice } from 'helpers/formatPrice';

/* Component imports ----------------------------------- */

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';

/* EventTitleBlock component prop types ---------------- */
interface EventTitleBlockProps {
  event: Event;
}

/* EventTitleBlock component --------------------------- */
const EventTitleBlock: React.FC<EventTitleBlockProps> = ({ event }) => {
  return (
    <>
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
            <span className="text-orange-600 dark:text-orange-400">
              Reprogrammé
            </span>
        }
        {
          event.status === 'canceled' &&
            <span className="text-red-600 dark:text-red-400">
              Annulé
            </span>
        }
        {
          event.status === 'postponed' &&
            <span className="text-purple-600 dark:text-purple-400">
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
    </>
  );
};

/* Export EventTitleBlock component -------------------- */
export default EventTitleBlock;
```

- [ ] **Step 2.2: Create `src/components/EventRender/EventRender.tsx`**

This is the new "expand body" of an event. It replaces what `EventListItemDetails` did, but with one structural change: embeds render below the description, sourced from `event.embedLinks` (not from JSX inlined in `description`).

```tsx
/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports -------------------------------------- */

/* Component imports ----------------------------------- */
import {
  InstagramEmbed,
  FacebookEmbed,
} from 'components/embeds';

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */
import type {
  Event,
  EventEmbedLink,
} from 'types/Event';

/* EventRender component prop types -------------------- */
interface EventRenderProps {
  event: Event;
}

/* Helpers --------------------------------------------- */
const renderEmbed = (link: EventEmbedLink, index: number): React.ReactNode => {
  if(link.type === 'instagram') {
    return (
      <InstagramEmbed
        key={`${link.url}-${index}`}
        url={link.url}
        className="my-4"
      />
    );
  }
  if(link.type === 'facebook') {
    return (
      <FacebookEmbed
        key={`${link.url}-${index}`}
        url={link.url}
        className="my-4"
      />
    );
  }
  return null;
};

/* EventRender component ------------------------------- */
const EventRender: React.FC<EventRenderProps> = ({ event }) => {
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
        event.embedLinks !== undefined &&
        event.embedLinks.length > 0 &&
          <article className="flex flex-col w-full mt-4">
            {event.embedLinks.map(renderEmbed)}
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

/* Export EventRender component ------------------------ */
export default EventRender;
```

- [ ] **Step 2.3: Refactor `src/components/EventList/EventListItem.tsx`**

Replace the entire body of the file with:

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React, {
  useMemo,
  useState,
} from 'react';

/* Module imports -------------------------------------- */

/* Component imports ----------------------------------- */
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import EventTime from './EventTime';
import EventTitleBlock from 'components/EventTitleBlock/EventTitleBlock';
import EventRender from 'components/EventRender/EventRender';

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';

/* EventListItem component prop types ------------------ */
interface EventListItemProps {
  event: Event;
}

/* EventListItem component ----------------------------- */
const EventListItem: React.FC<EventListItemProps> = ({ event }) => {
  const [ open, setOpen ] = useState<boolean>(false);

  const collapsiblePresent: boolean = useMemo<boolean>(
    () => {
      return (
        event.description !== undefined ||
        (event.embedLinks !== undefined && event.embedLinks.length > 0) ||
        (event.links !== undefined && event.links.length > 0)
      );
    },
    [
      event.description,
      event.embedLinks,
      event.links,
    ],
  );

  const titleBlock = <EventTitleBlock event={event} />;

  return (
    <li className="py-2">
      <Collapsible
        open={open}
        onOpenChange={setOpen}
      >
        <div className="flex items-start justify-between gap-2 px-4">
          {
            collapsiblePresent ?
              <CollapsibleTrigger asChild>
                <div className="flex-1 min-w-0 cursor-pointer rounded-md hover:bg-accent -mx-2 px-2 py-1">
                  {titleBlock}
                </div>
              </CollapsibleTrigger> :
              <div className="flex-1 min-w-0">
                {titleBlock}
              </div>
          }
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
              <EventRender event={event} />
            </CollapsibleContent>
        }
      </Collapsible>
    </li>
  );
};

/* Export EventListItem component ---------------------- */
export default EventListItem;
```

Two semantic changes vs the previous version:
1. `collapsiblePresent` is now true if any of `description`, `embedLinks`, or `links` is non-empty (was: only `description`).
2. The body is `<EventRender />` instead of the deleted `<EventListItemDetails />`.

- [ ] **Step 2.4: Delete `src/components/EventList/EventListItemDetails.tsx`**

```bash
git rm /home/clovel/repository/perso/prog-fdlm/src/components/EventList/EventListItemDetails.tsx
```

- [ ] **Step 2.5: Verify the gates**

```bash
pnpm tsc:ci && pnpm lint && pnpm build
```

All three exit 0.

Note: the page renders identically to before this task — fixtures don't yet use `embedLinks`, so `<EventRender />` only renders the `description` + `links` paths, which match the previous behavior. Embeds inside fixture descriptions (the `<InstagramEmbed>` and `<FacebookEmbed>` JSX) still render via the OLD `react-social-media-embed` package until Task 3.

- [ ] **Step 2.6: Commit**

```bash
git add \
  src/components/EventTitleBlock \
  src/components/EventRender \
  src/components/EventList/EventListItem.tsx \
  src/components/EventList/EventListItemDetails.tsx
git commit -m "Extracted EventTitleBlock and EventRender from EventListItem"
```

Confirm signed.

---

## Task 3: Update `<CustomEmbed />` dispatcher, migrate fixtures, update `page.tsx`

**Files:**
- Modify: `src/components/CustomEmbed/CustomEmbed.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/fixtures/events-2024.tsx`
- Modify: `src/fixtures/events-2023.tsx`

This is the migration task. After it, no project code imports from `react-social-media-embed` anymore — only the dependency entry in `package.json` and `pnpm-lock.yaml` remains for Task 4 to remove.

### Steps

- [ ] **Step 3.1: Rewrite `src/components/CustomEmbed/CustomEmbed.tsx` as a thin dispatcher**

The current file imports from `react-social-media-embed` and uses the user's `type`-prop API. Replace it with a thin dispatcher pointing at the new components:

```tsx
/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports -------------------------------------- */

/* Component imports ----------------------------------- */
import {
  InstagramEmbed,
  FacebookEmbed,
} from 'components/embeds';

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */
import type { EventEmbedLinkType } from 'types/Event';

/* CustomEmbed component prop types -------------------- */
interface CustomEmbedProps {
  url: string;
  type: EventEmbedLinkType;
  maxWidth?: number;
}

/* CustomEmbed component ------------------------------- */
const CustomEmbed: React.FC<CustomEmbedProps> = (
  {
    url,
    type,
    maxWidth,
  },
) => {
  if(type === 'instagram') {
    return (
      <InstagramEmbed
        url={url}
        maxWidth={maxWidth}
      />
    );
  }
  if(type === 'facebook') {
    return (
      <FacebookEmbed
        url={url}
        maxWidth={maxWidth}
      />
    );
  }
  return null;
};

/* Export CustomEmbed component ------------------------ */
export default CustomEmbed;
```

The `EmbedComponent` prop and the `useMemo`/`switch` machinery from the user's WIP are removed — the dispatcher is now a simple if-chain.

- [ ] **Step 3.2: Update `src/app/page.tsx`**

The current `page.tsx` has two direct `<InstagramEmbed url="..." />` calls (around lines 58 and 72) importing from `react-social-media-embed`. Replace them.

Find:
```tsx
import { InstagramEmbed } from 'react-social-media-embed';
```

Replace with:
```tsx
import { InstagramEmbed } from 'components/embeds';
```

The JSX call sites (`<InstagramEmbed url="https://www.instagram.com/p/..." />`) remain unchanged — the new component accepts the same `url` prop.

- [ ] **Step 3.3: Migrate `src/fixtures/events-2024.tsx`**

This file currently contains `<InstagramEmbed>`, `<FacebookEmbed>`, and `<CustomEmbed>` JSX calls inside event `description` blocks. The migration extracts those into a new `embedLinks` array on each event.

The fixture has approximately 30+ embed call sites across events. Migrate them mechanically:

1. **Remove the import line** `import { InstagramEmbed, FacebookEmbed } from 'react-social-media-embed';` (if present — check the current state of the file).
   - `<CustomEmbed>` calls inside descriptions stay supported through the dispatcher in Step 3.1, so they don't need to be migrated yet — but you SHOULD migrate them to `embedLinks` for the architectural cleanup. See "Migration pattern" below.

2. **For each event** that has any embed JSX inside its `description`, do the following:
   - Identify each `<InstagramEmbed url="..." />`, `<FacebookEmbed url="..." />`, or `<CustomEmbed type="..." url="..." />` inside the description.
   - Remove them from the JSX of `description`.
   - Add an `embedLinks: [...]` field on the event object, listing each removed embed:
     ```ts
     embedLinks: [
       { type: 'instagram', url: 'https://www.instagram.com/p/...' },
       { type: 'facebook', url: 'https://www.facebook.com/...' },
     ],
     ```
   - If the `description` is now empty after removing the embed JSX (i.e. the description was JUST an embed), delete the `description` field entirely.

3. **Migration pattern example.** A fixture event that looks like this BEFORE:

   ```tsx
   {
     id: '...',
     // ...other fields...
     description: (
       <>
         <p>Some text about the event.</p>
         <InstagramEmbed url="https://www.instagram.com/p/ABC/" />
         <FacebookEmbed url="https://www.facebook.com/123" />
       </>
     ),
   },
   ```

   Becomes AFTER:

   ```tsx
   {
     id: '...',
     // ...other fields...
     description: (
       <>
         <p>Some text about the event.</p>
       </>
     ),
     embedLinks: [
       { type: 'instagram', url: 'https://www.instagram.com/p/ABC/' },
       { type: 'facebook', url: 'https://www.facebook.com/123' },
     ],
   },
   ```

   If the description had nothing besides embeds:

   ```tsx
   {
     id: '...',
     description: (
       <>
         <InstagramEmbed url="https://www.instagram.com/p/ABC/" />
       </>
     ),
   },
   ```

   becomes:

   ```tsx
   {
     id: '...',
     embedLinks: [
       { type: 'instagram', url: 'https://www.instagram.com/p/ABC/' },
     ],
   },
   ```

   (No `description` field at all.)

4. **`<Alert>` content stays inside `description`** — Alerts are not embeds. Don't remove them.

5. **After the migration:** confirm there are no remaining `InstagramEmbed`, `FacebookEmbed`, or `CustomEmbed` references in the file:
   ```bash
   grep -n "InstagramEmbed\|FacebookEmbed\|CustomEmbed" /home/clovel/repository/perso/prog-fdlm/src/fixtures/events-2024.tsx
   ```
   Expected: no matches.

- [ ] **Step 3.4: Migrate `src/fixtures/events-2023.tsx`**

Repeat Step 3.3 for `src/fixtures/events-2023.tsx`. Use the same pattern. The fixture has approximately 20+ embed call sites.

After migrating:
```bash
grep -n "InstagramEmbed\|FacebookEmbed\|CustomEmbed" /home/clovel/repository/perso/prog-fdlm/src/fixtures/events-2023.tsx
```
Expected: no matches.

- [ ] **Step 3.5: Confirm `react-social-media-embed` is no longer imported anywhere**

```bash
grep -rn "react-social-media-embed" /home/clovel/repository/perso/prog-fdlm/src
```

Expected: no matches.

If there are remaining references (e.g. a missed fixture), migrate them using the same pattern.

- [ ] **Step 3.6: Verify the gates**

```bash
pnpm tsc:ci && pnpm lint && pnpm build
```

All three exit 0.

- [ ] **Step 3.7: Commit**

```bash
git add \
  src/components/CustomEmbed/CustomEmbed.tsx \
  src/app/page.tsx \
  src/fixtures
git commit -m "Migrated fixtures to embedLinks and routed CustomEmbed through new embeds"
```

Confirm signed.

---

## Task 4: Remove `react-social-media-embed` from package.json and update CLAUDE.md

**Files:**
- Modify: `package.json` (remove `react-social-media-embed`)
- Modify: `pnpm-lock.yaml` (auto-updated)
- Modify: `CLAUDE.md` (document the new embed module)

### Steps

- [ ] **Step 4.1: Uninstall `react-social-media-embed`**

```bash
pnpm remove react-social-media-embed
```

Expected: removes the entry from `dependencies` in `package.json`, updates `pnpm-lock.yaml`.

- [ ] **Step 4.2: Verify nothing references it anymore**

```bash
grep -rn "react-social-media-embed" /home/clovel/repository/perso/prog-fdlm/src /home/clovel/repository/perso/prog-fdlm/package.json
```

Expected: no matches.

- [ ] **Step 4.3: Update CLAUDE.md to describe the new embed module**

Open `CLAUDE.md`. Add a new section under "Architecture" (after the "Styling stack" section), before the "Path aliases" section:

```markdown
### Social media embeds

Instagram and Facebook embeds are owned in-tree under `src/components/embeds/`:

- `InstagramEmbed` and `FacebookEmbed` are public exports from `src/components/embeds/index.ts`. Each component takes a `url` (and the Facebook one optionally a `type: 'post' | 'video'`); width is fluid up to a CSS-driven max.
- `<CustomEmbed type="instagram" | "facebook" url={...} />` is a thin dispatcher that picks the right one. Useful when the embed type is data-driven (e.g. `EventEmbedLink`).
- The Meta SDK scripts are loaded lazily, once per page, by `src/hooks/useSocialEmbedScript.ts` (gated on a viewport check from `src/hooks/useInViewport.ts` and a consent boolean from `src/hooks/useSocialEmbedConsent.ts`).
- Consent is currently stubbed: `useSocialEmbedConsent()` returns `true` unless `NEXT_PUBLIC_DISABLE_SOCIAL_EMBEDS=true` is set. Replace the stub when a CMP is introduced.
- Fluid iframe overrides live in `src/components/embeds/embeds.css`, imported once via `src/app/globals.css`.
```

Then update the "Event data model" section. Find the bullet that mentions `description` (currently: `description` and `EventLink.label` are typed as `React.ReactNode`, so fixtures freely embed JSX (`<p>`, `<FacebookEmbed>`, shadcn `<Alert>`, etc.)). Replace it with:

```markdown
- `description` is typed as `React.ReactNode` for free-form text/JSX. As of the rsme removal, `description` no longer contains `<InstagramEmbed>` / `<FacebookEmbed>` / `<CustomEmbed>` JSX — embeds are stored as structured data in `event.embedLinks: EventEmbedLink[]` and rendered by `<EventRender />`. Inline `<Alert>` JSX (e.g. cancellation notices) still belongs inside `description`.
- `embedLinks?: EventEmbedLink[]` — optional, an array of `{ type: 'instagram' | 'facebook'; url: string }`. Used by `<EventRender />` to render embeds below the description.
- `EventLink.label` is typed as `React.ReactNode` (for cases where the label needs richer JSX).
```

Sweep the rest of CLAUDE.md for stale references to `react-social-media-embed`, `InstagramEmbed` (as an import path from rsme), or `FacebookEmbed`. Update any descriptions that refer to "fixtures freely embed `<FacebookEmbed>` etc." to reflect the new shape.

- [ ] **Step 4.4: Verify the gates**

```bash
pnpm tsc:ci && pnpm lint && pnpm build
```

All three exit 0.

- [ ] **Step 4.5: Manual smoke test**

```bash
pnpm dev
```

Open `http://localhost:3000` (or the port the dev server prints) in a browser. Verify:

- Page renders, all category sections appear.
- Expand an event that has an `embedLinks` entry → the embed placeholder appears (with a "Charger la publication Instagram/Facebook" button if consent is denied, or the embed itself if consented).
- Scroll up/down — embeds below the fold don't load until they enter the viewport (check the Network tab for `embed.js` / `sdk.js` only loading on scroll).
- Set `NEXT_PUBLIC_DISABLE_SOCIAL_EMBEDS=true` in `.env.local`, restart `pnpm dev`. Expand an event with embeds — the placeholder shows a "Charger…" button instead of auto-loading. Click it; the script loads and the embed appears. Remove the env var when done testing.
- Theme toggle, Google Map, and the rest of the page still work.
- No console errors.

Stop the dev server.

- [ ] **Step 4.6: Commit**

```bash
git add \
  package.json \
  pnpm-lock.yaml \
  CLAUDE.md
git commit -m "Removed react-social-media-embed dependency"
```

Confirm signed.

---

## End of plan

After all four tasks land on `feature/remove-rsme`, leave the branch unpushed. Use the `superpowers:finishing-a-development-branch` skill to merge/keep/discard.

Optional follow-ups (NOT in this plan):

- Real CMP integration. The hook contract is `useSocialEmbedConsent(): boolean` — drop in your CMP's hook here.
- Test infrastructure (Vitest + RTL) for the three hooks and the embed components. Spec called for it but the project has no test framework yet — separate plan.
- Storybook for the embed components and `<EventRender />` variants. Same reason.
- Playwright smoke test against a deployed preview. Same reason.

Total expected commits: **4** (one per task). Total expected new files: **9** (5 in `src/components/embeds/`, 3 hooks, 1 global types) + **2 new component dirs** (`EventTitleBlock`, `EventRender`). Total expected deletions: **1** (`EventListItemDetails.tsx`) + **1 dependency** (`react-social-media-embed`).
