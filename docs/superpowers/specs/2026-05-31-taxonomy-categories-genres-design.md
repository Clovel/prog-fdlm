# Categories & Genres as first-class models

**Date:** 2026-05-31
**Status:** Design — pending implementation plan
**Series:** Backoffice 3 (follows 3b-events, 3c-alerts, 3d-users)

## Problem

`category` and `genre` are currently inline, untyped values on the event model:

- **`events.category`** is a single-valued Postgres enum (`event_category`), its variants
  hardcoded in `src/types/eventCategories.ts`. That same const array is the runtime source of
  truth for the **public page's category ordering** (`orderEventsByCategory.ts` → `indexOf`),
  with uncategorized events bucketed under a virtual `"Autres"` rendered last.
- **`events.genres`** is a denormalized `text[]` column, edited as free-text chips
  (`TagsInput`) and filtered with `genres @> ARRAY[...]`.

Neither can be managed without a code change + redeploy, free-text genres drift
(`"Techno"` vs `"techno"`), and editors can't introduce a needed value mid-festival.

## Goal

Promote both to first-class, **globally-shared** models with their own tables, seeded from the
existing fixtures. Editors can create values **on the fly** from the event form; admins get a
dedicated management surface to fix mistakes (rename, delete, reorder, merge). The values drive
**suggestions** in the event form's select inputs.

## Decisions (settled during brainstorming)

| Question | Decision |
| --- | --- |
| Genre storage | **Full normalization** — `genres` table + `event_genres` junction (M:N). |
| Category ordering | **`position` column** on `categories`, admin-reorderable; new ones append before `"Autres"`. |
| On-the-fly creation | **Eager** — typing an unmatched value POSTs a find-or-create endpoint, then selects the returned id. |
| Scope | **Global** — one shared set across all editions. |
| Management page | **Admin-only**; editors keep on-the-fly creation but cannot rename/delete/reorder/merge. |
| Rename collision | **Merges** — renaming a tag onto an existing name folds the source into the target. |

Unchanged assumptions: category stays **single-valued** per event; `"Autres"` stays a **virtual
bucket** (a `NULL` `category_id`, never a real row); uncategorized events remain allowed.
`artists` stays a free-text `text[]` (out of scope).

## Data model

### `categories` (new, global)

| column | type | notes |
| --- | --- | --- |
| `id` | `uuid` pk default random | |
| `name` | `text not null` | unique index on `lower(name)` (case-insensitive) |
| `position` | `integer not null` | ascending = earlier on public page; `check (position >= 0)` |
| `created_at` / `updated_at` | `timestamptz not null default now()` | |

### `genres` (new, global)

| column | type | notes |
| --- | --- | --- |
| `id` | `uuid` pk default random | |
| `name` | `text not null` | unique index on `lower(name)` |
| `created_at` / `updated_at` | `timestamptz not null default now()` | |

No `position` — genres are not globally ordered.

### `events` (changed)

- **Drop** `category` (`event_category` enum column) → **add** `category_id uuid REFERENCES
  categories(id) ON DELETE SET NULL`. `NULL` = the virtual `"Autres"` bucket. Replace the
  `events_edition_category_idx` index with `(edition_id, category_id)`.
- **Drop** `genres text[]`.

### `event_genres` (new junction)

| column | type | notes |
| --- | --- | --- |
| `event_id` | `uuid not null REFERENCES events(id) ON DELETE CASCADE` | |
| `genre_id` | `uuid not null REFERENCES genres(id) ON DELETE CASCADE` | |
| `position` | `integer not null` | preserves per-event genre display order; `check (position >= 0)` |

PK `(event_id, genre_id)`; unique index `(event_id, position)`. Mirrors the existing
position-keyed pattern in `event_links` / `event_embed_links` / `event_alerts`.

### Enum / const cleanup

The `event_category` pgEnum is dropped from `schema/enums.ts`. `src/types/eventCategories.ts`
**survives as seed input only** (initial names + canonical positions); it is no longer imported
by runtime code. A header comment will state this.

## Migration + backfill

`drizzle-kit generate` only diffs structure, so the generated migration is **hand-augmented**
with ordered backfill SQL (the repo already ships custom SQL migrations):

