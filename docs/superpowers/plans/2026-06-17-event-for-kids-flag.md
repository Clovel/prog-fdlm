# Event `forKids` flag + public filter — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a boolean `forKids` flag to events; on the public agenda these events are hidden by default with a filter toggle to show them, and shown kids-events carry a « Jeune public » badge.

**Architecture:** A single nullable-free boolean column on `events` plumbed through the existing write path (Zod `coreShape` → mutation → admin form → MCP, which all derive from one schema) and read path (DB query → DTO → view → render `Event`). Public filtering stays client-side in `applyEventFilters`, mirroring the existing `hidePast` "active-by-default" toggle.

**Tech Stack:** Next.js App Router, React 19, Drizzle ORM (postgres-js), Zod v4, react-hook-form, TanStack Query, shadcn/ui, Tailwind v4.

## Global Constraints

- pnpm pinned to `pnpm@9.15.9` — never bump; never add `pnpm-workspace.yaml`.
- Node `>=24 <25`.
- **No test framework exists.** Verification = `pnpm tsc:ci`, `pnpm lint` (scope with `pnpm exec eslint src/...` if the root run is noisy from `.next` worktree artifacts), `pnpm build`, plus `curl` against `pnpm dev` and visual checks. There are no unit tests to write; each task's "verify" steps are the gates.
- ESLint rules that bite: 2-space indent, single quotes in JS / double in JSX, semicolons, always-multiline trailing commas, `@typescript-eslint/strict-boolean-expressions` (no truthy checks on non-booleans — compare explicitly, e.g. `event.forKids === true`), `explicit-function-return-type` on non-trivial arrows, no space after `if`/`for`/`while`/`catch`. Mirror neighbouring code; run `pnpm lint-fix` when unsure.
- Migrations hit the real Supabase DB. Review generated SQL before `pnpm db:migrate`.
- French UI copy. Label: **« Événement jeune public »** (admin), filter **« Afficher les événements jeune public »** (public), badge **« Jeune public »**.
- Spec: `docs/superpowers/specs/2026-06-17-event-for-kids-flag-design.md`.

---

## Task 0: Branch

The repo starts on `main` (the default branch) with unrelated uncommitted work (the collapsible-categories feature) already in the tree. Isolate this feature.

- [ ] **Step 1: Create and switch to a feature branch**

```bash
git checkout -b feat/event-for-kids
```

- [ ] **Step 2: Confirm the working tree**

Run: `git status`
Expected: on `feat/event-for-kids`; the pre-existing modified files (`EditionAgenda.tsx`, `EventCategoryView.tsx`, `eventCategories.ts`, `EventListItem.tsx`) are present but are NOT part of this feature — leave them untouched and do not stage them in this plan's commits.

---

## Task 1: Schema column + migration

**Files:**
- Modify: `src/db/schema/events.ts`
- Create: `src/db/migrations/NNNN_*.sql` (drizzle-kit output)

**Interfaces:**
- Produces: `events.forKids` (Drizzle column, TS type `boolean`) selectable as `events.forKids`; DB column `for_kids boolean NOT NULL DEFAULT false`.

- [ ] **Step 1: Import `boolean` and add the column**

`boolean` is NOT currently imported in `events.ts`. Add it to the `drizzle-orm/pg-core` import, then add the column after `formattedAddress` (line 45), before `createdAt`.

Import block becomes:

```ts
import {
  pgTable,
  uuid,
  text,
  boolean,
  doublePrecision,
  timestamp,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';
```

New column line (insert after `formattedAddress: text('formatted_address'),`):

```ts
    forKids: boolean('for_kids').notNull().default(false),
```

- [ ] **Step 2: Verify types compile**

Run: `pnpm tsc:ci`
Expected: no errors (the column exists; nothing consumes it yet).

- [ ] **Step 3: Generate the migration**

Run: `pnpm db:generate`
Expected: a new `src/db/migrations/NNNN_*.sql` file is created.

