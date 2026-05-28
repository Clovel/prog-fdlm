# Migrate Event Descriptions HTML → Markdown — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every fixture event's `description` field (currently JSX) with a raw Markdown string, render via `react-markdown` + `remark-gfm` inside a new `<DescriptionRender />` component, and tighten `Event.description` from `React.ReactNode` to `string`.

**Architecture:** Add `react-markdown@^9` + `remark-gfm@^4`. New leaf component `<DescriptionRender />` wraps `<ReactMarkdown>` with project-specific overrides for `<a>` (blue-link style, target=_blank) and `<img>` (centered, max-width). A one-off `scripts/html-to-markdown.ts` converts the fixtures' JSX descriptions to markdown via regex substitution (~95% mechanical; 3 manual fixes in `events-2024.tsx` for an image, a `<code>` wrapping `<b>`, and three `<span>` wrappers).

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript 6 · Tailwind v4 · shadcn/ui · pnpm 11 · Node 24 · `react-markdown@^9` · `remark-gfm@^4`

**Spec:** `docs/superpowers/specs/2026-05-28-html-to-markdown-design.md`

**Branch:** `feature/descriptions-to-markdown` (created in Task 0)

**Verification model:** No tests exist. Each commit is gated by:

```bash
pnpm tsc:ci  # type check
pnpm lint    # ESLint flat config
pnpm build   # Next.js production build
```

All three must exit 0 before commit. End-of-branch verification is `pnpm dev` + browser smoke (scroll every category, expand sample events, confirm markdown rendering looks right).

**Pre-flight requirement:** All commits are GPG-signed (key `5E7B2C12A3A2E4BB7F071479A95BCD5E4D400E66`). Confirm the cache is warm:

```bash
echo test | gpg --status-fd=2 -bsau 5E7B2C12A3A2E4BB7F071479A95BCD5E4D400E66 > /dev/null 2>&1 && echo "warm" || echo "cold"
```

If cold, ask the user to run `echo test | gpg --clearsign --local-user 5E7B2C12A3A2E4BB7F071479A95BCD5E4D400E66 > /dev/null` in a regular terminal. **DO NOT pass `--no-gpg-sign`** without explicit user authorization.

---

## Task 0: Create the feature branch from a clean state

**Files:** none modified.

### Steps

- [ ] **Step 0.1: Confirm the working tree is clean and we're on `main`**

```bash
git -C /home/clovel/repository/perso/prog-fdlm status --short
git -C /home/clovel/repository/perso/prog-fdlm branch --show-current
```

Expected: no output from `status`, branch is `main`.

If `git status` shows uncommitted changes, stop and report to the user — they may have in-progress work that needs handling before branching.

- [ ] **Step 0.2: Verify gates pass on `main`**

```bash
cd /home/clovel/repository/perso/prog-fdlm && pnpm tsc:ci && pnpm lint && pnpm build
```

All three exit 0. If any fail, stop and report.

- [ ] **Step 0.3: Create the feature branch**

```bash
git -C /home/clovel/repository/perso/prog-fdlm checkout -b feature/descriptions-to-markdown
```

Expected: `Switched to a new branch 'feature/descriptions-to-markdown'`. No commit yet.

---

## Task 1: Scaffold `<DescriptionRender />` and install markdown deps

**Files:**
- Create: `src/components/DescriptionRender/DescriptionRender.tsx`
- Modify: `package.json`, `pnpm-lock.yaml` (add `react-markdown`, `remark-gfm`)
- Modify: `tsconfig.json` (add `"scripts/**"` to `exclude`)

After Task 1 the new component exists but is unused. Gates stay green.

### Steps

- [ ] **Step 1.1: Install the markdown dependencies**

```bash
cd /home/clovel/repository/perso/prog-fdlm && pnpm add react-markdown remark-gfm
```

Expected: both packages added to `dependencies` in `package.json`. Confirm versions are `react-markdown@^9` and `remark-gfm@^4` (or higher). If pnpm resolves to lower majors, stop and check the registry — these are the targets.

- [ ] **Step 1.2: Add `scripts/**` to `tsconfig.json`'s exclude**

The migration script lives at `scripts/html-to-markdown.ts` (created in Task 2). Pre-emptively exclude the `scripts/` directory from the Next.js TypeScript build so the script's Node-only imports never enter the project's type-check.

Open `tsconfig.json`. Find the `"exclude"` array. Add `"scripts/**"` so the array reads:

```json
  "exclude": [
    "node_modules",
    "scripts/**"
  ]
```

