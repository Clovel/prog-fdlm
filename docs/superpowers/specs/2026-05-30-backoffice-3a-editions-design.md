# Spec 3a — Backoffice foundation + Editions CRUD

**Status:** approved
**Date:** 2026-05-30
**Scope:** first of four backoffice sub-specs (Spec 3 decomposed). 3a establishes the backoffice architecture — admin shell, write path, role gating, client cache — and proves it end-to-end on the simplest resource, **editions**. Later sub-specs reuse this foundation: 3b events CRUD, 3c general alerts + public banner, 3d user management.

Builds on Spec 1 (data layer) and Spec 2 (BetterAuth), both merged to `main`.

---

## 1. Goals

- Stand up the **admin shell**: a sidebar-nav layout (dashboard + Éditions/Événements/Alertes/Utilisateurs), behind the Spec 2 `/admin` auth guard, with role-gated navigation.
- Establish the **write-path architecture** every sub-spec reuses: admin REST route handlers (`POST`/`PATCH`/`DELETE`) under `/api/admin/...`, guarded by `requireRole`, validated with shared zod schemas, writing via Drizzle.
- Establish the **client data + mutation strategy**: TanStack Query (`useQuery`/`useMutation` + invalidation) against those routes, with `sonner` toasts and shadcn `form`.
- Add an **`isPublished`** flag to editions and wire the public read path to respect it (latest *published* edition for the root redirect; unpublished editions 404 publicly).
- Deliver full **Editions CRUD** (admin-only writes): list, create, edit, publish toggle, delete-with-confirmation.

## 2. Non-goals

- Events CRUD and child link/embed/alert editing — **Spec 3b**. The "Événements" nav item is a placeholder in 3a.
- General alerts CRUD and the public `<GeneralAlertsBanner>` — **Spec 3c**. "Alertes" nav is a placeholder.
- User management (list/create/role/delete) — **Spec 3d**. "Utilisateurs" nav is a placeholder (admin-only visibility).
- "Preview unpublished edition as public", audit logging, bulk actions, edition duplication, optimistic-everything — not now.
- Changing the public site beyond the `isPublished` filter and the root-redirect tweak.

## 3. Decisions captured

| Question | Decision |
| --- | --- |
| Sub-spec decomposition | 3a foundation+editions → 3b events → 3c alerts+banner → 3d users |
| Admin write path | REST API routes under `/api/admin/...` (POST/PATCH/DELETE), client-fetched |
| Client server-state | TanStack Query (`@tanstack/react-query`) |
| Permission matrix | editions + users = admin-only; events + alerts = admin+editor; viewer read-only everywhere |
| Edition publish model | `isPublished` boolean, **default `true`**; public shows latest published, 404s unpublished |
| Year mutability | `year` set at create, immutable afterwards |
| Edition delete | admin-only, behind type-the-year confirmation; cascades to events/alerts |
| Forms | shadcn `form` + react-hook-form + zod (shared client/server schemas) |
| Toasts | `sonner` (already installed) |

## 4. Architecture & stack

- **New dependency:** `@tanstack/react-query` (+ devtools optional, dev-only).
- **Admin writes:** REST route handlers under `src/app/api/admin/...`. Each handler: `requireRole(...)` → zod-parse body → Drizzle write → JSON. Envelope and status codes mirror Spec 1 (`{ data }` / `{ error: 'invalid_request', issues }`; 400 validation, 403 forbidden, 404 not-found, 409 conflict, 500 internal).
- **Admin reads:** new GET routes under `/api/admin/...` that do **not** filter `isPublished` (the backoffice sees everything). Distinct from the public routes.
- **Client:** a `QueryProvider` mounted in the admin layout. Lists/detail via `useQuery`; writes via `useMutation` + `queryClient.invalidateQueries` on success. Loading/error/empty from the hooks. `sonner` toasts for success/error.
- **Forms:** shadcn `form` + `react-hook-form` + `zodResolver`, with zod schemas shared between client form and server route (defined once per resource in `src/validation/`).
- **Role gating:** server routes enforce via `requireRole` (editions writes = `requireRole('admin')`); admin read routes allow any authenticated role. UI hides/disables controls the current role can't use, but the server is the source of truth.

### File layout (3a)