- [ ] **Step 4: Review the generated SQL**

Run: `git diff --stat src/db/migrations && cat src/db/migrations/*_*.sql | tail -20`
Expected: the new migration contains exactly:

```sql
ALTER TABLE "events" ADD COLUMN "for_kids" boolean DEFAULT false NOT NULL;
```

If it contains anything else (dropped indexes, unrelated columns), STOP — the schema drifted; do not migrate.

- [ ] **Step 5: Apply the migration to Supabase**

Run: `pnpm db:migrate`
Expected: applies the one migration; existing rows backfill to `false` via the column default.

- [ ] **Step 6: Commit**

```bash
git add src/db/schema/events.ts src/db/migrations
git commit -m "feat(events): add for_kids column"
```

---

## Task 2: Write path (validation + mutation + admin form + MCP)

**Files:**
- Modify: `src/validation/event.ts:31-46` (`coreShape`)
- Modify: `src/db/mutations/events.ts:47-59` (`coreValues`)
- Modify: `src/db/queries/admin/getEventForEdit.ts` (`AdminEventDetail` + return)
- Modify: `src/app/admin/events/EventForm.tsx` (Switch + `shared` object)
- Modify: `src/app/admin/events/EventEditLoader.tsx:24-41` (`toFormValues`)
- Modify: `src/app/admin/events/new/page.tsx:18-35` (`blankValues`)

**Interfaces:**
- Consumes: `events.forKids` from Task 1.
- Produces: `forKids: boolean` on `CreateEventInput` / `UpdateEventInput` / `EventFormValues` (via `coreShape`), and on `AdminEventDetail`. Because the MCP tool schemas (`src/mcp/tools.ts`) and the OpenAPI write bodies derive from `createEventObject.shape` / `updateEventObject.shape`, they pick `forKids` up automatically — no change there.

- [ ] **Step 1: Add `forKids` to the shared validation shape**

In `src/validation/event.ts`, add to `coreShape` (after `alerts:`, line 45):

```ts
  forKids: z.boolean().default(false),
```

- [ ] **Step 2: Persist `forKids` in the mutation**

In `src/db/mutations/events.ts`, add to the object returned by `coreValues` (after `endTime:`, line 58):

```ts
  forKids: input.forKids,
```

- [ ] **Step 3: Expose `forKids` from the admin edit query**

In `src/db/queries/admin/getEventForEdit.ts`:
- Add to the `AdminEventDetail` interface (after `longitude: number | null;`, line 21):

```ts
  forKids: boolean;
```

- Add to the returned object (after `longitude: ev.longitude,`, line 57):

```ts
    forKids: ev.forKids,
```

- [ ] **Step 4: Add the Switch to the admin form and the submit payload**

In `src/app/admin/events/EventForm.tsx`:
- Add the `Switch` import in the component-imports block (after the `Label` import, line 13):

```ts
import { Switch } from 'components/ui/switch';
```

- Add `forKids` to the `shared` object in `onSubmit` (after `alerts: values.alerts,`, line 90):

```ts
      forKids: values.forKids,
```

- Add the Switch UI row immediately after the price field's closing `</div>` (after line 236, before the Genres block). Uses the `Controller` already imported:

```tsx
      <div className="flex items-center gap-3">
        <Controller
          control={form.control}
          name="forKids"
          render={({ field }): React.ReactElement => (
            <Switch
              id="forKids"
              checked={field.value ?? false}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <Label htmlFor="forKids">Événement jeune public</Label>
      </div>
```

- [ ] **Step 5: Seed `forKids` into the edit form's initial values**

In `src/app/admin/events/EventEditLoader.tsx`, add to `toFormValues` (after `longitude: d.longitude ?? undefined,`, line 35):

```ts
  forKids: d.forKids,
```

- [ ] **Step 6: Seed `forKids` into the new-event blank values**

In `src/app/admin/events/new/page.tsx`, add to `blankValues` (after `longitude: undefined,`, line 29):