1. Create `categories`, `genres`, `event_genres` (+ indexes/constraints).
2. Seed `categories`: insert one row per name in `eventCategories` with its array index as
   `position`. Then append any category value present in `events.category` data but absent from
   the array (defensive; positions continue after the array length).
3. Add `events.category_id`; backfill
   `UPDATE events SET category_id = c.id FROM categories c WHERE c.name = events.category::text`.
4. Seed `genres`: `INSERT INTO genres(name) SELECT DISTINCT unnest(genres) FROM events ...`
   (skip empties).
5. Populate `event_genres` from the old array with ordinality:
   `INSERT ... SELECT e.id, g.id, ord - 1 FROM events e, unnest(e.genres) WITH ORDINALITY AS u(name, ord) JOIN genres g ON lower(g.name) = lower(u.name)`.
6. Drop `events.category` and `events.genres` columns; drop the `event_category` enum type;
   swap the category index.

Verified locally with `pnpm db:reset` against the 2023 + 2024 fixtures (drop → migrate → seed).

## Seed rewrite (`src/db/seed/index.ts`)

- Before events: upsert `categories` from `eventCategories` (name + position), and pre-create
  `genres` for the distinct set found across all fixtures.
- Per fixture event: resolve `categoryId` by name (find-or-create), resolve `genreIds`
  (find-or-create each), set the FK and write `event_genres` rows (`position = index`). Reuses
  the existing position-keyed upsert + trailing-delete strategy. Re-seeding stays idempotent.

## Validation (`src/validation/`)

- **`event.ts`:** `category` enum field → `categoryId: z.string().uuid().nullable().optional()`;
  `genres: string[]` → `genreIds: z.array(z.string().uuid()).default([])`. Form and API schemas
  both updated.
- **New `taxonomy.ts`** (or `category.ts` + `genre.ts`): `nameSchema` (trimmed, 1–100 chars);
  `reorderSchema { ids: z.array(uuid) }`; `mergeSchema { sourceId: uuid, targetId: uuid }`.

## API routes

All under `/api/admin/`. `GET` + create are **admin + editor** (the combobox + on-the-fly path);
all mutations that can destroy/alter shared data are **admin only**.

### Categories
| route | method | role | behavior |
| --- | --- | --- | --- |
| `/api/admin/categories` | GET | admin+editor | list, ordered by `position` |
| `/api/admin/categories` | POST | admin+editor | **find-or-create** by `lower(name)`; returns the row |
| `/api/admin/categories/[id]` | PATCH | admin | rename — **merges on name collision** (see below) |
| `/api/admin/categories/[id]` | DELETE | admin | delete; referencing events fall back to `"Autres"` via `SET NULL` |
| `/api/admin/categories/reorder` | POST | admin | persist new `position` order from `{ ids }` |

### Genres
| route | method | role | behavior |
| --- | --- | --- | --- |
| `/api/admin/genres` | GET | admin+editor | list (alphabetical) |
| `/api/admin/genres` | POST | admin+editor | **find-or-create** by `lower(name)` |
| `/api/admin/genres/[id]` | PATCH | admin | rename — **merges on name collision** |
| `/api/admin/genres/[id]` | DELETE | admin | delete; `event_genres` rows cascade away |
| `/api/admin/genres/merge` | POST | admin | explicit merge `{ sourceId, targetId }` |

### Merge semantics (shared)

Renaming a tag normalizes the new name. If no **other** row owns that name
(case-insensitively), it is a plain `UPDATE`. If another row already owns it, the source
**merges into** that target:

- **Categories:** `UPDATE events SET category_id = target WHERE category_id = source`, then delete
  the source. Target keeps its own `position`.
- **Genres:** reassign `event_genres` from source → target, **deduped** so an event never links the
  same genre twice (skip rows where the event already links the target; renumber `position`
  contiguously), then delete the source.

The explicit genre `merge` endpoint runs the same genre-merge logic for two arbitrary ids without
a rename. Categories rely on rename-collision (the set is small).

## Read queries

