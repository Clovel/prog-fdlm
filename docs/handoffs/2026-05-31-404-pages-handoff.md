# Handoff — 404 / not-found pages on the public site

**Date:** 2026-05-31
**For:** the AI coding agent picking up 404 / not-found work
**Repo:** `prog-fdlm` (Fête de la Musique Bordeaux — Next.js App Router, single public site + admin back-office)

---

## 1. Mission

Make the public site's "not-found" experience visitor-friendly and complete. The
primary target is already specified and approved but **not yet implemented in code**:
a polished, music-themed 404 for the `(public)/[year]` route. Secondary: there are a
few other 404 surfaces that currently have no friendly handling (see §6).

Read the approved spec first — it is the source of truth for the main task:

- `docs/superpowers/specs/2026-05-31-year-404-page-design.md`

---

## 2. Project context (enough to be dangerous)

- French-language, mobile-first site. All visitor-facing copy is in **French**.
- App Router. Route groups:
  - `src/app/(public)/` — visitor site. Layout `(public)/layout.tsx` wraps children
    with `<Header />` + footer. Routes: `/` (`(public)/page.tsx`, server component that
    redirects to the latest **published** edition) and `/[year]`
    (`(public)/[year]/page.tsx`, a `'use client'` page that fetches an edition + its
    events from `/api/editions/...`).
  - `src/app/admin/` — back-office (auth-gated).
  - `src/app/(auth)/` — login / password flows.
- The `[year]` route renders Next's nearest `not-found.tsx` when a fetch helper calls
  `notFound()`.
- Styling: Tailwind v4 + shadcn/ui (`new-york`, `neutral`). Use **theme tokens**
  (`text-foreground`, `text-muted-foreground`, `text-primary`, `bg-card`,
  `border-border`), never raw color names like `text-zinc-700`. Dark mode via a `.dark`
  class (`next-themes`). Icons: `lucide-react`.

---

## 3. Current state of the code (verified 2026-05-31)

Do not trust the spec's "after" as already-done — it isn't. Actual state on disk:

- `src/app/(public)/[year]/not-found.tsx` — **still the bare version**: an `<h1>`
  "Édition introuvable", one `<p>`, and a plain text `<Link href="/">`. No illustration,
  no shadcn `<Button>`.
- `src/app/(public)/[year]/Music404.tsx` — **does not exist** yet.
- `src/app/(public)/[year]/page.tsx` — **no** `^\d{4}$` early guard; the fetch helpers
  (`fetchEdition`, `fetchEvents`) treat only `response.status === 404` as not-found, so a
  malformed year (e.g. `/banane`, `/99`) returns a 400 → throws → generic error flash
  ("Impossible de charger les événements.") instead of the 404.
- There is **no root/global `app/not-found.tsx`** — only the one inside
  `(public)/[year]/`.

So the main task is a from-scratch implementation of the approved spec, not a tweak.

---

## 4. The approved 404 spec, in brief

Full details in the spec file; the three changes are:

1. **Rewrite `(public)/[year]/not-found.tsx`** (stays a **server component**, renders
   inside the public layout so header/footer remain). Centered, mobile-first column:
   - Inline music-themed SVG illustration (`4 ◉♪ 4`), strokes/fills via `currentColor` +
     theme tokens so one asset works light & dark; `aria-hidden="true"`. Extract to a
     sibling `Music404.tsx` if it exceeds ~30 lines.
   - Headline: **"Oups, fausse note 🎵"**.
   - Sub-line: **"Cette édition de la Fête de la Musique n'existe pas (ou pas encore)."**
   - shadcn `<Button asChild>` wrapping `<Link href="/">`, label **"Revenir à
     l'accueil"** (`/` redirects to the latest published edition).
2. **Early synchronous guard in `(public)/[year]/page.tsx`**: if `year` does not match
   `/^\d{4}$/`, call `notFound()` before the fetch effect — avoids the doomed request and
   error flash.
3. **Widen status handling** in `fetchEdition` / `fetchEvents`: treat
   `status === 404 || status === 400` as `notFound()`.

Behavior matrix (target):

| Path        | Result            | Outcome                   |
|-------------|-------------------|---------------------------|
| `/2024`     | 200               | Edition renders           |
| `/3000`     | 404               | Friendly 404              |
| `/banane`   | guard / 400       | Friendly 404              |
| `/99`       | guard / 400       | Friendly 404              |
| network/500 | throws            | Generic error (unchanged) |

Non-goals from the spec: no list of available editions, no new dependencies, no static
image assets, no API-route changes, no change to the root page's "Aucune édition
disponible" empty state.

---

## 5. Related in-flight work — coordinate, don't collide