```ts
  forKids: false,
```

- [ ] **Step 7: Verify types and lint**

Run: `pnpm tsc:ci && pnpm exec eslint src/validation/event.ts src/db/mutations/events.ts src/db/queries/admin/getEventForEdit.ts src/app/admin/events/EventForm.tsx src/app/admin/events/EventEditLoader.tsx src/app/admin/events/new/page.tsx`
Expected: no errors.

- [ ] **Step 8: Runtime check (admin create/edit round-trips the flag)**

Start `pnpm dev`. Log in at `/login`, go to `/admin/events`, create or edit an event, toggle « Événement jeune public » on, save. Re-open the event for edit.
Expected: the switch is ON after reload (the value persisted and re-loaded through `getEventForEdit` → `toFormValues`). Optionally confirm in `pnpm db:studio` that `for_kids = true` for that row.

- [ ] **Step 9: Commit**

```bash
git add src/validation/event.ts src/db/mutations/events.ts src/db/queries/admin/getEventForEdit.ts src/app/admin/events
git commit -m "feat(events): forKids in validation, mutation, and admin form"
```

---

## Task 3: Read path (DTOs, queries, render type, mapper, OpenAPI)

**Files:**
- Modify: `src/db/queries/types.ts` (`EventSummaryDto`, `EventWithDetailDto`)
- Modify: `src/app/(public)/[year]/types.ts` (`EventSummaryView`, `EventWithDetailView`)
- Modify: `src/db/queries/listEditionEvents.ts` (select + map)
- Modify: `src/db/queries/listEditionEventsWithDetail.ts` (select + map)
- Modify: `src/types/Event.ts` (`Event`)
- Modify: `src/app/(public)/[year]/EditionAgenda.tsx:52-78` (`dtoToEvent`)
- Modify: `src/app/api/openapi.json/route.ts:40-57` (`eventSummaryDto`)

**Interfaces:**
- Consumes: `events.forKids` (Task 1).
- Produces: `forKids: boolean` on `EventSummaryDto`, `EventWithDetailDto`, `EventSummaryView`, `EventWithDetailView`; `forKids?: boolean` on the render `Event`; populated by both list queries and mapped in `dtoToEvent`. Consumed by Tasks 4 and 5.

