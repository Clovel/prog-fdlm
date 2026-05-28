# Migrate event descriptions from HTML/JSX to Markdown

**Status:** Approved, awaiting implementation plan
**Date:** 2026-05-28
**Author:** Clovis Durand (via Claude Code brainstorming session)

## Goal

Replace every fixture event's `description` field — currently a `React.ReactNode` made of `<p>`/`<a>`/`<b>`/`<i>`/`<ul><li>`/`<br>` JSX — with a raw Markdown string. Render via `react-markdown` + `remark-gfm` inside a new `<DescriptionRender />` component. End state: descriptions are plain strings, fixtures are pure data, presentational concerns live in `<DescriptionRender />` and the project's CSS.

## Non-goals

- **MDX.** Explicitly chosen against — descriptions never need React-component embedding because alerts, embeds, and external links are already structured fields (`event.alerts`, `event.embedLinks`, `event.links`). MDX would re-open the door we just closed.
- **Per-event `.md` files.** Descriptions stay inline in the TS fixture object. One event = one TS object. Splitting data across files goes against the established pattern.
- **Migrating `alerts[].content` to markdown.** That field is already a plain string and out of scope here; bold/links inside alert text is a separate follow-up.
- **A custom remark plugin for image width syntax** (`![alt](src){width=600}`). The renderer's default `<img>` styling (`max-w-full mx-auto`) covers every current image.
- **Adding a remark linter / preview script.** Visual diff in `pnpm dev` is the verification.

## End-state stack

**Added dependencies:**

- `react-markdown@^9` (~17 KB) — markdown → React renderer.
- `remark-gfm@^4` (~20 KB) — GFM extension (autolinks, strikethrough, tables, task lists, footnotes).

Both ship their own TypeScript types; no separate `@types/*` packages required.

**New files:**

- `src/components/DescriptionRender/DescriptionRender.tsx` — single-purpose wrapper around `<ReactMarkdown>` with project-specific component overrides for `<a>` and `<img>`.
- `scripts/html-to-markdown.ts` — one-off migration script (excluded from the Next.js build via `tsconfig.json`'s `exclude`).

**Modified files:**

- `src/types/Event.ts` — `description?: React.ReactNode` → `description?: string`.
- `src/components/EventRender/EventRender.tsx` — the existing description `<article>` block calls `<DescriptionRender markdown={event.description} />` instead of rendering `{event.description}` directly.
- `src/fixtures/events-2024.tsx` and `src/fixtures/events-2023.tsx` — every `description: (<>...</>)` JSX expression replaced with `description: \`...markdown...\``.
- `package.json` + `pnpm-lock.yaml` — new deps.

**Unchanged:**

- `src/app/globals.css`'s `@layer components` rule for `.event-description ul`/`.event-description p`. The class is applied by `<EventRender />` to its outer `<div>`; `<DescriptionRender />` renders inside that, so the rule still targets rendered markdown lists and paragraphs.

## `<DescriptionRender />` component

Path: `src/components/DescriptionRender/DescriptionRender.tsx`. Single responsibility: render a markdown string with the project's link + image styling. `'use client'` because `react-markdown` ships a client-only build.

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports -------------------------------------- */
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/* Component imports ----------------------------------- */

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */
import type { Components } from 'react-markdown';

/* DescriptionRender component prop types -------------- */
interface DescriptionRenderProps {
  markdown: string;
}

/* Constants ------------------------------------------- */
const components: Components = {
  a: ({ href, children, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 dark:text-blue-400 underline-offset-4 hover:underline"
      {...props}
    >
      {children}
    </a>
  ),
  img: ({ src, alt, ...props }) => (
    <img
      src={src}
      alt={alt ?? ''}
      className="max-w-full mx-auto my-2 rounded-md"
      {...props}
    />
  ),
};

/* DescriptionRender component ------------------------- */
const DescriptionRender: React.FC<DescriptionRenderProps> = ({ markdown }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[ remarkGfm ]}
      components={components}
    >
      {markdown}
    </ReactMarkdown>
  );
};