A separate task is designing an **empty-state / "coming soon" notice** for the
`(public)/[year]` page for the case where an edition **exists and is published but has
zero events** (proposed component: `src/components/UpcomingEditionNotice/`, French copy
"Le programme arrive bientôt" + festival date). This is a **distinct** state from a 404:

- **404 / not-found** = the edition/year doesn't resolve. Lives in `not-found.tsx`.
- **Empty edition** = the edition resolves fine but has no events yet. Lives in the
  normal `page.tsx` render path.

Keep them separate code paths, but **share the visual language**: centered mobile-first
column, theme tokens, a friendly French headline, optional lucide/SVG flourish. If you
establish a reusable presentational "notice" primitive, mention it so the empty-state
work can adopt it — but the spec deliberately keeps the 404 self-contained, so don't
block on a shared abstraction.

---

## 6. Other 404 surfaces (out of scope unless asked — flag, don't fix silently)

- **No global `app/not-found.tsx`.** Unmatched top-level routes fall back to Next's
  default 404 (unstyled, English-ish, no header/footer). A branded global not-found
  would be a natural follow-up.
- **`admin/` and `(auth)/` groups** have no `not-found.tsx`.
- The root page's `(public)/page.tsx` "Aucune édition disponible" block is a separate
  empty state, not a 404; the spec explicitly leaves it alone.

If you think any of these belong in this task, raise it before expanding scope.

---

## 7. Conventions & constraints you WILL trip over

- **Component banner layout** is used in every file (not lint-enforced, but mandatory by
  convention):
  ```
  /* Framework imports ----------------------------------- */
  /* Component imports ----------------------------------- */
  /* <Name> component prop types ------------------------- */
  /* <Name> component ------------------------------------ */
  /* Export <Name> component ----------------------------- */
  ```
  Components are `React.FC<Props>`, default-exported, prop interface above the component.
- **ESLint (flat config, v9) gotchas:**
  - `@typescript-eslint/strict-boolean-expressions` is **error** — no `if(maybeStr)`;
    write `if(str !== undefined && str.length > 0)`.
  - `keyword-spacing` override: **no space after `if`/`for`/`while`/`switch`/`catch`**
    → `if(x)`, not `if (x)`.
  - `@typescript-eslint/explicit-function-return-type` is **warn** — annotate returns on
    non-trivial functions.
  - 2-space indent, single quotes in JS / double in JSX, semicolons, **always-multiline
    trailing commas** (incl. imports). `prefer-template` (no `+` string concat).
  - Escape apostrophes in JSX (`&apos;`) or use string literals, as the existing
    `not-found.tsx` does.
- **Path aliases**: import from `components/...`, `app/...`, `types/...`, `helpers/...`
  (both `*` and bare resolve to `./src/*`). No `../../../`.
- **Server vs client**: `not-found.tsx` must stay a server component (no `'use client'`).
  `page.tsx` is `'use client'` — the `^\d{4}$` guard runs in the client component body.
- **No new dependencies, no image files.** Illustration is inline SVG.
- Package manager is **pnpm**; Node `>=24 <25`.

---

## 8. Verification (run before claiming done — evidence, not assertions)

- `pnpm tsc:ci` — no type errors.
- `pnpm lint` — clean (watch the rules in §7).
- Visual check in `pnpm dev`:
  - `/3000` (well-formed, no edition) → friendly 404.
  - `/banane` and `/99` (malformed) → friendly 404, **no** generic-error flash.
  - Light **and** dark mode; header + footer present on the 404.

---

## 9. Files map

**Will touch (main task):**
- `src/app/(public)/[year]/not-found.tsx` — rewrite.
- `src/app/(public)/[year]/Music404.tsx` — new (if SVG is extracted).
- `src/app/(public)/[year]/page.tsx` — add `^\d{4}$` guard + widen 400 handling.

**Read for context, do not change:**
- `docs/superpowers/specs/2026-05-31-year-404-page-design.md` — the spec.
- `src/app/(public)/layout.tsx` — confirms header/footer wrap not-found.
- `src/app/(public)/page.tsx` — root redirect + separate empty state.
- `CLAUDE.md` — full repo conventions.

**Coordinate with (separate task):**
- `src/components/UpcomingEditionNotice/` — empty-edition notice (see §5).

---

## 10. Open questions for the agent to resolve or escalate

1. Inline the SVG in `not-found.tsx` or extract `Music404.tsx`? (Spec: extract if
   >~30 lines.)
2. Is a global `app/not-found.tsx` in scope for this task, or a follow-up? (Default:
   follow-up — keep this task scoped to `[year]`.)
3. Should the 404 and empty-edition states share a "notice" primitive now, or stay
   independent? (Default: independent; the 404 spec wants self-containment.)