(Preserve any other entries already in `exclude`.)

- [ ] **Step 1.3: Create `src/components/DescriptionRender/DescriptionRender.tsx`**

```bash
mkdir -p /home/clovel/repository/perso/prog-fdlm/src/components/DescriptionRender
```

Create the file with this content:

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

- [ ] **Step 1.4: Run verification gates**

```bash
cd /home/clovel/repository/perso/prog-fdlm && pnpm tsc:ci && pnpm lint && pnpm build
```

All three exit 0.

If lint complains about the `<a>` or `<img>` overrides not having explicit return types or about `any`/unsafe-call rules, the shadcn ui-files override block in `eslint.config.mjs` already exempts `src/components/ui/**`. `DescriptionRender` is NOT under `ui/` — it's a project component and follows the full ruleset. If you see lint errors here, fix the code (don't widen the override scope).

Specifically: if ESLint complains about the inline arrow component's return type, replace `{ ... }` argument destructuring with an explicit typed arrow:

```tsx
const components: Components = {
  a: ({ href, children, ...props }): React.ReactElement => (
    // ...
  ),
  img: ({ src, alt, ...props }): React.ReactElement => (
    // ...
  ),
};
```

Add `React.ReactElement` return annotations only if lint demands them.

- [ ] **Step 1.5: Commit**

```bash
git -C /home/clovel/repository/perso/prog-fdlm add \
  package.json \
  pnpm-lock.yaml \
  tsconfig.json \
  src/components/DescriptionRender
git -C /home/clovel/repository/perso/prog-fdlm commit -m "Added DescriptionRender component and markdown dependencies"
```

Confirm signed via `git -C /home/clovel/repository/perso/prog-fdlm log -1 --show-signature` showing "Good signature".

---

## Task 2: Migration script, fixture conversion, EventRender wiring

**Files:**
- Create: `scripts/html-to-markdown.ts`
- Modify: `src/fixtures/events-2024.tsx` (all descriptions converted, 3 manual fix-ups)
- Modify: `src/fixtures/events-2023.tsx` (all descriptions converted)
- Modify: `src/components/EventRender/EventRender.tsx` (use `<DescriptionRender />`)

This is the bulk task. After it, every description is a markdown string and the renderer uses `<DescriptionRender />`. `Event.description?: React.ReactNode` still accepts strings (since `string` is assignable to `React.ReactNode`), so TypeScript stays happy through this commit even though we've narrowed in practice. Type tightening happens in Task 3.

### Steps

- [ ] **Step 2.1: Create the `scripts/` directory and the migration script**

```bash
mkdir -p /home/clovel/repository/perso/prog-fdlm/scripts
```

Create `scripts/html-to-markdown.ts` with this content:

