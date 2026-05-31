# Edition Social Embeds Design

**Status:** Approved (design phase)
**Date:** 2026-05-31
**Context:** The public `/[year]` page (`src/app/(public)/[year]/page.tsx`) hardcodes two `<InstagramEmbed>` posts (constant URLs, same for every edition). This feature makes social embeds an **edition-scoped DB model** managed from the backoffice. It is an edition-scoped analog of the existing event-level `eventEmbedLinks`, managed with the same shape as **general alerts (Spec 3c)**.

## 1. Goal & scope

- An **ordered, edition-scoped list of social embeds** (Instagram / Facebook), each `{ platform, url, isPublished, position }`.
- Managed **admin-only** at a new `/admin/embeds` page (edition picker → ordered CRUD list, like `/admin/alerts`).
- Rendered on the public `/[year]` page in **one "Sur les réseaux" section** (after the events recap), in saved order, **published only**.
- The two existing hardcoded Instagram URLs become **2024 seed rows**.

### Out of scope (YAGNI)

- Per-embed captions/titles, per-embed `maxWidth` (the embed components have a `maxWidth` prop but the data model intentionally carries none, matching `eventEmbedLinks`).
- Preserving the old two-location layout (collapsed to one ordered section by decision).
- Embed types beyond Instagram/Facebook (reuse the existing `embedPlatformEnum`).
- Validating that a URL is a real/reachable IG/FB post (format check only).

## 2. Existing infrastructure (reused, not rebuilt)

- `embedPlatformEnum` (`'instagram' | 'facebook'`) in `src/db/schema/enums.ts` — reused as-is.
- `eventEmbedLinks` table (`src/db/schema/eventEmbedLinks.ts`) — structural template (FK + platform + url + position + position-unique + position>=0 check; **no `url` unique** by design).
- `general_alerts` (Spec 3c) — the management template: edition-scoped, admin-only CRUD, `isPublished`, two-pass collision-safe reorder, `/admin/alerts` manager/table/dialog, `useAdminAlerts` hooks, `listEditionAlerts` query.
- Public read: `src/db/queries/getEdition.ts` already returns the edition + published, ordered `generalAlerts`; this feature adds a parallel `embedLinks` array to the same result (so no new public route — `/api/editions/[year]` returns it automatically).
- Render components: `InstagramEmbed` / `FacebookEmbed` (public exports from `src/components/embeds/index.ts`); the lazy Meta-SDK loader (`useSocialEmbedScript`) + viewport gating already handle script loading.
- `authorizeApi(['admin'])`, `requireRole('admin')`, `SortableList`/`SortableRow`, `ConfirmDialog`, `useEditionsQuery`, TanStack Query, shadcn `Select`/`Input`/`Switch`/`Badge`.

## 3. Data model — new `edition_embed_links` table

New `src/db/schema/editionEmbedLinks.ts` (re-exported from `schema/index.ts`); one migration. Mirrors `generalAlerts.ts`.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `defaultRandom()` |
| `editionId` | uuid NOT NULL | FK → `editions.id`, `onDelete: 'cascade'` |
| `platform` | `embedPlatformEnum` NOT NULL | reuse existing enum |
| `url` | text NOT NULL | |
| `isPublished` | boolean NOT NULL | **default `true`** (add-to-show; uncheck to stage) |
| `position` | integer NOT NULL | |
| `createdAt` / `updatedAt` | timestamptz | `defaultNow()` |

Indexes/constraints: `uniqueIndex('edition_embed_links_edition_position_uq')` on `(editionId, position)`; `check('edition_embed_links_position_check', position >= 0)`. **No `(editionId, url)` unique** (the position-keyed seed upsert can transiently collide on URL during reorder — same rationale as `eventEmbedLinks`). Exports `EditionEmbedLinkRow` / `EditionEmbedLinkInsert`.

## 4. Validation — `src/validation/editionEmbed.ts` (zod v4)