Note: `EventDetailDto` (the description-only partial at `types.ts:56`) does NOT get `forKids` — it carries no summary fields. Only the consolidated `EventWithDetailDto` (used by `/events/full`, the page's data source) does.

- [ ] **Step 1: Add `forKids` to the DTO types**

In `src/db/queries/types.ts`:
- `EventSummaryDto` (after `favoriteCount: number;`, line 45):

```ts
  forKids: boolean;
```

- `EventWithDetailDto` (after `favoriteCount: number;`, line 91):

```ts
  forKids: boolean;
```

- [ ] **Step 2: Add `forKids` to the view types**

In `src/app/(public)/[year]/types.ts`:
- `EventSummaryView` (after `favoriteCount: number;`, line 40):

```ts
  forKids: boolean;
```

- `EventWithDetailView` (after `favoriteCount: number;`, line 69):

```ts
  forKids: boolean;
```

- [ ] **Step 3: Select and map `forKids` in the summary query**

In `src/db/queries/listEditionEvents.ts`:
- Add to the `.select({...})` (after `hasDescription: hasDescriptionSql,`, line 130):

```ts
      forKids: events.forKids,
```

- Add to the mapped summary object (after `favoriteCount: row.favoriteCount,`, line 169):

```ts
      forKids: row.forKids,
```

- [ ] **Step 4: Select and map `forKids` in the full-detail query**

In `src/db/queries/listEditionEventsWithDetail.ts`:
- Add to the `.select({...})` for `eventRows` (after `description: events.description,`, line 50):

```ts
      forKids: events.forKids,
```

- Add to the returned `EventWithDetailDto` object (after `favoriteCount: row.favoriteCount,`, line 123):

```ts
      forKids: row.forKids,
```

- [ ] **Step 5: Add `forKids` to the render `Event` type**

In `src/types/Event.ts`, add to the `Event` interface (after `favoriteCount?: number;`, line 53):

```ts
  /** True when the event is meant for children; hidden by default on the public agenda. */
  forKids?: boolean;
```

- [ ] **Step 6: Map `forKids` in `dtoToEvent`**

In `src/app/(public)/[year]/EditionAgenda.tsx`, add to the object returned by `dtoToEvent` (after `favoriteCount: dto.favoriteCount,`, line 68):

```ts
  forKids: dto.forKids,
```

- [ ] **Step 7: Document `forKids` on the public summary API**

In `src/app/api/openapi.json/route.ts`, add to `eventSummaryDto` (after `favoriteCount: z.number().int(),`, line 56):

```ts
  forKids: z.boolean(),
```

- [ ] **Step 8: Verify types and lint**

Run: `pnpm tsc:ci && pnpm exec eslint src/db/queries/types.ts "src/app/(public)/[year]/types.ts" src/db/queries/listEditionEvents.ts src/db/queries/listEditionEventsWithDetail.ts src/types/Event.ts "src/app/(public)/[year]/EditionAgenda.tsx" src/app/api/openapi.json/route.ts`
Expected: no errors.

- [ ] **Step 9: Runtime check (field flows to the API)**

With `pnpm dev` running and an edition published (e.g. 2026), and at least one event flagged `forKids` from Task 2:

Run: `curl -s http://localhost:3000/api/editions/2026/events/full | jq '.events[] | {name, forKids}' | head`
Expected: each event has a `forKids` boolean; the flagged one shows `true`.

- [ ] **Step 10: Commit**

```bash
git add src/db/queries/types.ts "src/app/(public)/[year]/types.ts" src/db/queries/listEditionEvents.ts src/db/queries/listEditionEventsWithDetail.ts src/types/Event.ts "src/app/(public)/[year]/EditionAgenda.tsx" src/app/api/openapi.json/route.ts
git commit -m "feat(events): plumb forKids through read path and public API"
```

---

## Task 4: Public filter (hidden by default, toggle to show)

**Files:**
- Modify: `src/helpers/applyEventFilters.ts` (`FilterState`, `DEFAULT_FILTERS`, `eventMatchesFilters`, `countActiveFilters`, `isDefaultFilters`)
- Modify: `src/components/EditionEventsFilterTool/EditionEventsFilterTool.tsx` (Switch row)

**Interfaces:**
- Consumes: `Event.forKids` (Task 3). `EditionEventsFilterTool` already receives `filters: FilterState` and an `onChange(next: FilterState)` prop (used by the existing `dayOnly`/`hidePast` switches at lines 174-199).
- Produces: `FilterState.showForKids: boolean` (default `false`). No signature changes to `useEditionFilters` — it already returns/threads `FilterState` wholesale.

- [ ] **Step 1: Extend the filter state and its default**

In `src/helpers/applyEventFilters.ts`:
- Add to the `FilterState` interface (after `hidePast: boolean;`, line 14):

```ts
  showForKids: boolean;
```

- Add to `DEFAULT_FILTERS` return (after `hidePast: true,`, line 25):

```ts
  showForKids: false,
```

- [ ] **Step 2: Hide kids-events in the predicate**

In `eventMatchesFilters`, add before the final `return true;` (after the search block, line 102):

```ts
  if(!filters.showForKids && event.forKids === true) {
    return false;
  }
```

- [ ] **Step 3: Count the hide as an active (narrowing) filter**

In `countActiveFilters` (lines 162-165), add the `showForKids` term so the body reads:

```ts
export const countActiveFilters = (filters: FilterState): number =>
  (filters.dayOnly ? 1 : 0) +
  (filters.hidePast ? 1 : 0) +
  (!filters.showForKids ? 1 : 0) +
  (filters.search.trim().length > 0 ? 1 : 0);
```

(Hiding kids-events narrows the list, exactly like `hidePast`, so it counts toward the "Filtres & tri" badge — this raises the default badge count by 1, as agreed in the spec.)

- [ ] **Step 4: Include `showForKids` in the default-state check**

In `isDefaultFilters` (lines 174-180), add the comparison so the returned expression includes:

```ts
    filters.showForKids === defaultFilters.showForKids &&
```

Place it alongside the other comparisons (e.g. after the `filters.hidePast === defaultFilters.hidePast &&` line).

- [ ] **Step 5: Add the toggle to the filter dialog**

In `src/components/EditionEventsFilterTool/EditionEventsFilterTool.tsx`, add a third switch row inside the "Affichage" block, immediately after the `hide-past` row's closing `</div>` (after line 200, before the block's closing `</div>` at line 201):

