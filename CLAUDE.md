# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A French-language, mobile-first web app for the **Fête de la Musique** in Bordeaux. It has two halves:

1. **Public site** (read-only for visitors) — a per-edition agenda of concerts/events at `/[year]`, rendered from the database. The root `/` redirects to the latest **published** edition.
2. **Admin backoffice** at `/admin` (auth-gated) — where maintainers manage editions, events, general alerts, and users.

It was originally a single static page reading hand-written fixtures. It is now a **full-stack Next.js app**: PostgreSQL (Supabase) + Drizzle ORM, BetterAuth authentication, REST API routes, and a TanStack-Query admin UI. The old `src/fixtures/events-YYYY.tsx` files still exist but are now **database seeds** (consumed by `pnpm db:seed`), not the live data source.

The build-up is documented spec-by-spec under `docs/superpowers/specs/` and `docs/superpowers/plans/` (data layer → auth → backoffice 3a/3b/3c/3d → invite users). Read the relevant spec/plan before extending a subsystem.

## Commands

Package manager is **pnpm, pinned to `pnpm@9.15.9`** via `packageManager` (see the Toolchain section — do NOT bump to pnpm 10/11). Node must be **>=24 <25** (`.nvmrc` pins `24.12.0`). `npm`/`yarn` are blocked via `engines`; use `corepack enable pnpm` if pnpm isn't on `$PATH`.

```bash
pnpm dev            # Next.js dev server (http://localhost:3000)
pnpm build          # production build
pnpm start          # run the production build
pnpm lint           # ESLint flat config
pnpm lint-fix       # ESLint --fix
pnpm tsc:ci         # TypeScript --noEmit (CI gate)

pnpm db:generate    # drizzle-kit: generate a migration from schema changes
pnpm db:migrate     # drizzle-kit: apply migrations to the DATABASE_URL database
pnpm db:studio      # drizzle-kit studio (DB browser)
pnpm db:seed        # upsert editions+events from src/fixtures/* into the DB
pnpm db:seed:admin  # create/promote the first admin from ADMIN_* env vars
```

There is **no test framework**. Verification = `pnpm tsc:ci`, `pnpm lint`, `pnpm build`, plus `curl` against a running dev server (with an admin cookie jar for guarded routes) and visual checks. The DB lives in Supabase; `db:migrate`/`db:seed` act on whatever `DATABASE_URL` points at — they hit the real database, so treat them as such.

## Environment variables

`.env.local` is gitignored. `.env.example` lists every key. It currently holds **live keys + a placeholder admin password (`changeme-please-1234`)** on disk — never paste these into commits or external systems.

**Server-only (never `NEXT_PUBLIC_`):**
- `DATABASE_URL` — Postgres connection string. Read by the Drizzle client (`src/db/index.ts`) and the `db:*` scripts. The client throws at import if it's unset, so it's **build-critical** (Next evaluates route modules during build).
- `BETTER_AUTH_SECRET` — BetterAuth session signing secret.
- `BETTER_AUTH_URL` — base URL (`http://localhost:3000` locally; the deployed origin in prod, e.g. `https://prog-fdlm.vercel.app`).
- `RESEND_API_KEY` / `EMAIL_FROM` — transactional email (password reset + invitations). `EMAIL_FROM` must use a **Resend-verified domain** (`clovel.fr` is verified); the shared `onboarding@resend.dev` sender only delivers to the account owner.
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_FIRST_NAME` / `ADMIN_LAST_NAME` — consumed **only** by `pnpm db:seed:admin`, never at runtime.

**Client (`NEXT_PUBLIC_*`, read by `src/components/EventsMap/EventsMap.tsx`):**
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — required for the map to render (the map block is conditional on it).
- `NEXT_PUBLIC_GEOCODING_API_KEY` — passed to `react-geocode` to turn an event's `addressStr` into lat/lng. Geocoding happens on every view (no cache, by design).

## Toolchain & deployment gotchas (read before touching deps/build)

- **pnpm version is load-bearing.** Vercel builds with **pnpm 9.x** (mapped by project creation date). The repo is pinned to `pnpm@9.15.9` to match. **Do NOT** upgrade to pnpm 10/11 or introduce a `pnpm-workspace.yaml` — pnpm 11 drops the `package.json#pnpm` field (which holds the kysely override) and pnpm 9 rejects a workspace file lacking a `packages:` entry (`ERR_PNPM packages field missing`). This combination already broke prod once.
- **kysely override.** `package.json` pins `pnpm.overrides.kysely = 0.28.17`. better-auth's bundled kysely core breaks on 0.29.x (`DEFAULT_MIGRATION_LOCK_TABLE` missing). Keep this override in `package.json` (pnpm 9 reads it). `next.config` uses `serverExternalPackages` for `better-auth`/`kysely`.
- **`vercel.json`** sets `installCommand: pnpm install --no-frozen-lockfile` so Vercel's pnpm-9 patch can reconcile the lockfile's `overrides` representation (a strict frozen install across differing pnpm patches throws `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`).
- **Deployment is Vercel**, auto-deploying on push to the connected branch. `@vercel/analytics` + `@vercel/speed-insights` are in `layout.tsx`. The Vercel project's Node version is set to 24 (the `engines` field also forces 24.x regardless). All server env vars above must be set in the Vercel project, with `BETTER_AUTH_URL` = the production origin.
- After a schema change: `pnpm db:generate` → review the generated SQL in `src/db/migrations/` → `pnpm db:migrate`. Migrations are applied to Supabase directly; there is no migration step in the Vercel build.