/* Export DescriptionRender component ------------------ */
export default DescriptionRender;
```

The `<a>` override means markdown authors write `[text](url)` and automatically get the project's consistent blue link style (from commit `15c0b5d`). The `<img>` override means raw `![alt](src)` images center and constrain width without HTML wrappers — eliminating the only `<div>`/`<img>` HTML nesting currently in the fixtures (`events-2024.tsx:1130-1143`).

## `Event` type change

```diff
 export interface Event {
   id: string;
   name?: string;
   status?: 'canceled' | 'postponed' | 'rescheduled';
   alerts?: EventAlert[];
-  description?: React.ReactNode;
+  description?: string;
   category?: EventCategory;
   // ...rest unchanged
 }
```

If `React.ReactNode` becomes unused elsewhere in `Event.ts` after this change, drop the import (`React` is still imported for the `EventLink.label: React.ReactNode` field, so the import probably stays).

## `EventRender` wiring

Inside the existing description article:

```diff
 {
   event.description !== undefined &&
     <article className="w-full">
       <h6 className="text-base font-semibold text-muted-foreground">
         Description de l'événement :
       </h6>
       <br />
       <div className="text-sm text-muted-foreground">
-        {event.description}
+        <DescriptionRender markdown={event.description} />
       </div>
     </article>
 }
