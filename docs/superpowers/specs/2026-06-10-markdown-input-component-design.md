# Markdown input component (Monaco editor + preview)

**Date:** 2026-06-10

## Problem

Four admin prose fields are authored in a bare `<Textarea>`, with no way to see
the rendered Markdown while editing:

| # | Field | Input (file:line) | Rendered as Markdown? | Limit |
| --- | --- | --- | --- | --- |
| 1 | Event description | `EventForm.tsx:226` | Yes (`EventRender`, `EventInfoWindow`) | 10000 |
| 2 | General alert content | `AlertFormDialog.tsx:151` | Yes (`GeneralAlertsBanner`) | 2000 |
| 3 | Event alert content | `sections/AlertsSection.tsx:73` | No — rendered plain (`EventAlert.tsx:37`) | 2000 |
| 4 | Edition description | `EditionFormDialog.tsx:160` | No — never rendered | 2000 |

All four are `text` columns edited via react-hook-form and validated by Zod in
`src/validation/`. The shared renderer is `DescriptionRender` (react-markdown +
remark-gfm), styled through the `.event-description` scope.

## Goals

- One reusable Markdown input with two tabs: **Éditer** (Monaco) and **Aperçu**
  (live `DescriptionRender` preview).
- Adopt it in all four fields.
- Make event-alert content render Markdown (so the editor isn't authoring text
  that never renders).

## Decisions

- **Scope:** all four fields.
- **Editor:** Monaco via `@monaco-editor/react`, lazy-loaded (`next/dynamic`,
  `ssr:false`).
- **Edition description:** authored with the editor, output stays unrendered
  publicly for now (admin-only).

## Design

### `src/components/MarkdownInput/MarkdownInput.tsx` (new, `'use client'`)

Controlled, react-hook-form friendly:

```ts
interface MarkdownInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;   // drives counter; soft-truncate on change
  minHeight?: number;   // editor/preview height, default 200
  disabled?: boolean;
  invalid?: boolean;    // aria-invalid ring
}
```

- **Tabs:** shadcn `Tabs`, triggers "Éditer" / "Aperçu", default "Éditer".
  Radix unmounts inactive tab content, so Monaco only instantiates while the
  Éditer tab is active.
- **Éditer:** Monaco via `next/dynamic` (`ssr:false`) with a `Skeleton` fallback
  sized to `minHeight`. Options: `language:"markdown"`, `wordWrap:"on"`,
  `minimap:{enabled:false}`, `lineNumbers:"off"`, `folding:false`,
  `scrollBeyondLastLine:false`, padding. Theme from `next-themes`
  `resolvedTheme` → `"vs"` / `"vs-dark"`.
- **Aperçu:** `DescriptionRender` wrapped in a `.event-description` bordered box
  at `minHeight`; empty value shows muted "Rien à prévisualiser".
- **Counter:** `value.length` / `maxLength` below the box, muted, destructive
  near/over the limit. `onChange` soft-truncates at `maxLength`.

### Editor dependency

`@monaco-editor/react` loads Monaco core from a CDN (jsdelivr) at runtime via
`@monaco-editor/loader` — negligible bundle cost, but the admin editor needs
network on first load. Acceptable for an online admin tool; self-hosting fights
Turbopack. Install must respect the `pnpm@9.15.9` pin.

### Form integration

Replace each `<Textarea>` with a `<Controller>` rendering `<MarkdownInput>`
(mirrors the existing Select Controllers). Empty-string→`undefined` handling for
optional fields stays at the form layer. Zod limits unchanged; pass each limit as
`maxLength` (10000 / 2000 / 2000 / 2000).

### Event-alert rendering fix

`EventAlert.tsx:37` renders `{alert.content}` with `whitespace-pre-line`. Replace
with `DescriptionRender` so event alerts render Markdown like general alerts.

## Files touched

- NEW `src/components/MarkdownInput/MarkdownInput.tsx`
- `package.json` + lockfile (`@monaco-editor/react`)
- `src/app/admin/events/EventForm.tsx`
- `src/app/admin/alerts/AlertFormDialog.tsx`
- `src/app/admin/events/sections/AlertsSection.tsx`
- `src/app/admin/editions/EditionFormDialog.tsx`
- `src/components/EventAlert/EventAlert.tsx`

## Risks / notes

- Monaco CDN runtime fetch (admin-only, online).
- `AlertsSection` may hold several alerts → several editors; mitigated by Radix
  unmounting inactive tabs + default "Éditer" tab.
- Turbopack compatibility: `@monaco-editor/react` is client-only, loaded via
  dynamic import — no SSR path.

## Out of scope

- Public rendering of edition description.
- Self-hosting Monaco assets.
- Toolbar / WYSIWYG buttons (raw Markdown editing only).