```
src/validation/edition.ts                      ← zod schemas shared client + server
src/db/queries/admin/listAllEditions.ts        ← admin read (incl. unpublished) + counts
src/db/mutations/editions.ts                   ← createEdition / updateEdition / deleteEdition (Drizzle writes)
src/app/api/admin/editions/route.ts            ← GET (list all), POST (create)
src/app/api/admin/editions/[id]/route.ts       ← PATCH (update incl. publish), DELETE
src/app/admin/QueryProvider.tsx                ← TanStack Query provider (client)
src/app/admin/AdminShell/AdminShell.tsx        ← composes sidebar + breadcrumb + topbar
src/app/admin/AdminShell/AdminSidebar.tsx      ← nav (role-gated)
src/app/admin/AdminShell/AdminBreadcrumb.tsx   ← breadcrumb
src/app/admin/layout.tsx                        ← (modify) requireSession + QueryProvider + AdminShell
src/app/admin/page.tsx                          ← (modify) dashboard
src/app/admin/editions/page.tsx                 ← editions list + CRUD UI (client)
src/app/admin/(placeholders)/...                ← "Bientôt disponible" pages for events/alerts/users
src/components/admin/ConfirmDialog.tsx          ← typed-confirmation alert-dialog wrapper (reusable)
src/hooks/admin/useEditions.ts                  ← useQuery/useMutation hooks for editions
```

Public read-path files modified (Spec 1):
```
src/app/(public)/page.tsx                       ← latest *published* edition for the redirect
src/db/queries/listEditions.ts                  ← filter isPublished
src/db/queries/getEdition.ts                    ← 404 if unpublished
src/db/queries/listEditionEvents.ts             ← 404 (return null) if edition unpublished
src/db/queries/getEventDetail.ts                ← 404 if the event's edition is unpublished
```

## 5. Schema change

- Add `editions.isPublished boolean NOT NULL DEFAULT true` (column `is_published`).
- New Drizzle migration `0004_*`. Because the column default is `true`, existing seeded editions (2023, 2024) become published on migrate — the public site keeps showing 2024 with no extra backfill.
- The edition seed (`src/db/seed/index.ts`) sets `isPublished: true` explicitly so re-seeding stays consistent.
- Implication of `default true`: a newly created edition is immediately public (and the root redirect target if it is the latest year). To stage a future edition privately, the admin sets `isPublished: false` at/after creation.

## 6. Public read-path impact (modifying Spec 1)

- **Root redirect** (`src/app/(public)/page.tsx`): query the latest **published** edition — `WHERE is_published = true ORDER BY year DESC LIMIT 1`. None published → existing "no edition" state.
- **`GET /api/editions`**: filter `isPublished = true`.
- **`GET /api/editions/[year]`**: 404 if the edition is unpublished.
- **`GET /api/editions/[year]/events`**: return not-found (404) when the edition is unpublished, so unpublished events aren't reachable by direct URL.
- **`GET /api/events/[eventId]`**: 404 when the event's edition is unpublished.
- Implemented by adding an `is_published` predicate to the Spec 1 query functions. Admin routes deliberately omit the filter.
- **Verification:** after the change, `/` still redirects to `/2024`, `/2024` and `/2023` still 200, and a freshly-created unpublished edition is absent from the public root and 404s at its `/[year]`.

## 7. Admin shell

- **`QueryProvider`** (client): `QueryClientProvider` with a singleton `QueryClient` (`staleTime` ~30s; no retry on 4xx). Mounted in the admin layout below the auth guard.
- **`AdminShell`**: shadcn `sidebar` layout. Left nav: **Tableau de bord**, **Éditions**, **Événements**, **Alertes**, **Utilisateurs**. Top bar: `breadcrumb`, `UserAvatar`, `LogoutButton`. Composed from focused files (`AdminSidebar`, `AdminBreadcrumb`, `AdminShell`).
  - **Role-gated nav:** "Utilisateurs" renders only for `admin`. Content sections render for every authenticated role (viewer sees them read-only).
  - **Placeholders:** Événements / Alertes / Utilisateurs route to a minimal "Bientôt disponible" page until their sub-spec. Only Éditions + dashboard are functional in 3a.
- **`src/app/admin/layout.tsx`** (modify): keep Spec 2 `requireSession()` guard, then render `<QueryProvider><AdminShell user={...}>{children}</AdminShell></QueryProvider>`. Pass the session user (name/email/role) into the shell for the avatar + role-gating.
- **`src/app/admin/page.tsx`** (modify): dashboard with summary `card`s — editions count (published/total), current edition, event/alert counts for the current edition. Lightweight; a landing, not analytics.

## 8. Editions CRUD

### Shared validation (`src/validation/edition.ts`)

- `createEditionSchema`: `year` (int 2000–2100), `description` (string nullable/optional), `dayOfFestival` (ISO date string), `isPublished` (boolean, default `true`).
- `updateEditionSchema`: `description`, `dayOfFestival`, `isPublished` (no `year` — immutable).