- **`listEditionEvents` (public)** + **`listEditionEventsAdmin`:** `LEFT JOIN categories` for
  `name` + `position`; aggregate genres via a correlated `array_agg(... ORDER BY position)` over
  `event_genres`/`genres` so the DTO still exposes `genres: string[]`. The genre **filter**
  (`genres @> ARRAY[...]`) becomes an `EXISTS` over the junction joined to `genres` by name.
  The summary DTO gains `categoryPosition: number | null` (category name stays as today).
  > Watch the correlated-`array_agg` subquery for the unqualified-column pitfall recorded in
  > memory (`drizzle-correlated-count-qualification`) — qualify every column in raw `sql`.
- **`getEventForEdit` (admin):** return `categoryId` and `genreIds` (plus names for display).

## Public-page ordering

- `EventSummaryView` (`src/app/(public)/[year]/types.ts`) gains `categoryPosition: number | null`;
  `summaryToEvent` threads it onto the `Event`.
- `orderEventsByCategory.ts` stops importing `eventCategories` / calling `indexOf`. It sorts
  category groups by the `position` carried on the events (a group's position = its events'
  shared category position), `NULL`/`"Autres"` last. `reduceEventsByCategory` (grouping by name
  string) is unchanged.
- This requires `Event` to carry the category position. Add an optional `categoryPosition?: number`
  to the view-side `Event` shape (it is a display concern; the fixtures don't set it).

## Admin event form (`src/app/admin/events/`)

- New reusable **`CreatableCombobox`** (single) and **`CreatableMultiCombobox`** built from the
  existing `ui/command` + `ui/popover` + `ui/badge`. Typing an unmatched value surfaces a
  "Créer « X »" action that POSTs the find-or-create endpoint and selects the returned id.
  Suggestions come from cached TanStack queries.
- `EventForm`: replace the hardcoded category `<Select>` with the single combobox (value =
  `categoryId`, with a "—" clear option); replace the genres `TagsInput` with the multi combobox
  (value = `genreIds`). `TagsInput` stays for `artists`.
- New hooks in `src/hooks/admin/`: `useCategories` (list + create + admin mutations) and
  `useGenres` (list + create + merge + admin mutations), following `useAdminEvents` conventions.

## Admin-only management pages

Two pages under `AdminShell`, route-guarded to **admin** and hidden from the editor nav:

- **`/admin/categories`** — list ordered by `position`, **drag-to-reorder** (reuse the existing
  `SortableList` / `SortableRow` from `admin/events`), inline add, rename (dialog), delete with a
  usage-count warning (events revert to `"Autres"`).
- **`/admin/genres`** — list, add, rename, delete (usage warning), and **merge** (pick source →
  target) to consolidate duplicates.

Editors never see these pages; their only entry point is on-the-fly creation in the event form.

## Out of scope

- `artists` normalization (stays `text[]`).
- Per-edition taxonomy (decided: global).
- Coordinates / map changes.

## Files touched (overview)

- **Schema:** `schema/categories.ts`, `schema/genres.ts`, `schema/eventGenres.ts` (new);
  `schema/events.ts`, `schema/enums.ts`, `schema/relations.ts`, `schema/index.ts` (edited).
- **Migration:** one new hand-augmented SQL migration + meta.
- **Seed:** `db/seed/index.ts`.
- **Validation:** `validation/event.ts`, new `validation/taxonomy.ts`.
- **Queries:** `queries/listEditionEvents.ts`, `queries/admin/listEditionEventsAdmin.ts`,
  `queries/admin/getEventForEdit.ts`, new list queries for categories/genres.
- **Mutations:** new `mutations/categories.ts`, `mutations/genres.ts`; `mutations/events.ts`
  (FK + junction writes).
- **API:** new routes under `api/admin/categories/**` and `api/admin/genres/**`;
  `api/admin/events` create/update payload shape.
- **Hooks:** `hooks/admin/useCategories.ts`, `hooks/admin/useGenres.ts`.
- **Form:** new `CreatableCombobox` / `CreatableMultiCombobox`, edited `EventForm`.
- **Admin pages:** `app/admin/categories/**`, `app/admin/genres/**`, `AdminShell` nav.
- **Public:** `app/(public)/[year]/page.tsx` + `types.ts`, `helpers/orderEventsByCategory.ts`,
  view-side `Event` type.
- **Const:** `types/eventCategories.ts` (demoted to seed-only, comment added).
