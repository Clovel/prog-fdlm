# Spec 3b — Backoffice Events CRUD

**Status:** approved
**Date:** 2026-05-30
**Scope:** second of four backoffice sub-specs. 3b adds full Events CRUD — the largest resource — on the foundation built in 3a (admin shell, `/api/admin/*` write path, `authorizeApi` guard, TanStack Query, `ConfirmDialog`, shadcn forms). Events carry three ordered child lists (links, embed links, alerts) edited inline in one atomic form. Later: 3c general alerts + public banner, 3d user management.

Builds on Spec 1 (data layer), Spec 2 (auth), Spec 3a (foundation + editions), all merged.

---

## 1. Goals

- A backoffice **Events** section at `/admin/events`, scoped to one edition via a picker (default: latest edition), replacing the 3a placeholder.
- **Full Events CRUD** with an **atomic single-page form**: the event's ~12 core fields plus three repeatable child sections (links / embed links / alerts), saved in one transaction.
- **Drag-and-drop reordering** of child rows; submitted order persisted as `position`.
- Correct **Europe/Paris ↔ UTC** handling for `startTime`/`endTime`.
- Writes guarded **admin + editor**; viewer read-only. (First sub-spec where editor write access applies.)

## 2. Non-goals

- General alerts CRUD + public `<GeneralAlertsBanner>` — **3c**.
- User management — **3d** (Utilisateurs nav stays a placeholder).
- Moving an event between editions (`editionId` immutable after create).
- Per-event publish (events inherit their edition's `isPublished` from 3a), geocoding cache, event duplication, bulk actions, draft/autosave, image uploads, cross-edition overview table.
- Changing the public site beyond what already exists (admin writes surface publicly after the existing 60s edge cache TTL).

## 3. Decisions captured

| Question | Decision |
| --- | --- |
| Form model | One atomic full-page form (event core + 3 child sections), single Save in a transaction |
| Child persistence | Replace-on-save: delete-then-reinsert children in submitted order (no position-swap dance) |
| Events scope | `/admin/events` with an edition `<Select>` (default latest), selection in URL `?edition=<uuid>` |
| Form surface | Full-page routes `/admin/events/new` + `/admin/events/[id]` |
| Child reordering | Drag-and-drop via `@dnd-kit` |
| genres/artists input | Chips/tags input (type + Enter), no extra dep beyond input + Badge |
| Permission | events writes = admin + editor; viewer read-only |
| editionId | set on create from the picker; immutable on edit |
| Time inputs | `datetime-local` interpreted as Europe/Paris; converted to UTC for storage |
| description | markdown, edited as a plain Textarea |
| Delete confirm | plain confirm dialog (no typing) — extend `ConfirmDialog` with a no-typing mode |

## 4. Architecture, stack, endpoints

- **Reuses 3a:** `authorizeApi`, TanStack Query + `sonner`, `ConfirmDialog`, shadcn `form`/`dialog`/`select`/`table`/`textarea`/`badge`, the admin shell + role-gated nav.
- **New dependency:** `@dnd-kit/core` + `@dnd-kit/sortable`.
- **Permission:** event write routes call `authorizeApi(['admin', 'editor'])`; admin read routes call `authorizeApi()` (any authenticated role). Editor write access is code-present + curl-tested via the admin session; full editor-user test arrives in 3d.

### Admin endpoints (separate from public; never filter `isPublished`)

- `GET /api/admin/events?editionId=<uuid>` — list one edition's events (summaries + child counts). Any auth role.
- `POST /api/admin/events` — create; body = event core + ordered child arrays + `editionId`. admin+editor.
- `GET /api/admin/events/[id]` — full event + ordered children for the edit form. Any auth role.
- `PATCH /api/admin/events/[id]` — update event core + **replace** children. admin+editor.
- `DELETE /api/admin/events/[id]` — delete (cascades children). admin+editor.

Error envelope + status codes mirror Spec 1 / 3a: 400 `invalid_request` (+ `issues`), 401/403 from the guard, 404 `not_found`, 500 `internal_error`.

### File layout

```
src/validation/event.ts                          ← zod: event core + nested link/embed/alert arrays (shared client+server)
src/lib/festivalTime.ts                          ← toParisInput(Date) / parisInputToUtc(string) datetime-local <-> UTC
src/db/queries/admin/listEditionEventsAdmin.ts   ← all events for an edition (no publish filter) + child counts
src/db/queries/admin/getEventForEdit.ts          ← full event + ordered children (no publish filter)
src/db/mutations/events.ts                       ← createEventWithChildren / updateEventWithChildren / deleteEvent (transaction)
src/app/api/admin/events/route.ts                ← GET (list by edition), POST (create)
src/app/api/admin/events/[id]/route.ts           ← GET (detail), PATCH (update+replace), DELETE
src/hooks/admin/useAdminEvents.ts                ← query + mutation hooks
src/app/admin/events/page.tsx                    ← list route (server: resolves role) → EventsManager
src/app/admin/events/EventsManager.tsx           ← client island: edition picker + table + "Nouvel événement" + filter
src/app/admin/events/new/page.tsx                ← create form route
src/app/admin/events/[id]/page.tsx               ← edit form route (loads the event)
src/app/admin/events/EventForm.tsx               ← the atomic form (core + sections)
src/app/admin/events/sections/LinksSection.tsx
src/app/admin/events/sections/EmbedsSection.tsx
src/app/admin/events/sections/AlertsSection.tsx
src/app/admin/events/SortableRow.tsx             ← @dnd-kit sortable row wrapper
src/app/admin/events/TagsInput.tsx               ← chips input for genres/artists
src/components/admin/ConfirmDialog.tsx           ← (modify) add optional no-typing mode
```

## 5. Validation & datetime handling

### Shared zod (`src/validation/event.ts`)

One schema tree, used by the client form (`zodResolver`) and re-validated server-side:

- `eventLinkSchema`: `{ url: z.string().url(), label: z.string().trim().min(1).max(200) }`
- `eventEmbedLinkSchema`: `{ platform: z.enum(['instagram', 'facebook']), url: z.string().url() }`
- `eventAlertSchema`: `{ variant: z.enum(['default', 'destructive', 'warning', 'success']), title: z.string().trim().max(200).optional(), content: z.string().trim().min(1).max(2000) }`
- `eventCoreSchema`: `name?`, `description?` (max ~10000), `category?` (enum from `eventCategories`), `status?` (enum `canceled|postponed|rescheduled`), `genres: z.array(z.string().trim().min(1)).default([])`, `artists` (same), `priceText?`, `locationName` (min 1), `locationAddress?`, `startTime` (ISO datetime string), `endTime?` (ISO datetime string), **refine**: `endTime` empty/undefined OR `>= startTime` (mirrors `events_time_check`).
- `createEventSchema` = `eventCoreSchema` + `editionId: z.string().uuid()` + `links: eventLinkSchema[]` + `embedLinks: eventEmbedLinkSchema[]` + `alerts: eventAlertSchema[]`.
- `updateEventSchema` = same minus `editionId`.
- Enum value lists imported from the existing `eventCategories` const + the status/variant/platform unions so they track the DB enums.

### Datetime (`src/lib/festivalTime.ts`)

The festival is in Bordeaux; editors think in Paris local time; the DB stores `timestamptz` (UTC):
- `parisInputToUtc(localValue: string): Date` — interprets a `datetime-local` value (`"2024-06-21T19:00"`, no zone) as Europe/Paris → UTC `Date` (`date-fns-tz` `fromZonedTime`, same approach as the seed's `normalizeToParis`).
- `toParisInput(date: Date): string` — UTC instant → Paris `datetime-local` string for editing (`toZonedTime` + format `yyyy-MM-dd'T'HH:mm`).
- The client performs the Paris↔UTC conversion and submits ISO instants; the server validates + stores them. `endTime` empty → null.

## 6. Mutations (`src/db/mutations/events.ts`)

All correctness-first; child writes always inside a transaction.

- **`createEventWithChildren(input): string`** — `db.transaction`: insert `events` row (core + `editionId`; `legacyId` null), then insert `event_links` / `event_embed_links` / `event_alerts` from the arrays with `position = index`. Returns new event id.
- **`updateEventWithChildren(id, input): string | null`** — `db.transaction`: `UPDATE events SET <core>, updatedAt = NOW()` (return null if no row); then **delete-then-reinsert** each child table (`DELETE WHERE event_id = id`, insert array with `position = index`). Never UPDATEs positions → no `(eventId, position)` UNIQUE collision. Child UUIDs regenerate each save (no external refs). Returns id or null.
- **`deleteEvent(id): boolean`** — `DELETE FROM events WHERE id = $id RETURNING id`; children cascade. Returns boolean.

Rationale: a transaction prevents broken half-saves (core saved, a child insert failed); delete-then-reinsert is the simplest correct way to persist an arbitrarily reordered/edited child list given the position-uniqueness constraint. ISO instants from the client are stored directly; `events_time_check` is the DB backstop.

## 7. Admin read queries

- **`listEditionEventsAdmin(editionId): AdminEventSummary[]`** — all events for the edition (no publish filter), ordered `startTime ASC, id ASC`, each with `linkCount`/`embedCount`/`alertCount` (count subqueries, same idiom as Spec 1). Fields: id, name, category, status, startTime, endTime, counts.
- **`getEventForEdit(id): AdminEventDetail | null`** — the full event row + ordered child arrays (links/embeds/alerts by `position ASC`), regardless of publish state. Shape matches the form's value type.

## 8. UI

### List (`/admin/events` → `EventsManager`)

- `page.tsx` (server): `requireSession`, derive `canManage = role === 'admin' || role === 'editor'`, render `EventsManager`.
- `EventsManager` (client): edition `<Select>` (options from the admin editions query; default latest; selection mirrored in `?edition=<uuid>`). "Nouvel événement" button (canManage) → `/admin/events/new?edition=<uuid>`. Events `<Table>` via `useQuery(['admin','events',editionId])`: name, start time (Paris), category, status badge, link/embed/alert counts, actions (Modifier → `/admin/events/[id]`, Supprimer). Client-side name filter. Loading/error/empty states. Viewer sees a read-only table (no create/actions).

### Event form (`EventForm`, shared by new + edit)

- One atomic form, react-hook-form + `zodResolver`.
- **Core:** name; description (markdown `Textarea`); category (`Select`); status (`Select` with empty "—"); `TagsInput` for genres + artists; priceText; locationName (required); locationAddress; startTime + endTime (`datetime-local` via `festivalTime`). On edit, UTC times shown as Paris; `editionId` fixed (read-only label).
- **Child sections** (`LinksSection`, `EmbedsSection`, `AlertsSection`), each: react-hook-form `useFieldArray`; rows drag-reorderable via `@dnd-kit/sortable` (`SortableRow` calls the field array's `move()`); "Ajouter" appends; × removes; fields per the zod schemas.
- **Submit:** build payload (Paris→UTC times, child arrays in current order) → `useMutation` POST (new) / PATCH (edit) → success toast + redirect to `/admin/events?edition=<uuid>`; errors → field errors / error toast; submit disabled while pending.

### Delete

- `ConfirmDialog` extended with an optional no-typing mode: when `confirmPhrase` is omitted, the confirm button is always enabled. Event delete uses a plain "Supprimer l'événement « <name> » ?" confirm. On success → invalidate `['admin','events',editionId]` + toast.

### `TagsInput` (`src/app/admin/events/TagsInput.tsx`)

Controlled `string[]`: type + Enter adds a chip (`Badge` + × button), Backspace on empty removes the last, × removes a specific chip.

## 9. Rollout plan

1. Add `@dnd-kit/core` + `@dnd-kit/sortable`.
2. `src/lib/festivalTime.ts` + `src/validation/event.ts`.
3. `src/db/mutations/events.ts` + admin queries (`listEditionEventsAdmin`, `getEventForEdit`).
4. Admin API routes (`/api/admin/events` GET+POST, `/api/admin/events/[id]` GET+PATCH+DELETE) with `authorizeApi(['admin','editor'])` on writes. Curl-verify: GET 401 unauth / 200 authed; POST 201 + validation 400; GET detail 200/404; PATCH 200 (children replaced) / 404; DELETE 200/404.
5. Extend `ConfirmDialog` (no-typing mode); build `TagsInput`, `SortableRow`, the three child sections.
6. `EventForm` + `useAdminEvents` hooks.
7. `EventsManager` list (picker + table + filter) replacing the placeholder; `new` + `[id]` routes.
8. `pnpm tsc:ci`, `pnpm lint`, `pnpm build` clean. Manual/curl pass: create an event with several links/embeds/alerts on the current edition; drag-reorder children and confirm positions persist (re-open the edit form, order preserved); edit core fields; delete; confirm the event renders on public `/[year]` (after cache TTL) with child order matching; round-trip a known time (enter 19:00 Paris → stored UTC → public shows 19:00).

## 10. Risk register

- **Atomic-form complexity** (12 fields + 3 DnD `useFieldArray` sections): mitigated by per-section component split + react-hook-form `useFieldArray`.
- **Timezone correctness** (highest-subtlety): dedicated `festivalTime` helpers mirroring the seed; verification round-trips a known Paris time end to end.
- **@dnd-kit ↔ react-hook-form**: DnD reorder must call field-array `move()`; covered in the manual pass.
- **Replace-children UUID churn**: intentional/documented; no external references.
- **Editor write path untested live** (only admin seeded): code present + curl-tested via admin; full editor test in 3d.
- **Public cache lag**: admin changes surface publicly after the 60s `s-maxage` TTL (immediate in dev) — same as 3a; documented, acceptable.

## 11. What lands in later sub-specs (informational)

- **3c — General alerts CRUD + public banner:** edition-scoped alerts (the `general_alerts` table) + `<GeneralAlertsBanner>` on `/[year]`. Reuses 3b's section/form patterns.
- **3d — User management:** list/create (`createUserWithCredentials`)/role/delete, admin-only; replaces the Utilisateurs placeholder; lets the editor write path (events/alerts) be tested with a real editor user.