### Mutations (`src/db/mutations/editions.ts`)

- `createEdition(input)` — insert; returns the row. Year-uniqueness handled (unique constraint → 409 at the route).
- `updateEdition(id, input)` — update description/day/isPublished; returns the row.
- `deleteEdition(id)` — delete; cascades to events + general_alerts via existing FKs.

### Admin read (`src/db/queries/admin/listAllEditions.ts`)

- All editions (incl. unpublished), `year DESC`, each with event-count + alert-count (for display and the delete-impact message).

### API routes

- `GET /api/admin/editions` — list all (any authenticated role).
- `POST /api/admin/editions` — create (`requireRole('admin')`; 403 otherwise; 409 on year conflict).
- `PATCH /api/admin/editions/[id]` — update incl. publish toggle (`requireRole('admin')`).
- `DELETE /api/admin/editions/[id]` — delete (`requireRole('admin')`).
- All validate with the shared zod schemas; Spec 1 error envelope + status codes.

### UI (`src/app/admin/editions/page.tsx`, client)

- **List:** shadcn `table` — year, festival day, published badge, event/alert counts, actions. `useQuery(['admin','editions'])`.
- **Create / Edit:** shadcn `dialog` + `form` (react-hook-form + zodResolver). `useMutation` → on success `invalidateQueries(['admin','editions'])` + success toast; on error inline field errors / error toast. `year` editable only on create.
- **Publish toggle:** `switch` (row or edit dialog) → `PATCH isPublished`. Optimistic update, rolled back on error.
- **Delete:** shadcn `alert-dialog` (via `ConfirmDialog`) requiring the admin to **type the year**; shows cascade impact ("supprimera N événements et M alertes"). `useMutation` → invalidate + toast.
- **Role gating in UI:** non-admins see a read-only list (create button, row actions, publish toggle hidden/disabled). Server routes enforce regardless.

## 9. Rollout plan

1. Add `@tanstack/react-query`. Add `editions.isPublished` to the schema; `pnpm db:generate` → `0004`; `pnpm db:migrate`. Update the edition seed (`isPublished: true`).
2. Filter the four Spec 1 public queries by `isPublished`; 404 unpublished on the public routes. Verify the public site (root → /2024, /2023 200) still works.
3. `src/validation/edition.ts`, `src/db/mutations/editions.ts`, `src/db/queries/admin/listAllEditions.ts`.
4. Admin API routes (GET/POST/PATCH/DELETE) with `requireRole` + zod. Curl-verify each + role rejection (viewer/editor POST → 403; create/edit/delete happy paths; 409 on dup year).
5. `QueryProvider` + `AdminShell` (sidebar/breadcrumb/topbar) + dashboard; placeholders for Événements/Alertes/Utilisateurs.
6. Editions list + create/edit dialog + publish toggle + typed-confirm delete; `useEditions` hooks; `ConfirmDialog`.
7. `pnpm tsc:ci`, `pnpm lint`, `pnpm build` clean. Manual pass: admin logs in → Éditions → create/edit/publish/delete; confirm a created-unpublished edition is hidden from the public root and 404s at its `/[year]`; confirm a non-admin sees the read-only list and a non-admin write is 403.

## 10. Risk register

- **Public regression from the `isPublished` filter** (highest attention): touches working Spec 1 query code. Mitigated by step-2 verification — `/` → `/2024`, `/2024` and `/2023` still 200.
- **Destructive edition delete**: typed-year confirmation + cascade-impact message; server route admin-only.
- **TanStack Query hydration**: admin pages are client-rendered under the provider; no RSC streaming of query state in 3a (kept simple).
- **Seed re-run publishing editions**: intended (`isPublished: true`); documented in the seed.
- **Role-gating drift between UI and server**: UI hiding is cosmetic; the `requireRole` server guard is authoritative and curl-tested.

## 11. What lands in later sub-specs (informational)

- **3b — Events CRUD:** full event form + repeatable child sections (links/embeds/alerts) with position reordering (the Strategy-B position-swap pattern from Spec 1). Reuses 3a's shell, write path, TanStack Query, ConfirmDialog.
- **3c — General alerts CRUD + public banner:** edition-scoped alert management + `<GeneralAlertsBanner>` on `/[year]`.
- **3d — User management:** list/create (reusing `createUserWithCredentials` from Spec 2)/change-role/delete; admin-only; replaces the "Utilisateurs" placeholder. Note (from Spec 2 review): the `/admin` root layout must not call `requireRole` with a restrictive set — `requireRole` redirects to `/admin`, so a too-narrow gate there would loop. Per-section gating belongs on the section routes/pages, not the root admin layout.