```
createEditionEmbedSchema = { editionId: z.uuid(), platform: z.enum(['instagram','facebook']), url: z.url(), isPublished: z.boolean() }
updateEditionEmbedSchema = { platform: z.enum(['instagram','facebook']), url: z.url(), isPublished: z.boolean() }
reorderEmbedsSchema      = { editionId: z.uuid(), orderedIds: z.array(z.uuid()).min(1) }
```
Inferred types `CreateEditionEmbedInput`, `UpdateEditionEmbedInput`, `ReorderEmbedsInput`.

## 5. Server layer (mirrors 3c)

- `src/db/mutations/editionEmbeds.ts` — `createEditionEmbed` (append `MAX(position)+1` in a tx), `updateEditionEmbed`, `deleteEditionEmbed`, `reorderEditionEmbeds` (two-pass: shift into a fresh band above old max, then down to `0..n-1`; validates the id-set matches the edition's embeds, returns false → 400 on mismatch).
- `src/db/queries/admin/listEditionEmbeds.ts` — `listEditionEmbeds(editionId)` → `AdminEditionEmbedDto[]` `{ id, platform, url, isPublished, position }`, ordered by position.
- **Public read** — extend `getEdition` (`src/db/queries/getEdition.ts`): add an `embedLinks` select (`isPublished = true`, ordered by `position`) returning `EmbedLinkDto { id, platform, url }`; add `embedLinks` to `GetEditionResult`. The `/api/editions/[year]` route already returns the whole result, so the client receives `embedLinks` with no route change.

## 6. API routes — admin-only

| Route | Method | Guard | Behavior |
|---|---|---|---|
| `/api/admin/embeds` | GET | `['admin']` | list one edition's embeds (`?editionId=`) → `AdminEditionEmbedDto[]` |
| `/api/admin/embeds` | POST | `['admin']` | validate `createEditionEmbedSchema`; create; 201 |
| `/api/admin/embeds/[id]` | PATCH | `['admin']` | update platform/url/isPublished; 200 / 404 |
| `/api/admin/embeds/[id]` | DELETE | `['admin']` | delete; 200 / 404 |
| `/api/admin/embeds/reorder` | POST | `['admin']` | two-pass reorder; 200 / 400 (id-set mismatch) |

Standard envelope `{ error, message?, issues? }`; `console.error` on 500s. Mirrors the alerts routes exactly (admin-only on every method, including GET — the whole feature is admin-only).

## 7. Admin UI — `src/app/admin/embeds/` (mirrors `/admin/alerts`)

- `page.tsx` — `requireRole('admin')` → `<EmbedsManager />`.
- `EmbedsManager.tsx` — edition picker (`useEditionsQuery`, URL `?edition=` like alerts) + "Nouvel embed" button + `<EmbedsTable>`.
- `EmbedsTable.tsx` — `SortableList` rows: platform `Badge`, the URL (truncated, click-through), publish `Switch` (instant PATCH + toast), Modifier + Supprimer (`ConfirmDialog`).
- `EmbedFormDialog.tsx` — create/edit: platform `Select` (Instagram/Facebook), URL `Input` (`z.url`), publish `Switch`.
- `src/hooks/admin/useAdminEmbeds.ts` — `useEmbedsQuery(editionId)`, `useCreateEmbed`, `useUpdateEmbed`, `useDeleteEmbed`, `useReorderEmbeds` (`['admin','embeds']` key, broad invalidation, server `message` → toast).
- Nav: add an item to `src/app/admin/AdminShell/navItems.ts` — label **"Réseaux"**, route `/admin/embeds`, a lucide icon (e.g. `Instagram` or `Share2`).

## 8. Public render — `/[year]`

- `src/app/(public)/[year]/types.ts` — add `EmbedLinkView { id: string; platform: 'instagram' | 'facebook'; url: string }`; add `embedLinks: EmbedLinkView[]` to the edition fetch payload type.
- `src/components/EditionEmbeds/EditionEmbeds.tsx` — `'use client'`, props `{ embeds: EmbedLinkView[] }`; returns `null` if empty; otherwise a `<section>` titled "Sur les réseaux" mapping each embed to `<InstagramEmbed>` / `<FacebookEmbed>` by `platform`.
- `src/app/(public)/[year]/page.tsx` — `fetchEdition` reads `embedLinks` from the payload into state; **remove both hardcoded `<InstagramEmbed>`**; render `<EditionEmbeds embeds={embedLinks} />` once, after `<EventsRecap>`. Keep the "Cartes des événements" map section but drop the embed currently inside it.

## 9. Fixture / seed

- Add an `embedLinks` array to the **2024** edition seed config in `src/db/seed/index.ts`:
  - `{ platform: 'instagram', url: 'https://www.instagram.com/p/C8bvNYJI_BV/?img_index=1', isPublished: true }`
  - `{ platform: 'instagram', url: 'https://www.instagram.com/p/C8bz_zPIUdX/', isPublished: true }`
- Add an `upsertEditionEmbeds(tx, editionId, list)` seed step: position-keyed upsert (`onConflictDoUpdate` on `(editionId, position)`) + trailing `DELETE WHERE position >= list.length`, exactly like the event-embed seed path. Idempotent. 2023 gets no embeds.

## 10. Verification

No test framework. Verify via `pnpm tsc:ci` + `pnpm lint` + `pnpm build` + curl + browser.

- **Supabase apply (ordered):** `pnpm db:generate` → review the generated `00NN_*.sql` (CREATE TABLE + indexes + check) → `pnpm db:migrate` (applies to Supabase) → `pnpm db:seed` (upserts the 2024 embed rows).
- **curl (admin cookie jar), against `pnpm dev`:**
  - `GET /api/admin/embeds` unauth → 401; with a non-admin cookie → 403.
  - `POST` create (instagram, published) → 201; create invalid url → 400; create (facebook, isPublished:false) → 201.
  - `GET ?editionId=<2024>` → lists the created + seeded rows with positions.
  - `PATCH` toggle publish / change url → 200; bad uuid → 400; missing id → 404.
  - `POST /reorder` reversed order → 200, positions stay contiguous `0..n-1`; mismatched id-set → 400.
  - `DELETE` → 200, repeat → 404.
  - **Public**: `GET /api/editions/2024` → `embedLinks` contains only `isPublished:true` rows in `position` order; the draft (isPublished:false) row is absent.
  - Restore DB (delete test rows) afterward; leave the 2 seeded 2024 embeds.
- **browser**: `/admin/embeds` → pick 2024 → see the 2 seeded embeds → add/reorder/toggle/delete; open `/2024` → the published embeds render in one "Sur les réseaux" section, in order; a draft is hidden; the map section still shows (without an inline embed).

## 11. Rollout

Single plan, subagent-driven. Rough tasks: (1) schema + migration, (2) validation, (3) mutations, (4) admin list query + extend `getEdition` for public, (5) admin routes (GET/POST + [id] + reorder), (6) curl verify, (7) `useAdminEmbeds` hooks, (8) `EmbedFormDialog` + `EmbedsTable`, (9) `EmbedsManager` + page + nav item, (10) public `EditionEmbeds` + wire `[year]/page.tsx` + types, (11) seed fixture + `db:generate`/`migrate`/`seed`, (12) E2E + build.

## 12. Risks

- **Public read regression** — extending `getEdition` touches the live public path; the curl + browser checks confirm events/alerts still load and embeds appear only when published.
- **Seed idempotency** — the position-keyed upsert + trailing prune must not duplicate or wipe unrelated rows; mirror the proven event-embed seed exactly.
- **Embed script loading** — the Meta SDK loader is viewport-gated and loads once per page; multiple embeds in one section already work (the old page had two). No change needed.
- **Naming** — admin route/page is `/admin/embeds` (edition-scoped via the picker); distinct from event embeds, which remain managed inside the event form. Nav label "Réseaux" disambiguates for users.