```ts
/* eslint-disable */
/**
 * One-off migration script: converts the JSX `description: (...)` blocks
 * in src/fixtures/events-*.tsx to markdown template literals.
 *
 * Best-effort. Handles the common cases; flags events that need manual
 * review (img, code-wrapping-bold, attributed spans).
 *
 * Run with: pnpm dlx tsx scripts/html-to-markdown.ts
 */
import fs from 'node:fs';

const FIXTURES = [
  'src/fixtures/events-2024.tsx',
  'src/fixtures/events-2023.tsx',
];

const htmlToMd = (raw: string): string => {
  let s = raw;

  // 1. JSX text padding and literal-string interpolations.
  s = s.replace(/\{' '\}/g, ' ');
  s = s.replace(/\{\s*'([^']*?)'\s*\}/g, '$1');
  s = s.replace(/\{\s*"([^"]*?)"\s*\}/g, '$1');

  // 2. Self-closing tags.
  s = s.replace(/<br\s*\/?\s*>/gi, '  \n');
  s = s.replace(/<hr\s*\/?\s*>/gi, '\n\n---\n\n');

  // 3. Inline formatting. Iterate to a fixed point so nested tags resolve
  //    (e.g. <b><i>x</i></b> → ***x***).
  let prev = '';
  while(s !== prev) {
    prev = s;
    s = s.replace(/<a\s+href="([^"]+)"[\s\S]*?>([\s\S]*?)<\/a>/gi, '[$2]($1)');
    s = s.replace(/<strong>\s*([\s\S]*?)\s*<\/strong>/gi, '**$1**');
    s = s.replace(/<b>\s*([\s\S]*?)\s*<\/b>/gi, '**$1**');
    s = s.replace(/<em>\s*([\s\S]*?)\s*<\/em>/gi, '*$1*');
    s = s.replace(/<i>\s*([\s\S]*?)\s*<\/i>/gi, '*$1*');
    s = s.replace(/<code>\s*([\s\S]*?)\s*<\/code>/gi, '`$1`');
    s = s.replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, '$1');
  }

  // 4. Lists (process before paragraphs so nested <ul> inside <p> works).
  s = s.replace(/<ul>([\s\S]*?)<\/ul>/gi, (_, inner) => {
    const items = inner.replace(/<li>\s*([\s\S]*?)\s*<\/li>/gi, '- $1\n');
    return '\n' + items + '\n';
  });
  s = s.replace(/<ol>([\s\S]*?)<\/ol>/gi, (_, inner) => {
    let n = 0;
    const items = inner.replace(/<li>\s*([\s\S]*?)\s*<\/li>/gi, () => `${++n}. $1\n`);
    return '\n' + items + '\n';
  });

  // 5. Paragraphs → blank-line separated.
  s = s.replace(/<p>\s*([\s\S]*?)\s*<\/p>/gi, '$1\n\n');

  // 6. Normalize whitespace:
  //    - Trim each line's leading whitespace (JSX indentation noise).
  //    - Collapse 3+ consecutive newlines to 2.
  //    - Trim overall.
  s = s.split('\n').map((l) => l.replace(/^\s+/, '').replace(/\s+$/, '')).join('\n');
  s = s.replace(/\n{3,}/g, '\n\n');
  s = s.trim();

  return s;
};

const escapeTemplate = (s: string): string =>
  s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

const isManualCase = (jsx: string): boolean => {
  // Img anywhere
  if(/<img/.test(jsx)) return true;
  // Code wrapping <b>
  if(/<code>[\s\S]*?<b>[\s\S]*?<\/b>[\s\S]*?<\/code>/.test(jsx)) return true;
  // Span with attributes (e.g. className, style)
  if(/<span\s+[a-zA-Z]/.test(jsx)) return true;
  return false;
};

const findEventId = (text: string, pos: number): string => {
  // Scan backward from `pos` to find the nearest `id: '...'` line.
  const before = text.slice(0, pos);
  const matches = [ ...before.matchAll(/id:\s*'([^']+)'/g) ];
  return matches.length > 0 ? matches[matches.length - 1][1] : '(unknown)';
};

const processFile = (filePath: string): void => {
  const text = fs.readFileSync(filePath, 'utf8');
  const out: string[] = [];
  let count = 0;
  const manual: string[] = [];
  let lastEnd = 0;

  // Find each `description: (` and balance parens to locate the matching `)`.
  const re = /description: \(/g;
  let m: RegExpExecArray | null;
  while((m = re.exec(text)) !== null) {
    const start = m.index;
    let depth = 0;
    let j = start + 'description: '.length;
    while(j < text.length) {
      const c = text[j];
      if(c === '(') depth++;
      else if(c === ')') {
        depth--;
        if(depth === 0) break;
      }
      j++;
    }
    const blockEnd = j + 1;
    const inner = text.slice(start + 'description: ('.length, blockEnd - 1);

    let jsx = inner.trim();
    if(jsx.startsWith('<>') && jsx.endsWith('</>')) {
      jsx = jsx.slice(2, -3).trim();
    }

    if(isManualCase(jsx)) {
      manual.push(findEventId(text, start));
    }

    const md = htmlToMd(jsx);
    const escaped = escapeTemplate(md);

    out.push(text.slice(lastEnd, start));
    out.push(`description: \`${escaped}\``);
    lastEnd = blockEnd;
    count++;
  }
  out.push(text.slice(lastEnd));

  fs.writeFileSync(filePath, out.join(''));

  console.log(`${filePath}: ${count} descriptions converted`);
  if(manual.length > 0) {
    console.log(`  Manual review needed for event IDs: ${manual.join(', ')}`);
  }
};

for(const fp of FIXTURES) {
  processFile(fp);
}
```

- [ ] **Step 2.2: Run the migration script**

```bash
cd /home/clovel/repository/perso/prog-fdlm && pnpm dlx tsx scripts/html-to-markdown.ts
```

Expected output (counts approximate; events without descriptions are not counted):

```
src/fixtures/events-2024.tsx: ~40 descriptions converted
  Manual review needed for event IDs: <some id list>