## Architecture

Next.js **App Router** (`src/app/`), React 19, TypeScript, Turbopack. Route groups split the three surfaces:

```
src/app/
  (public)/            # visitor-facing, no auth
    page.tsx           # server: redirect to latest published edition (or "no edition" notice)
    [year]/page.tsx    # 'use client': the per-edition agenda (see Public read path)
    layout.tsx         # public Header + Copyright
  (auth)/              # login / forgot-password / reset-password / invite/[token]
    layout.tsx         # centered max-w-sm card shell
  admin/               # auth-gated backoffice (AdminShell + per-section pages)
  api/                 # REST routes (public read + admin write)
```

### Data layer (`src/db/`)

Drizzle ORM over `postgres-js`. **The database is the source of truth**; fixtures are only seeds.

- `src/db/index.ts` — the `db` client (throws if `DATABASE_URL` unset).
- `src/db/schema/` — one file per table, re-exported from `schema/index.ts`: `editions`, `events`, `eventLinks`, `eventEmbedLinks`, `eventAlerts`, `generalAlerts`, `invitations`, BetterAuth's `auth.ts` (`user`/`session`/`account`/`verification`), shared `enums.ts`, and `relations.ts`. UUID PKs (`defaultRandom()`), timestamptz columns, CHECK constraints, and (for ordered/uniqueness rules) `uniqueIndex`/partial indexes. Use `generalAlerts.ts` as the template for a table with a CHECK + index.
- `src/db/queries/` — read functions returning **DTOs** (plain serializable objects; timestamps mapped to ISO strings). Public reads at the top level (`getEdition`, `listEditions`, `listEditionEvents`, `getEventDetail`); admin reads under `queries/admin/` (`listAllEditions`, `listEditionEventsAdmin`, `getEventForEdit`, `listEditionAlerts`, `listUsers`, `listInvitations`). Shared DTO types in `queries/types.ts`.
- `src/db/mutations/` — write functions (`editions`, `events`, `generalAlerts`, `users`, `invitations`). Multi-step writes run in `db.transaction`. Ordered lists use a **two-pass, collision-safe position reorder** (positions have a `(parent, position)` UNIQUE + `position >= 0` CHECK; see `generalAlerts.ts`/`events.ts`). Guards that protect invariants (e.g. last-admin protection, invite single-use) live **in the mutation transaction**, returning a discriminated result the route maps to an HTTP status — never UI-only.
- `src/db/migrations/` — drizzle-kit output (`NNNN_name.sql` + `meta/`). `drizzle.config.ts` points `schema` at `schema/index.ts`, `out` at `migrations/`, dialect `postgresql`.
- `src/db/seed/` — `index.ts` upserts editions+events from `src/fixtures/events-20NN.tsx` (idempotent `onConflictDoUpdate` + trailing prune of orphan child rows; **not** a wipe). `admin.ts` seeds the first admin. `normalizeTime.ts` helper.