```

The wrapping `<div className="event-description ...">` set higher up in `EventRender` keeps the `@layer components` styles (`.event-description ul { list-style: inside }`, `.event-description p { padding-bottom: 0.5rem }`) targeting the rendered markdown.

## Migration script

Path: `scripts/html-to-markdown.ts`. One-off tool, executed manually by `pnpm dlx tsx scripts/html-to-markdown.ts`. Keep the file in the repo after the migration for posterity (and in case a future fixture import needs the same conversion); add `scripts/**` to `tsconfig.json`'s `exclude` so the Next.js build ignores it.

The script:

1. Reads `src/fixtures/events-2024.tsx` and `src/fixtures/events-2023.tsx` as plain text.
2. For each `description: (\n      <>\n...</>\n    ),` block (or `description: (\n      <p>...</p>\n    ),`):
   - Captures the JSX content via regex.
   - Runs a literal-substitution converter for the known tag set (table below).
   - Replaces the block with `description: \`...markdown...\``,` using template-literal syntax.
   - Escapes backticks (`` ` `` → `` \` ``) and dollar signs followed by `{` (`${` → `\${`) inside the markdown content.
3. Reports per-event: `success` | `manual` (for the 3 special cases) | `skip` (for events with no description).
4. Writes the modified file back.

**Conversion table:**

| Source pattern | Markdown output |
|---|---|
| `<p>X</p>` | `X\n\n` |
| `<br />` / `<br/>` / `<br>` | `  \n` (2 trailing spaces + newline = MD line break) |
| `<a href="X">Y</a>` | `[Y](X)` |
| `<b>X</b>` / `<strong>X</strong>` | `**X**` |
| `<i>X</i>` / `<em>X</em>` | `*X*` |
| `<ul>\n<li>X</li>\n<li>Y</li>\n</ul>` | `- X\n- Y\n` |
| `<ol><li>X</li><li>Y</li></ol>` | `1. X\n2. Y\n` |
| `{' '}` JSX text-padding | single space |
| `{'X'}` literal-string interpolation | `X` |
| HTML entities (`&amp;`, `&nbsp;`, etc.) | UTF-8 equivalents |
| Surrounding `<>...</>` fragment | dropped |

The script is best-effort by design — its job is to handle ~95% of cases mechanically. The 3 known special cases get flagged in the `manual` report list.

## Special-case handling

Three locations in `events-2024.tsx` need hand-edits after the script runs:

### 1. `<img>` with centering wrappers (line 1138)

**Before:**

```tsx
<div className="flex justify-center w-full">
  <div className="flex justify-center w-full" style={{ maxWidth: 600 }}>
    <img src="/assets/2024/wallstreetbdx-story.png" alt="Story Instagram du Wall Street" />
  </div>
</div>
```

**After:**

```md
![Story Instagram du Wall Street](/assets/2024/wallstreetbdx-story.png)
```

Centering and max-width come from the `<DescriptionRender>` `<img>` component override (`max-w-full mx-auto my-2 rounded-md`). The `maxWidth: 600` constraint becomes "as wide as the column allows" — visually similar at most viewport widths.

### 2. `<code>` wrapping `<b>` (line 1772)

**Before:**

```tsx
<code>
  Téma l'event mdr. C'est de
  {' '}
  <b>
    07h à 13h au cours de la Marne
  </b>
</code>
```

**After:**

```md
`Téma l'event mdr. C'est de` **07h à 13h au cours de la Marne**
```

Two independent inline tokens: the code span for the casual quote, the bold span for the time. Markdown's `code` is plain-text-only, so the nested `<b>` can't survive as a single token — split it.

### 3. `<span>` wrappers (lines 308, 378, 1756)

Each location to be inspected during migration. If the `<span>` carries no class or inline style, drop the wrapper and keep the inner content. If it does carry styling (none observed in the audit), assess case-by-case; the most likely conversion is bold/italic markdown.

## Commit plan

On a new branch `feature/descriptions-to-markdown`:

### Commit 1 — Scaffold

- `package.json`, `pnpm-lock.yaml` — add `react-markdown`, `remark-gfm`.
- `src/components/DescriptionRender/DescriptionRender.tsx` — new file.
- `tsconfig.json` — add `"scripts/**"` to `exclude` (preemptive, before script lands).

No consumers yet; build stays green.

### Commit 2 — Migrate fixture descriptions

- `scripts/html-to-markdown.ts` — new file (the migration tool).
- `src/fixtures/events-2024.tsx`, `src/fixtures/events-2023.tsx` — every description converted to a markdown template literal, including manual fixes for the 3 special cases.
- `src/components/EventRender/EventRender.tsx` — calls `<DescriptionRender />` instead of rendering raw JSX.

`Event.description?: React.ReactNode` still accepts both strings and JSX, so TypeScript stays happy through this commit even though we're feeding it strings everywhere.

### Commit 3 — Tighten the type

- `src/types/Event.ts` — `description?: React.ReactNode` → `description?: string`. One-line change. If `React.ReactNode` becomes unused (it stays in use for `EventLink.label`), nothing else changes.

Each commit passes `pnpm tsc:ci`, `pnpm lint`, and `pnpm build` independently.

## Verification

- `pnpm tsc:ci` green.
- `pnpm lint` green.
- `pnpm build` green.
- Manual smoke in `pnpm dev`: scroll every category section, expand a representative sample of events with rich descriptions (lists, links, bold/italic, the Wall Street image, the code+bold case, alert-bearing events to confirm alerts still render above descriptions).
- Spot-check that:
  - Links render in the blue style (via the `<a>` override).
  - Markdown lists render with `list-style: inside` (via the existing `.event-description ul` rule).
  - Paragraph spacing is comfortable (via the existing `.event-description p` rule).
  - The Wall Street image centers and fits its container.
- No console errors in dev tools.

## Risks / open questions

- **`react-markdown` v9 + React 19.** v9 supports React 18+; React 19 is current at the time of writing and the library lists React 19 in peer-deps. Confirm at install time via `pnpm view react-markdown peerDependencies`.
- **Smart-quote and entity drift.** Existing JSX uses literal Unicode (`é`, `à`, `'`). The script must preserve UTF-8 and not double-encode entities. The conversion table includes a step for normalizing HTML entities; manual diff catches anything missed.
- **Template-literal escaping.** Some descriptions contain backticks or `${` substrings (unlikely but possible). The script must escape these. Verified by `tsc:ci` post-migration — any escaping miss surfaces as a syntax error.
- **`react-markdown` accessibility.** Default rendering uses standard HTML. The `<img>` override sets `alt={alt ?? ''}` which keeps decorative images out of screen readers if `alt` is empty; meaningful images carry their alt from the markdown source.
- **Custom `<span>` semantics.** If any of the three `<span>` instances in `events-2024.tsx` carries semantic intent that I missed during audit, the migration loses that intent. Mitigation: per-span manual review during the migration.

## Out of scope (track separately if needed)

- Markdown rendering for `EventAlert.content` (`alerts[].content` becomes markdown-aware).
- A WYSIWYG / preview tool for editing fixture descriptions.
- Lint rules to enforce markdown conventions in descriptions (e.g. no raw HTML, sentence-per-line wrapping).
- Per-event `.md` file storage.
- MDX support.