```tsx
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="filter-show-for-kids" className="flex flex-col items-start gap-0.5">
                  <span>Afficher les événements jeune public</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    Masqués par défaut
                  </span>
                </Label>
                <Switch
                  id="filter-show-for-kids"
                  checked={filters.showForKids}
                  onCheckedChange={
                    (checked: boolean): void => {
                      onChange({ ...filters, showForKids: checked });
                    }
                  }
                />
              </div>
```

- [ ] **Step 6: Verify types and lint**

Run: `pnpm tsc:ci && pnpm exec eslint src/helpers/applyEventFilters.ts src/components/EditionEventsFilterTool/EditionEventsFilterTool.tsx`
Expected: no errors.

- [ ] **Step 7: Runtime check (default hidden + toggle reveals)**

With `pnpm dev` and a published edition holding at least one `forKids` event: load `/2026`.
Expected: the kids-event is absent from its borough and from the counts. Open « Filtres & tri », enable « Afficher les événements jeune public » → the event appears and counts increase. The filter badge shows the kids filter as active when off.

- [ ] **Step 8: Commit**

```bash
git add src/helpers/applyEventFilters.ts src/components/EditionEventsFilterTool/EditionEventsFilterTool.tsx
git commit -m "feat(agenda): hide forKids events by default with a filter toggle"
```

---

## Task 5: « Jeune public » badge

**Files:**
- Modify: `src/components/EventTitleBlock/EventTitleBlock.tsx`

**Interfaces:**
- Consumes: `Event.forKids` (Task 3). Uses the shadcn `Badge` from `components/ui/badge`.

- [ ] **Step 1: Import `Badge`**

In `src/components/EventTitleBlock/EventTitleBlock.tsx`, fill the empty component-imports banner (line 8) with:

```ts
import { Badge } from 'components/ui/badge';
```

- [ ] **Step 2: Render the badge for kids-events**

Inside the first `<div className="text-lg font-medium">`, after the closing of the `postponed` status block (after line 48, before the `</div>` at line 49), add:

```tsx
        {
          event.forKids === true &&
            <Badge variant="secondary" className="ml-2 align-middle">
              Jeune public
            </Badge>
        }
```

- [ ] **Step 3: Verify types and lint**

Run: `pnpm tsc:ci && pnpm exec eslint src/components/EventTitleBlock/EventTitleBlock.tsx`
Expected: no errors.

- [ ] **Step 4: Visual check**

With `pnpm dev`, on `/2026` enable the kids filter (Task 4). Each kids-event title shows a « Jeune public » badge; non-kids events show none. Check both light and dark mode.

- [ ] **Step 5: Commit**

```bash
git add src/components/EventTitleBlock/EventTitleBlock.tsx
git commit -m "feat(agenda): mark forKids events with a Jeune public badge"
```

---

## Task 6: Seed mapping

**Files:**
- Modify: `src/db/seed/index.ts:207-241` (insert `.values` + `onConflictDoUpdate` `set`)