### Public read path

- `/` → `(public)/page.tsx` (server): selects the latest `isPublished` edition and `redirect()`s to `/{year}`.
- `/[year]` → `(public)/[year]/page.tsx` (`'use client'`): fetches `/api/editions/[year]` (edition + published general alerts) and `/api/editions/[year]/events` (event summaries), maps the DTOs into the existing `Event` render type (`summaryToEvent`), then renders the same presentational components as before — `EventCategoryView` → `EventList`, `GeneralAlertsBanner`, `EventsRecap`, page-level Instagram embeds, and `EventsMap`. A missing edition throws `EditionNotFoundError`, surfaced via a flag → `notFound()` during render. Header text comes from `src/app/HeaderContext.tsx`, not from importing a fixture.
- Public API routes (`api/editions`, `api/editions/[year]`, `api/editions/[year]/events`, `api/events/[eventId]`) are unauthenticated reads; they only return **published** content.

### Auth (`src/auth/`, BetterAuth)

- `config.ts` — BetterAuth server instance: email+password, **`disableSignUp: true` (no public signup)**, `additionalFields` for `firstName`/`lastName`/`role` (role `input:false`), UUID id generation, Resend-backed `sendResetPassword`, `nextCookies()`. Mounted at `api/auth/[...all]`.
- `roles.ts` — `userRoles = ['admin','editor','viewer']`, `Role`, `roleSchema`, `isRole`, `DEFAULT_ROLE`. Mirrored by a CHECK on `user.role`.
- `apiGuard.ts` — `authorizeApi(allowedRoles?)` → `{ session, response }` (401 no session / 403 wrong role) for API routes. `helpers.ts` — `getSession`/`requireSession`/`requireRole(...roles)` (redirecting) for server components.
- `createUser.ts` — `createUserWithCredentials(...)` creates a user + credential account via BetterAuth's internal adapter (bypassing disabled signup). Used by the admin seed, the admin "create user" route, and invite acceptance.
- `client.ts` — browser `authClient` (`signIn`/`signOut`/`requestPasswordReset`/`resetPassword`). `email.ts` — Resend senders (`sendResetPasswordEmail`, `sendInvitationEmail`). `inviteToken.ts` — `generateInviteToken`/`hashInviteToken` (only the SHA-256 hash is stored; the raw token lives only in the email link).

**Accounts are created three ways, never self-serve:** the env seed (`db:seed:admin`), an admin's direct "create user" form, or **invitation** — an admin invites by email+role, the invitee opens a 24h single-use `/invite/[token]` link, sets name+password, and is created + logged in. See `docs/superpowers/specs/2026-05-31-invite-users-design.md`.

### Admin backoffice (`src/app/admin/`)

- `layout.tsx` wraps everything in `QueryProvider` (TanStack Query) + `AdminShell` (sidebar nav in `AdminShell/navItems.ts`). `requireRole`/page-level guards redirect unauthenticated → `/login`, unauthorized → `/admin`.
- One folder per section (`editions/`, `events/`, `alerts/`, `users/`), each following the same shape: a **Manager** (client, owns dialog state + TanStack queries), a **Table** (rows + inline actions), and **FormDialog**(s). `events/` is larger (atomic form with `LinksSection`/`EmbedsSection`/`AlertsSection`, `TagsInput`, `SortableList`/`SortableRow` drag-reorder, `EventEditLoader`). `components/admin/ConfirmDialog.tsx` is the shared destructive-action confirm.
- Client data access goes through `src/hooks/admin/*` (`useEditions`, `useAdminEvents`, `useAdminAlerts`, `useAdminUsers`, `useAdminInvitations`) — thin TanStack Query wrappers (`['admin', <entity>]` keys, broad invalidation on mutate, server `message` surfaced to `sonner` toasts).
- Writes go to `api/admin/*` routes, all guarded by `authorizeApi([...])` and validated with Zod schemas in `src/validation/*` (`edition`, `event`, `generalAlert`, `user`, `invitation`; zod v4 — `z.email()`, `z.uuid()`). Standard error envelope `{ error, message?, issues? }`; `console.error` on 500s.