src/fixtures/events-2023.tsx: ~40 descriptions converted
```

The `Manual review needed for event IDs` line lists the events that hit one of the three special-case detectors (img, code-wrapping-bold, attributed span). Note the IDs — Step 2.4 hand-fixes each.

If `pnpm dlx tsx` is not installed, install via `pnpm add -D tsx` first, then run the script via `pnpm tsx scripts/html-to-markdown.ts`.

- [ ] **Step 2.3: Run a fast sanity-check on the result**

```bash
cd /home/clovel/repository/perso/prog-fdlm && pnpm tsc:ci 2>&1 | tail -20
```

Expected: probably some errors. The script's output is best-effort and TypeScript will surface anything malformed. Common breakage patterns to look for:

1. **Unbalanced template literal:** an unescaped `` ` `` inside the markdown content. The script escapes them, but if any slipped through, you'll see `Unterminated template literal`. Fix: locate the offending event, escape the `` ` `` manually.
2. **`${` interpolation:** if any description literally said `${` (unlikely), it'd be interpreted as a template-literal expression. The script escapes these but verify.
3. **JSX leftovers:** any HTML tag the script didn't recognize (e.g. `<sub>`, `<sup>`, `<u>`) would survive as literal text inside the markdown. These render as raw text — not great, but not a compile error. Search for `<[a-z]` in both fixtures after running the script; convert any leftovers manually.

```bash
grep -nE "<[a-z]" /home/clovel/repository/perso/prog-fdlm/src/fixtures/events-2024.tsx /home/clovel/repository/perso/prog-fdlm/src/fixtures/events-2023.tsx | grep -v "^--" | head -20
```

Expected: ideally empty. Any matches are leftover HTML tags. Decide per match: convert to markdown by hand, leave as literal text, or use HTML passthrough (react-markdown supports raw HTML if you opt in with `rehype-raw`, but that's out of scope — convert by hand instead).

- [ ] **Step 2.4: Hand-fix the 3 special cases in `events-2024.tsx`**

The script processes these but mangles the output. Open `src/fixtures/events-2024.tsx` and find each:

**a) Wall Street image (originally `events-2024.tsx:1130-1143`).** The script will have produced a description containing literal `<div>` / `<img>` text. Find the event (search for `wallstreetbdx-story.png`). Replace the entire `description: \`...\`` value for that event so it ends with the markdown image syntax:

```tsx
    description: `<existing markdown content before the image>

![Story Instagram du Wall Street](/assets/2024/wallstreetbdx-story.png)`,
```

Drop the `<div>` wrappers and the `eslint-disable-next-line` comment. The image's centering and width come from the `<DescriptionRender />` `<img>` override.

**b) `<code>` wrapping `<b>` (originally `events-2024.tsx:1772`).** Find the event by searching for `Téma l'event mdr`. The script's output for that block will be something like `` `Téma l'event mdr. C'est de **07h à 13h au cours de la Marne**` `` — i.e. the bold inside the code span. Rewrite as two separate spans:

```md
`Téma l'event mdr. C'est de` **07h à 13h au cours de la Marne**
```

(Backtick for the prose, double-asterisk for the time. Two adjacent markdown spans separated by a space.)

**c) `<span>` wrappers (originally `events-2024.tsx:308, 378, 1756`).** The script's `<span[^>]*>...</span>` regex strips the wrapper and keeps the inner content. If any of the three spans had classes or styles that mattered visually (audit the original file before running the script if uncertain), apply the same intent via markdown formatting (e.g. `**` for bold-styled spans). If they were pure grouping with no styling, no further action needed.

To re-inspect the originals before fixing: `git show HEAD~1:src/fixtures/events-2024.tsx | sed -n '300,320p; 370,390p; 1750,1770p'` (adjust line numbers if HEAD is offset).

- [ ] **Step 2.5: Confirm no JSX or HTML tags remain in fixture descriptions**

```bash
grep -nE "<[a-z]|<>" /home/clovel/repository/perso/prog-fdlm/src/fixtures/events-2024.tsx /home/clovel/repository/perso/prog-fdlm/src/fixtures/events-2023.tsx | head -10
```

Expected: empty. Any matches are leftover JSX/HTML that needs manual conversion or escaping (if the `<` is meant as literal text, escape it as `\<`).

Also confirm no remaining JSX expressions like `{' '}`:

```bash
grep -nE "\{'\s'\}|\{\s*'[^']+'\s*\}" /home/clovel/repository/perso/prog-fdlm/src/fixtures/events-2024.tsx /home/clovel/repository/perso/prog-fdlm/src/fixtures/events-2023.tsx | head -10
```

Expected: empty.

