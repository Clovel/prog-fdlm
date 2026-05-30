# Spec 3c — Backoffice General Alerts CRUD + public banner

**Status:** approved
**Date:** 2026-05-30
**Scope:** third of four backoffice sub-specs. 3c adds admin CRUD for edition-scoped **general alerts** (the `general_alerts` table, empty until now) and replaces the Spec-1 bullet-list placeholder on the public `/[year]` page with a styled `<GeneralAlertsBanner>`. Builds on Specs 1, 2, 3a (foundation+editions), 3b (events) — all merged. Last sub-spec is 3d (user management).

---

## 1. Goals

- Admin **General Alerts CRUD** at `/admin/alerts`, edition-scoped via a picker (default latest), replacing the 3a placeholder.
- Per-row management (like editions): create/edit in a dialog, per-row `isPublished` toggle, delete, and **drag-to-reorder** rows (reusing 3b's `SortableList`) persisting `position`.
- A public **`<GeneralAlertsBanner>`** on `/[year]` rendering published alerts as shadcn `<Alert>` banners (variant + optional title + markdown content), replacing the Spec-1 bullet-list placeholder.
- Writes **admin-only**; editor + viewer may view the admin list read-only.

## 2. Non-goals

- User management — **3d**.
- Time-windowed alerts (auto show/hide by date), per-alert dismiss / "seen" memory, site-wide (non-edition) alerts, scheduling — not now (Spec 1 chose `isPublished` over a time window deliberately).
- Position backfill on delete (gaps are harmless; the public read orders by `position`).
- Any change to the public data path — `getEdition` already returns published alerts ordered by position (Spec 1). Only the rendering placeholder changes.

## 3. Decisions captured

| Question | Decision |
| --- | --- |
| Management model | Per-row CRUD like editions (dialog create/edit, per-row publish Switch, delete) + drag-to-reorder |
| Scope/routing | `/admin/alerts` with an edition `<Select>` (default latest), selection in `?edition=<uuid>` |
| Reorder persistence | Dedicated `POST /api/admin/alerts/reorder`; two-pass offset (collision-safe under `(editionId,position)` UNIQUE + `position>=0` CHECK) |
| Permission | **Alerts writes = admin-only** (editions + alerts + users are admin-only; only events are admin+editor). Editor/viewer view read-only. |
| Banner content | Rendered as **markdown** via the existing `DescriptionRender` (links/emphasis/line breaks) |
| editionId | set on create; immutable on edit |
| isPublished | default `false` (alerts are drafts until published) |
| Variant mapping | DTO union (`default|destructive|warning|success`) == shadcn `<Alert>` variants — no translation layer |

## 4. Architecture, endpoints, file layout

- **Reuses:** `authorizeApi`, TanStack Query + `sonner`, `ConfirmDialog` (no-typing mode from 3b), `SortableList`/`SortableRow` (3b), shadcn `table`/`dialog`/`select`/`switch`/`badge`/`alert`, `DescriptionRender` (public markdown), the admin shell. **No new dependency.**
- **Permission:** alert write routes call `authorizeApi(['admin'])`; admin read route calls `authorizeApi()` (any authenticated role).

### Admin endpoints (separate from public; never filter `isPublished`)

- `GET /api/admin/alerts?editionId=<uuid>` — list one edition's alerts (incl. unpublished), `position ASC`. Any auth role.
- `POST /api/admin/alerts` — create (body: variant/title/content/isPublished + editionId; appended at `max(position)+1`). admin.
- `PATCH /api/admin/alerts/[id]` — update (incl. publish toggle). admin.
- `DELETE /api/admin/alerts/[id]` — delete. admin.
- `POST /api/admin/alerts/reorder` — body `{ editionId, orderedIds: string[] }`; persists positions. admin.

Error envelope + status codes mirror Spec 1 / 3a-b: 400 `invalid_request` (+ `issues`), 401/403 from the guard, 404 `not_found`, 500 `internal_error`.

### File layout

```
src/validation/generalAlert.ts                   ← zod: create/update/reorder schemas (shared client+server)
src/db/queries/admin/listEditionAlerts.ts        ← all alerts for an edition (no publish filter), position ASC
src/db/mutations/generalAlerts.ts                ← create / update / delete / reorder (two-pass, collision-safe)
src/app/api/admin/alerts/route.ts                ← GET (list), POST (create)
src/app/api/admin/alerts/[id]/route.ts           ← PATCH, DELETE
src/app/api/admin/alerts/reorder/route.ts        ← POST (reorder)
src/hooks/admin/useAdminAlerts.ts                ← query + mutation hooks
src/app/admin/alerts/page.tsx                    ← list route (server: resolves role) → AlertsManager (replaces placeholder)
src/app/admin/alerts/AlertsManager.tsx           ← edition picker + table + "Nouvelle alerte"
src/app/admin/alerts/AlertsTable.tsx             ← DnD-reorderable rows: variant badge, title/content, publish Switch, edit/delete
src/app/admin/alerts/AlertFormDialog.tsx         ← create/edit dialog
src/components/GeneralAlertsBanner/GeneralAlertsBanner.tsx   ← public banner (shadcn Alert list)
```

### Public wiring (modify)

`src/app/(public)/[year]/page.tsx` — replace the Spec-1 bullet-list placeholder (`generalAlerts.map(...)` `<ul>`) with `<GeneralAlertsBanner alerts={generalAlerts} />`. The `generalAlerts` state + the `getEdition` fetch are unchanged. `GeneralAlertView` (`{ id, variant, title, content, position }`) already exists in `[year]/types.ts`.

## 5. Validation & mutations

### Shared zod (`src/validation/generalAlert.ts`)

- `generalAlertCoreSchema`: `variant: z.enum(['default','destructive','warning','success'])`, `title: z.string().trim().max(200).optional()`, `content: z.string().trim().min(1).max(2000)`, `isPublished: z.boolean()`.
- `createGeneralAlertSchema` = core + `editionId: z.uuid()`.
- `updateGeneralAlertSchema` = core (no editionId — immutable).
- `reorderAlertsSchema` = `{ editionId: z.uuid(), orderedIds: z.array(z.uuid()).min(1) }`.
- Exported inferred types `CreateGeneralAlertInput` / `UpdateGeneralAlertInput` / `ReorderAlertsInput`.
- (Use the zod v4 idioms already adopted in `validation/event.ts`: `z.uuid()` etc.)

### Mutations (`src/db/mutations/generalAlerts.ts`)

- `createGeneralAlert(input): GeneralAlertRow` — `position = COALESCE(MAX(position),-1)+1` for the edition (append), insert, return row.
- `updateGeneralAlert(id, input): GeneralAlertRow | null` — update variant/title/content/isPublished + `updatedAt`; return row or null.
- `deleteGeneralAlert(id): boolean` — delete; return boolean. No position backfill (gaps harmless).
- `reorderGeneralAlerts(editionId, orderedIds): boolean` — in **one transaction, two passes** (the `(editionId,position)` UNIQUE + `position >= 0` CHECK forbid negative temporaries):
  1. `base = MAX(position)+1` for the edition; set each `orderedIds[i]` to `position = base + i` (a fresh band above the old max — unique, no collision with existing rows).
  2. Set each `orderedIds[i]` to `position = i` (0..n-1). The not-yet-updated rows remain in the high band (≥ base > n-1), so no collision during the pass.
  - First validate that `orderedIds` is exactly the set of the edition's alert ids (else return false → 400), to avoid partial reorders. Touches only `position`.

## 6. Admin read query

- **`listEditionAlerts(editionId): AdminAlertDto[]`** — all alerts for the edition (no publish filter), `position ASC`. Fields: `id, variant, title, content, isPublished, position`.

## 7. Admin UI

### List (`/admin/alerts` → `AlertsManager`)

- `page.tsx` (server): `requireSession`, `canManage = role === 'admin'`, render `AlertsManager`.
- `AlertsManager` (client): edition `<Select>` (options from the admin editions query; default latest; selection mirrored in `?edition=<uuid>`). "Nouvelle alerte" button (admin) opens the create dialog. Alerts table via `useQuery(['admin','alerts',editionId])`. Loading/error/empty states.
- `AlertsTable`: alerts as **DnD-reorderable rows** (`SortableList`, admin only; viewer/editor get a static list). Each row: drag handle, `variant` colored `Badge`, `title` (bold) + truncated `content` preview, **publish `Switch`** (instant optimistic `PATCH isPublished`), Modifier / Supprimer. On drag end → `POST /reorder` with new ordered ids → invalidate. Non-admins: no switch/actions/drag; a published/draft badge instead.

### Create / edit (`AlertFormDialog`)

shadcn `dialog` + react-hook-form + `zodResolver`: `variant` `<Select>` (Info/Avertissement/Erreur/Succès → default/warning/destructive/success), `title` (optional), `content` (`Textarea`, markdown), `isPublished` `<Switch>`. Create → `POST` (append); edit → `PATCH`. Success → invalidate `['admin','alerts',editionId]` + toast + close; errors → field errors / toast.

### Delete

`ConfirmDialog` no-typing mode ("Supprimer cette alerte ?") → `DELETE` → invalidate + toast.

### Hooks (`useAdminAlerts`)

`useAlertsQuery(editionId)`, `useCreateAlert`, `useUpdateAlert`, `useDeleteAlert`, `useReorderAlerts`; all invalidate `['admin','alerts',editionId]` on success. The publish toggle uses optimistic update + rollback (like the editions publish switch).

## 8. Public `<GeneralAlertsBanner>`

`src/components/GeneralAlertsBanner/GeneralAlertsBanner.tsx`:
- Props `alerts: GeneralAlertView[]` (already fetched, published, position-ordered from `getEdition`).
- Renders nothing when empty.
- Else a stack of shadcn `<Alert variant={alert.variant}>`, each with an optional `<AlertTitle>` (when `title` present) and an `<AlertDescription>` rendering `content` via `DescriptionRender` (markdown). A lucide icon per variant (`Info` / `TriangleAlert` / `CircleAlert` / `CircleCheck`) for visual weight, per shadcn's Alert-with-icon convention.
- Placed at the top of the page content (where the placeholder sits, above the event categories), full-width within the page container.

**Wiring:** in `src/app/(public)/[year]/page.tsx`, remove the inline `<ul>` placeholder and render `<GeneralAlertsBanner alerts={generalAlerts} />`. State + fetch unchanged. Variant union already matches shadcn `<Alert>` variants — no mapping layer.

## 9. Rollout plan

1. `src/validation/generalAlert.ts`.
2. `src/db/mutations/generalAlerts.ts` (incl. two-pass reorder) + `src/db/queries/admin/listEditionAlerts.ts`.
3. Admin API routes: `/api/admin/alerts` (GET+POST), `/api/admin/alerts/[id]` (PATCH+DELETE), `/api/admin/alerts/reorder` (POST) — writes `authorizeApi(['admin'])`. Curl-verify: GET 401 unauth / 200 authed; POST 201 / 400 invalid; PATCH publish 200; reorder 200 with positions persisted (re-read confirms order, no collision); DELETE 200 / 404.
4. `useAdminAlerts` hooks; `AlertFormDialog`; `AlertsTable` (DnD + publish switch); `AlertsManager`; `alerts/page.tsx` replacing the placeholder.
5. `GeneralAlertsBanner` + wire into `/[year]` (remove the bullet list).
6. `pnpm tsc:ci`, `pnpm lint`, `pnpm build` clean. Manual/curl pass: as admin, create 2 alerts on the current edition (1 published, 1 draft), reorder them, toggle publish; confirm public `/[year]` shows only published alert(s) as styled `<Alert>` banners in position order with markdown rendered, and the draft is absent; delete an alert.

## 10. Risk register

- **Reorder collision** vs `(editionId,position)` UNIQUE + `position >= 0` CHECK — mitigated by the two-pass offset (§5), curl-verified by reordering then re-reading positions.
- **Public regression** on `/[year]` — swaps a placeholder for a component using the same data; verified the page renders and an unpublished alert stays hidden.
- **Variant mismatch** — none; DTO union == shadcn Alert variants.
- **Admin-only enforcement** — server `authorizeApi(['admin'])` authoritative; UI hiding cosmetic; curl-tested (a 403 for editor/viewer is code-present; full editor/viewer test in 3d).
- **Public cache lag** — admin changes surface publicly after the existing 60s `s-maxage` TTL (immediate in dev); same as 3a-b.

## 11. What lands in 3d (informational)

- **User management:** list / create (reusing `createUserWithCredentials` from Spec 2) / change role / delete; admin-only; replaces the Utilisateurs placeholder. Also enables creating a real editor + viewer to end-to-end test the role gating across events (admin+editor) and editions/alerts/users (admin-only).