**Role permissions:** `admin` manages everything (editions, users, general alerts, invitations). `editor` manages content (events) and can read; `viewer` is read-only. General-alert and user/invitation writes are **admin-only** (enforced server-side via `authorizeApi(['admin'])`).

### Event data model

`src/types/Event.ts` remains the **public render contract** — the `[year]` page maps event-summary DTOs into it. Note it has grown DB-era fields (`hasDescription`, `linkCount`, etc.) used to decide what to fetch/expand. Categories are constrained by `src/types/eventCategories.ts` (canonical sort order; an unknown category sorts to the top via `indexOf === -1`, so **add neighborhoods there**). `status` (`'canceled'|'postponed'|'rescheduled'`) renders as a colored French badge with `dark:` counterparts. Event **embeds** are structured data (`{ type: 'instagram'|'facebook', url }`), not JSX, and render after the description.

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

Components are typed as `React.FC<Props>`, default-exported, prop interfaces named `<Name>Props` above the component. Type-only imports use `import type { ... }` (`@typescript-eslint/consistent-type-imports`). API routes and db/auth modules use the analogous `/* Framework imports */ /* Module imports (project) */ /* Type imports */` banner.

### Styling stack

- **Tailwind CSS v4** — CSS-first config in `src/app/globals.css` `@theme` blocks, `@tailwindcss/postcss`, source auto-detected.
- **shadcn/ui (`new-york`, `neutral` base)** under `src/components/ui/` — plain `.tsx` we own; edit freely. The full registry (~46 components) was installed up-front; a growing subset is wired in (alert, button, collapsible, dropdown-menu, separator, dialog, select, input, label, switch, badge, textarea, table, …).
- **Theme tokens** are CSS variables (`--background`, `--foreground`, `--primary`, `--muted-foreground`, …). Use `text-muted-foreground`, `bg-card`, `border-border`, `text-destructive` etc. — do NOT use raw color names like `text-zinc-700`. Dark mode via `next-themes` (`attribute="class"`); toggle in `src/components/ThemeToggle/ThemeToggle.tsx`.
- **Icons** are `lucide-react`. **Markdown** content renders via `src/components/DescriptionRender/` (react-markdown + remark-gfm), used for event descriptions and alert content. Custom in-content element defaults live in a `@layer components` block scoped by `.event-description`.

### Social media embeds

Instagram/Facebook embeds are owned in-tree under `src/components/embeds/`:

- `InstagramEmbed` / `FacebookEmbed` (public exports from `embeds/index.ts`) take a `url` (`FacebookEmbed` also `type: 'post'|'video'`); width is fluid up to a CSS `maxWidth` cap (540px IG, 750px FB), a per-instance prop — there is **no** per-`EventEmbedLink` width override by design.
- `<CustomEmbed type url maxWidth />` (`src/components/CustomEmbed/`) is a thin dispatcher; currently unused (kept for data-driven callers). The `[year]` page dispatches embeds inline.
- Meta SDK scripts load lazily once per page via `src/hooks/useSocialEmbedScript.ts`, gated on `src/hooks/useInViewport.ts`. No consent gating — wire a CMP into the embed components alongside the viewport check if one is introduced.
- Fluid iframe overrides in `src/components/embeds/embeds.css` (imported via `globals.css`).

### Path aliases

`tsconfig.json` maps `*` → `./src/*`. Import by alias, not `../../../`:

```ts
import { db } from 'db';
import { events } from 'db/schema';
import { authorizeApi } from 'auth/apiGuard';
import { listEditionEvents } from 'db/queries/listEditionEvents';
import { useAdminEvents } from 'hooks/admin/useAdminEvents';
import { eventSchema } from 'validation/event';
import EventCategoryView from 'components/EventCategoryView/EventCategoryView';
import type { Event } from 'types/Event';
import { events as seed2024 } from 'fixtures/events-2024'; // seeds only
```