- [ ] **Step 2.6: Wire `<DescriptionRender />` into `<EventRender />`**

Open `src/components/EventRender/EventRender.tsx`. Add an import:

```tsx
import DescriptionRender from 'components/DescriptionRender/DescriptionRender';
```

(Place it in the alphabetical position alongside the other `'components/...'` imports.)

Find the description article block (currently renders `{event.description}` inside a `<div>`). Replace:

```tsx
            <div className="text-sm text-muted-foreground">
              {event.description}
            </div>
```

with:

```tsx
            <div className="text-sm text-muted-foreground">
              <DescriptionRender markdown={event.description} />
            </div>
```

The surrounding `<article>`, `<h6>`, and the `.event-description` class on the outer `<div>` (set earlier in `EventRender`) stay unchanged.

- [ ] **Step 2.7: Run all three verification gates**

```bash
cd /home/clovel/repository/perso/prog-fdlm && pnpm tsc:ci && pnpm lint && pnpm build
```

All three must exit 0. If lint flags `react/jsx-no-useless-fragment` on event descriptions that ended up as a single `<p>` after Alert extraction earlier this session, those should already be unwrapped — but spot-check.

If `tsc:ci` fails with type errors on the fixture file, the most likely cause is a backtick or `${` slipping into a description string without escaping. Find the line, escape, re-run.

If `build` fails with a React markdown rendering error, the most likely cause is a malformed markdown construct (e.g. an unclosed code block from a stray backtick). Fix the offending description.

- [ ] **Step 2.8: Smoke-test in `pnpm dev`**

```bash
cd /home/clovel/repository/perso/prog-fdlm && pnpm dev &
sleep 4
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000
kill %1
```

Expected: `200`. If the dev server picks port 3001 (3000 already in use), curl that instead.

Browser-side smoke (you, not the subagent): open `http://localhost:3000`, expand a few events with rich descriptions, confirm markdown renders with blue links, bold/italic, bulleted lists, and (for the one event with the image) a centered Wall Street image. Skip this step if you're running this plan via a subagent — leave the manual visual check to the user.

- [ ] **Step 2.9: Commit**

```bash
git -C /home/clovel/repository/perso/prog-fdlm add \
  scripts/html-to-markdown.ts \
  src/fixtures/events-2024.tsx \
  src/fixtures/events-2023.tsx \
  src/components/EventRender/EventRender.tsx
git -C /home/clovel/repository/perso/prog-fdlm commit -m "Migrated fixture descriptions to markdown"
```

Confirm signed.

---

## Task 3: Tighten `Event.description` type to `string`

**Files:**
- Modify: `src/types/Event.ts`

After this commit, `description` is typed `string` only — JSX is no longer assignable. TypeScript will surface anywhere the field is still set to non-string (none expected, but confirms the migration is complete).

### Steps

- [ ] **Step 3.1: Change the type**

Open `src/types/Event.ts`. Find the `Event` interface's `description` field:

```ts
  description?: React.ReactNode;
```

Change to:

```ts
  description?: string;
```

Don't change anything else. The `React` import stays because `EventLink.label: React.ReactNode` still uses it.

- [ ] **Step 3.2: Verify gates**

```bash
cd /home/clovel/repository/perso/prog-fdlm && pnpm tsc:ci && pnpm lint && pnpm build
```

All three exit 0. If `tsc:ci` errors, the error message identifies a fixture event still holding non-string content — fix it in the fixture (likely a leftover from Task 2 that the looser typing tolerated).

- [ ] **Step 3.3: Commit**

```bash
git -C /home/clovel/repository/perso/prog-fdlm add src/types/Event.ts
git -C /home/clovel/repository/perso/prog-fdlm commit -m "Tightened Event.description type to string"
```

Confirm signed.

---

## End of plan

After all three commits land on `feature/descriptions-to-markdown`, leave the branch unpushed. Use the `superpowers:finishing-a-development-branch` skill to merge / keep / discard.

Total expected commits: **3** (one per task). Total expected new files: **2** (`DescriptionRender.tsx` + `html-to-markdown.ts`). Total expected modified files: **5** (`package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `EventRender.tsx`, both fixtures, `Event.ts`).

### Things deliberately out of scope (do not implement)

- Markdown rendering for `EventAlert.content` (still a plain string).
- A custom remark plugin for image-width syntax.
- Removing the migration script after running it — keep `scripts/html-to-markdown.ts` in the repo (excluded from build by tsconfig).
- Updating CLAUDE.md — minor doc polish; deferred so this plan stays focused.
