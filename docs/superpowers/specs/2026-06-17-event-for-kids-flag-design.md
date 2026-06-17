# Event `forKids` flag + public filter — design

**Date:** 2026-06-17
**Status:** Approved, pending implementation plan

## Goal

Add a boolean `forKids` property to events, indicating an event is meant for
children. On the public agenda these events are **filtered out by default**; a
visitor can toggle them back on via the existing filter tool. When shown, a
kids-event carries a visual **« Jeune public »** badge.

Scope is deliberately minimal (YAGNI): a static per-event flag plus a
client-side toggle defaulting to hidden. No admin-configurable default, no
per-edition scoping, no server-side filtering.

## Decisions

- **Discoverability:** one more `<Switch>` inside the existing filter dialog —
  no separate hint/banner. Consistent with `dayOnly`/`hidePast`.
- **Visual marker:** a shadcn `Badge` (« Jeune public ») on shown kids-events.
- **Filter badge count:** hiding kids-events is a *narrowing* filter, so it
  counts toward the "Filtres & tri" active badge — exactly like `hidePast`,
  which already counts as active at its `true` default. The baseline badge
  count therefore rises by 1 by default. Accepted as the consistent choice.
- **Filtering layer:** client-side, over the already-fetched flat list, before
  grouping by borough — mirrors all existing filters. The public API still
  returns kids-events; they are hidden in the client predicate.

## Implementation by layer

### 1. Data model & migration
- `src/db/schema/events.ts`: add
  `forKids: boolean('for_kids').notNull().default(false)`, mirroring
  `editions.isPublished`.
- `pnpm db:generate` → review the generated SQL in `src/db/migrations/` →
  `pnpm db:migrate` (applies to Supabase). The `DEFAULT false` backfills every
  existing row; no data step in the migration itself.

### 2. Write path (admin form + MCP — single source)
- `src/validation/event.ts`: add `forKids: z.boolean().default(false)` to
  `coreShape`. This propagates automatically to `eventFormSchema`,
  `createEventObject` / `updateEventObject`, and therefore the MCP
  `create_event` / `update_event` tool input schemas — **no MCP code change.**
- `src/db/mutations/events.ts`: include `forKids` in the create insert and the
  update field set.
- `src/app/admin/events/EventForm.tsx`: a `<Switch>` row labeled
  **« Événement jeune public »**, following the existing boolean-switch
  pattern. `EventEditLoader` maps the persisted value into form defaults.

### 3. Read path (field plumbing)
- `src/db/queries/listEditionEvents.ts`: select `forKids` and map it into the
  summary rows.
- `src/db/queries/types.ts`: add `forKids: boolean` to `EventSummaryDto` (and
  the detail DTO for consistency).
- `src/app/(public)/[year]/types.ts`: add `forKids: boolean` to
  `EventSummaryView` (and the detail view).
- `src/types/Event.ts`: add `forKids?: boolean` to the render `Event` type
  (optional, like `status`), and map it in the DTO→Event mappers in
  `EditionAgenda.tsx`.

### 4. Public filter (`src/helpers/applyEventFilters.ts` + filter tool)
- `FilterState` gains `showForKids: boolean`; `DEFAULT_FILTERS` sets it to
  `false`.
- `eventMatchesFilters`: add
  `if(!filters.showForKids && event.forKids === true) return false;`
- `countActiveFilters`: add `+ (!filters.showForKids ? 1 : 0)`.
- `isDefaultFilters`: add `filters.showForKids === defaultFilters.showForKids`.
- `src/components/EditionEventsFilterTool/EditionEventsFilterTool.tsx`: a
  `<Switch>` **« Afficher les événements jeune public »** alongside the other
  toggles, wired to `showForKids`.

Because filtering runs before grouping, hidden kids-events drop out of borough
counts and `EventsRecap` automatically, and reappear when toggled on.

### 5. Visual marker
- `src/components/EventTitleBlock/EventTitleBlock.tsx`: when
  `event.forKids === true`, render a small shadcn `Badge` (« Jeune public »)
  next to the title. (Existing `status` markers are inline colored `<span>`s;
  the badge is a deliberate, cleaner choice and the component is already wired
  in.)

### 6. Fixtures/seed
- The `Event` fixture type and the seed mapping (`src/db/seed/index.ts`) accept
  an optional `forKids` (default `false`). Existing fixtures need no edits.

## Verification
- `pnpm tsc:ci`, `pnpm lint`, `pnpm build`.
- Review generated SQL before `db:migrate`.
- Runtime (dev server): the filter switch shows/hides kids-events; the
  « Jeune public » badge renders on shown kids-events; borough counts and the
  recap adjust with the toggle.

## Post-implementation data migration (manual, one-time)
After the code is merged and the schema migration is applied, perform a
one-time data pass over **existing** events to set `forKids = true` on the ones
that are genuinely kids events. Done directly against the database via the MCP
admin tools (`update_event`) or Supabase SQL — **not** scripted into
`src/db/seed/` or `src/db/migrations/`. This is the last task, after
implementation and verification.