## ESLint — non-obvious rules you'll trip over

`eslint.config.mjs` (flat config, ESLint 9) layers `js.configs.recommended`, `typescript-eslint` `recommendedTypeChecked`, `eslint-config-next/core-web-vitals`, `eslint-plugin-react/recommended`, `eslint-plugin-react-hooks/recommended`, and `eslint-plugin-promise/recommended`. The rules that actually matter:

- **2-space indent**, **Unix line endings**, **always-multiline trailing commas** (incl. imports/exports), **single quotes in JS**, **double quotes in JSX**, **semicolons required**.
- `@typescript-eslint/strict-boolean-expressions` is **error** — no `if(maybeString)`; write `if(maybeString !== undefined && maybeString.length > 0)`. Copy the existing pattern.
- `@typescript-eslint/explicit-function-return-type` is **warn** — annotate return types on non-trivial arrow functions, including handlers (`(): void => { ... }`). Note `toast.*` returns a value, so wrap toast calls in a block-body void arrow.
- `keyword-spacing` override: **no space after `if`/`switch`/`for`/`while`/`catch`** (`if(x)`, not `if (x)`). Unusual but consistent. (`async(` follows the same no-space style across the repo.)
- `prefer-template` — no `+` string concatenation.
- `promise/always-return` + `promise/catch-or-return` (`allowFinally`) — every chain must `.catch()`/`.finally()` and every `then` returns. See `EventsMap.tsx`.
- `react-hooks/set-state-in-effect` (eslint-plugin-react-hooks v7) — flags synchronous `setState` in `useEffect`; disable per-line where the pattern is correct (e.g. `EventsMap.tsx`, the alerts/users managers' initial-selection effects).
- `@typescript-eslint/no-unnecessary-type-assertion` — text-backed enum columns (`role`, `status`, alert `variant` via `enums.ts`) select as `string`, so casting them to a literal union (`as Role`) is **required** and not flagged; don't drop those.
- **shadcn-generated code is exempt** from several strict rules under `src/components/ui/`, `src/lib/`, `src/hooks/use-mobile.ts`. Don't "fix" the relaxations.

**ESLint is pinned to v9, not v10** (v10's scope-manager breaks `eslint-plugin-react`/`eslint-config-next`). The codebase still follows the old `.eslintrc` conventions (one prop per line, one expression per line, multi-import wrapping) even where the rules no longer enforce them.

When in doubt, run `pnpm lint-fix` and mirror a neighbouring file.

> Note: a stray git worktree under `.claude/worktrees/.../.next/` can make `eslint .` report errors in build artifacts that are not yours. Verify your changes with `pnpm tsc:ci` and `pnpm exec eslint src/...` (scoped to source) if `pnpm lint` is noisy.

## Common tasks

**Managing content (the day-to-day task) is now done in the UI**, not by editing fixtures: log in at `/login` and use `/admin` (editions, events, alerts, users). Local dev needs a seeded admin — set `ADMIN_*` in `.env.local` and run `pnpm db:seed:admin` (then rotate the placeholder password).

**Adding a new festival edition (year):** create it in `/admin/editions` (year + optional description + publish flag), then add its events in `/admin/events`. The public site auto-targets the latest **published** edition; nothing in code needs editing to "switch years". To bulk-import historical data, add an `events-YYYY.tsx` fixture, register it in `src/db/seed/index.ts`, and run `pnpm db:seed`.

**Adding a teammate:** `/admin/users` → "Inviter un utilisateur" (email + role) sends a 24h invite link; or "Nouvel utilisateur" creates one directly with a password. No public signup exists.

**Changing the data model:** edit/add a file in `src/db/schema/`, re-export from `schema/index.ts`, add a Zod schema in `src/validation/`, a query/mutation in `src/db/{queries,mutations}/`, an API route under `src/app/api/`, a hook in `src/hooks/admin/`, and the admin UI — then `pnpm db:generate && pnpm db:migrate`. Mirror an existing vertical slice (alerts is the smallest end-to-end example) and read its spec/plan under `docs/superpowers/`.
