# French date/time pickers for the admin forms — design

**Date:** 2026-06-16
**Status:** Approved (design); pending implementation plan
**Branch:** feat/edition-events-filter (independent of that branch's filter work)

## Goal

Replace the native `<input type="datetime-local">` / `<input type="date">` fields in the admin forms — which render in the browser/OS locale (US `mm/dd/yyyy`, AM/PM) and look out of place in the dark theme — with custom French-locale pickers: a Calendar popover for the date plus a 24h time field, styled with the app's shadcn tokens.

## Context — existing mechanisms

- **Event form** (`src/app/admin/events/EventForm.tsx`): two `<Input type="datetime-local" {...register}>` fields (`startTime`, `endTime`) producing/consuming the string `"YYYY-MM-DDTHH:mm"`.
- **Editions form** (`src/app/admin/editions/EditionFormDialog.tsx`): one `<Input type="date" {...register}>` field (`dayOfFestival`) producing/consuming `"YYYY-MM-DD"`.
- **Time conversion** (`src/lib/festivalTime.ts`): `parisInputToUtc(local)` / `toParisInput(date)` treat the `"YYYY-MM-DDTHH:mm"` string as Europe/Paris wall-clock and convert to/from UTC. Called only at form submit / edit-prefill — **not** inside the inputs.
- **Validation**: event form schema regex `/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/` (`src/validation/event.ts`); `endTime` optional (`''` allowed). Edition schema regex `/^\d{4}-\d{2}-\d{2}$/` (`src/validation/edition.ts`).
- **Already installed**: shadcn `Calendar` (react-day-picker v10, `src/components/ui/calendar.tsx` — it spreads `...props` to `DayPicker`, so `locale`/`weekStartsOn`/`formatters` pass through), `Popover`, `Button`, `Input`; `date-fns` v4 (ships `date-fns/locale` `fr`).

## Design

### Value contract (unchanged)

Each picker is a **controlled component over the exact strings used today**, so `festivalTime`, the zod schemas, the API routes, and the mutations are all untouched:

- `DateTimePicker`: `value: string` is `"YYYY-MM-DDTHH:mm"` or `""`; `onChange(next: string)` emits the same.
- `DatePicker`: `value: string` is `"YYYY-MM-DD"` or `""`; `onChange(next: string)` emits the same.

Inside the pickers the string is treated as **naive wall-clock** — parsed/formatted with date-fns using only year/month/day/hour/minute fields (no timezone math), so there is no drift. The Paris→UTC conversion stays exactly where it is (submit/prefill).

### Components (`src/components/DateTimePicker/`)

**`CalendarPopover`** (internal, shared):
- Props: `date: Date | undefined`, `onSelect: (d: Date | undefined) => void`, `placeholder?: string`, `id?: string`.
- A shadcn `Button` (variant `outline`, full width, left-aligned) as the `PopoverTrigger`. Label = `format(date, 'd MMMM yyyy', { locale: fr })` (e.g. *"16 juin 2026"*) when set, else `placeholder` in `text-muted-foreground`. A `CalendarIcon` (lucide) on the right.
- `PopoverContent` holds `Calendar` with `mode="single"`, `selected={date}`, `onSelect`, `locale={fr}` (→ French names + Monday-first), `captionLayout="label"`.
- Picking a day closes the popover.

**`DatePicker`** (public, for the edition field):
- Props: `value: string`, `onChange: (v: string) => void`, `id?: string`, `placeholder?: string`.
- Parses `value` → `Date | undefined` (split `"YYYY-MM-DD"` into numbers, `new Date(y, m-1, d)`; empty/invalid → `undefined`). Renders `CalendarPopover`. On select: emits `format(d, 'yyyy-MM-dd')`, or `""` when cleared.

**`DateTimePicker`** (public, for the event fields):
- Props: `value: string`, `onChange: (v: string) => void`, `id?: string`, `datePlaceholder?: string`.
- Splits `value` on `'T'` → `datePart` (`"YYYY-MM-DD"` | `''`) and `timePart` (`"HH:mm"` | `''`).
- Layout: `CalendarPopover` (date) + a 24h `<input type="time">` given the shadcn `Input` classes (`className` from `cn(...)`), side by side (`flex gap-2`), the date taking the remaining width.
- **Combine rules:**
  - On date select: `newDate = format(d, 'yyyy-MM-dd')`; `newTime = timePart !== '' ? timePart : '00:00'`; emit `` `${newDate}T${newTime}` ``.
  - On time change: if `datePart !== ''`, emit `` `${datePart}T${e.target.value}` ``; if no date yet, hold the typed time in local state and emit `''` (incomplete) — once a date is picked it combines with the held time. (Keeps the field editable without producing an invalid partial string.)
  - On date clear: emit `''`.
- Empty `value` → empty date label + empty time field. This satisfies the optional `Fin` field; a blank required `Début` still triggers the existing "Début requis" zod error.

### Wiring

- **`EventForm.tsx`**: replace each `<Input type="datetime-local" {...form.register('startTime')}>` / `endTime` with a `Controller` (the file already uses `Controller` for category/status/genres):
  ```tsx
  <Controller control={form.control} name="startTime"
    render={({ field }): React.ReactElement => (
      <DateTimePicker id="startTime" value={field.value} onChange={field.onChange} />
    )} />
  ```
  Same for `endTime` (its `field.value` may be `''`/`undefined` → coerce to `''`). The surrounding labels and the existing error `<p>` blocks stay.
- **`EditionFormDialog.tsx`**: replace the `dayOfFestival` `<Input type="date">` with a `Controller`-wrapped `DatePicker` (`value={field.value}`, `onChange={field.onChange}`). Labels/error block unchanged.

### Styling

Dark-theme shadcn tokens throughout (`border-input`, `bg-popover`, `text-muted-foreground`, etc.). The `<input type="time">` reuses the shadcn `Input` component (or its class string) so it sits flush with the date button at equal height. Mobile-first: the date button and time field wrap/stack gracefully on narrow widths.

## Error handling

- Pickers only ever emit a valid full string or `""`; all validation stays in zod (unchanged messages).
- Parsing guards: a malformed incoming `value` yields `undefined` date / empty time rather than throwing.
- The native time popup chrome remains browser-native (accepted trade-off); the field itself is 24h under `fr` and styled to match.

## Out of scope (YAGNI)

- A custom in-popover time wheel / styled time dropdown (native `<input type="time">` is enough).
- Min/max date constraints, disabled days, or range selection.
- Replacing date inputs elsewhere unless they surface later (only the three known fields are in scope).
- Seconds precision (existing format is minute-resolution).

## Verification

No test framework. Verify with `pnpm tsc:ci`, `pnpm exec eslint <files>`, `pnpm build`, plus a running dev server:
- Event form: date button shows French "16 juin 2026"; calendar is French + Monday-first; time field is 24h. Pick date+time, submit, confirm the stored instant matches Paris wall-clock (unchanged round-trip via `festivalTime`).
- Edit an event: fields pre-fill from the stored value via `toParisInput`.
- Leave `Fin` empty → saves; blank `Début` → "Début requis".
- Editions form: `dayOfFestival` shows the French date picker and round-trips `"YYYY-MM-DD"`.