**Interfaces:**
- Consumes: `events.forKids` (Task 1) and the optional `Event.forKids` (Task 3) on fixtures. Fixtures need no edits — `forKids` is optional and absent fixtures default to `false`.

- [ ] **Step 1: Map `forKids` on insert**

In `src/db/seed/index.ts`, add to the insert `.values({...})` (after `locationAddress: fixtureEvent.location.addressStr ?? null,`, line 218):

```ts
      forKids: fixtureEvent.forKids ?? false,
```

- [ ] **Step 2: Map `forKids` on conflict-update**

Add to the `onConflictDoUpdate` `set: {...}` (after `locationAddress: fixtureEvent.location.addressStr ?? null,`, line 235):

```ts
        forKids: fixtureEvent.forKids ?? false,
```

- [ ] **Step 3: Verify types and lint**

Run: `pnpm tsc:ci && pnpm exec eslint src/db/seed/index.ts`
Expected: no errors.

- [ ] **Step 4: Full build gate**

Run: `pnpm build`
Expected: a clean production build (catches any route-module / type regression across all tasks).

- [ ] **Step 5: Commit**

```bash
git add src/db/seed/index.ts
git commit -m "feat(seed): map forKids when upserting fixture events"
```

(`pnpm db:seed` is optional and hits the real Supabase DB; run it only deliberately. Existing fixtures upsert `for_kids = false`, which is a no-op against the column default.)

---

## Task 7: Post-implementation manual data migration (after merge + deploy)

**Not code.** This is the final operational step, performed once the branch is merged, deployed, and the Task 1 migration is live on Supabase. It curates which *existing* events are kids events. It is deliberately NOT scripted into `src/db/seed/` or `src/db/migrations/`.

- [ ] **Step 1: Identify the kids events**

Review the live agenda / event list and decide which existing events are genuinely for children (e.g. via `/admin/events`, or the MCP read tools `list_events`).

- [ ] **Step 2: Flag them — choose one path**

Either (per event, audited) via the admin UI / MCP admin tool:

```
mcp__fdlm-admin__update_event  →  { id: "<event-uuid>", forKids: true, ...other required fields }
```

(`update_event` replaces the event; include the event's existing fields, only changing `forKids`.)

Or, for a known set of IDs, a one-off SQL statement against Supabase:

```sql
UPDATE events SET for_kids = true WHERE id IN ('<uuid-1>', '<uuid-2>', '...');
```

- [ ] **Step 3: Verify on the live site**

On the production agenda, the flagged events are hidden by default and appear (with the « Jeune public » badge) once the filter is toggled on.

---

## Self-Review

**Spec coverage:**
- Data model & migration → Task 1. ✅
- Write path (validation/mutation/admin form, MCP auto) → Task 2. ✅ (MCP + write OpenAPI auto-derive from `coreShape`/`createEventObject`.)
- Read path (summary + full DTO/view, render type, mapper) → Task 3. ✅ (plus summary-API OpenAPI doc, which is hand-maintained.)
- Public filter (state, default false, predicate, count, isDefault, dialog switch) → Task 4. ✅
- Visual marker (shadcn Badge) → Task 5. ✅
- Fixtures/seed → Task 6. ✅
- Post-implementation manual data migration → Task 7. ✅

**Placeholder scan:** No TBD/TODO; every code step shows the exact snippet and insertion point. ✅

**Type consistency:** `forKids: boolean` is the column/DTO/view type; `Event.forKids?: boolean` is optional in the render type, so the filter predicate (`event.forKids === true`) and badge (`event.forKids === true`) handle `undefined` safely. `coreShape`'s `z.boolean().default(false)` yields a required `boolean` on the inferred input/output used by mutation (`input.forKids`) and form (`values.forKids`). `getEventForEdit` returns `forKids: boolean`, consumed by `toFormValues` as `d.forKids`. Names match across tasks (`forKids` everywhere in TS, `for_kids` only in SQL/column). ✅

**Scope:** Single vertical slice, one published-edition feature; appropriately sized for one plan. ✅
