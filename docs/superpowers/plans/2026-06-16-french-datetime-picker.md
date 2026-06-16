# French Date/Time Pickers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the native `datetime-local`/`date` inputs in the event and edition admin forms with French-locale shadcn pickers (Calendar popover + 24h time field) that emit the exact same strings as today.

**Architecture:** Three new components under `src/components/DateTimePicker/` — an internal `CalendarPopover` (shadcn Calendar in a Popover, `fr` locale, Monday-first), a `DatePicker` (date-only, `"YYYY-MM-DD"`), and a `DateTimePicker` (date + native 24h time, `"YYYY-MM-DDTHH:mm"`). They are controlled over the existing string formats, so `lib/festivalTime`, the zod schemas, API routes, and mutations are untouched. They get wired into `EventForm.tsx` (two fields) and `EditionFormDialog.tsx` (one field) via react-hook-form `Controller`.

**Tech Stack:** Next.js App Router, React 19 + react-hook-form, shadcn `Calendar` (react-day-picker v10) / `Popover` / `Button` / `Input`, date-fns v4 (`fr` locale), Tailwind v4.

**Verification note:** This repo has **no test framework**. Per CLAUDE.md, verification = `pnpm tsc:ci`, `pnpm exec eslint <files>` (scope to `src` if `pnpm lint` is noisy from a stray `.next/` worktree), `pnpm build`, plus a running dev server + visual checks. Steps below use those gates, not unit tests.

**STRICT ESLint conventions (mirror existing files):** 2-space indent, single quotes in TS, DOUBLE quotes in JSX attributes, semicolons, always-multiline trailing commas, `if(x)` (no space after `if`), `prefer-template` (no `+` concatenation; numbers in template literals use `.toString()`), annotate arrow return types incl. handlers `(): void =>` and render props `({ field }): React.ReactElement =>`, `import type` for type-only imports, path aliases (`*` → `src/*`), components typed `React.FC<Props>` default-exported with a `<Name>Props` interface above and the comment-banner layout (`/* Framework imports */`, `/* Component imports */`, `/* Module imports (project) */`, `/* Type imports */`, `/* <Name> component prop types */`, `/* <Name> component */`, `/* Export <Name> component */`). `@typescript-eslint/strict-boolean-expressions` is an ERROR — never test a possibly-empty string/undefined for truthiness; use `=== ''` / `!== undefined` / `.length > 0`.

---

## File Structure

- **Create** `src/components/DateTimePicker/dateStrings.ts` — pure parse/format helpers between the wall-clock strings and `Date` (no timezone math). One responsibility: string↔Date for the pickers.
- **Create** `src/components/DateTimePicker/CalendarPopover.tsx` — the shared date-only popover (Button trigger + Calendar). Internal building block.
- **Create** `src/components/DateTimePicker/DatePicker.tsx` — controlled `"YYYY-MM-DD"` field; wraps `CalendarPopover`.
- **Create** `src/components/DateTimePicker/DateTimePicker.tsx` — controlled `"YYYY-MM-DDTHH:mm"` field; `CalendarPopover` + native 24h time input.
- **Modify** `src/app/admin/events/EventForm.tsx` — replace the two `datetime-local` inputs with `Controller` + `DateTimePicker`.
- **Modify** `src/app/admin/editions/EditionFormDialog.tsx` — replace the `date` input with `Controller` + `DatePicker`.

---

## Task 1: Date-string helpers

**Files:**
- Create: `src/components/DateTimePicker/dateStrings.ts`

- [ ] **Step 1: Create the helpers**

Create `src/components/DateTimePicker/dateStrings.ts`:

```ts
/* Module imports -------------------------------------- */
import { format } from 'date-fns';

/* parseDateString ------------------------------------- */
/**
 * Parse a naive `"YYYY-MM-DD"` (wall-clock, no timezone) into a local Date at
 * midnight. Returns undefined for empty or malformed input. We build the Date
 * from numeric parts (not `new Date(str)`) to avoid any UTC interpretation.
 */
export const parseDateString = (value: string): Date | undefined => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if(match === null) {
    return undefined;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if(Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date;
};

/* formatDateString ------------------------------------ */
/** Format a Date as a naive `"YYYY-MM-DD"` string (local fields). */
export const formatDateString = (date: Date): string => format(date, 'yyyy-MM-dd');

/* splitDateTime --------------------------------------- */
/**
 * Split a `"YYYY-MM-DDTHH:mm"` value into its date and time halves.
 * Empty/partial input yields empty strings for the missing halves.
 */
export const splitDateTime = (value: string): { datePart: string; timePart: string } => {
  if(value === '') {
    return { datePart: '', timePart: '' };
  }
  const [datePart, timePart] = value.split('T');
  return { datePart: datePart ?? '', timePart: timePart ?? '' };
};
```

- [ ] **Step 2: Verify**

Run: `pnpm tsc:ci && pnpm exec eslint src/components/DateTimePicker/dateStrings.ts`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/DateTimePicker/dateStrings.ts
git commit -m "Add date-string helpers for the French pickers"
```

---

## Task 2: CalendarPopover (shared date popover)

**Files:**
- Create: `src/components/DateTimePicker/CalendarPopover.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/DateTimePicker/CalendarPopover.tsx`:

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';

/* Component imports ----------------------------------- */
import { Button } from 'components/ui/button';
import { Calendar } from 'components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from 'components/ui/popover';

/* Module imports (project) ---------------------------- */
import { cn } from 'lib/utils';

/* CalendarPopover component prop types ---------------- */
interface CalendarPopoverProps {
  date: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  id?: string;
  placeholder?: string;
}

/* CalendarPopover component --------------------------- */
const CalendarPopover: React.FC<CalendarPopoverProps> = ({ date, onSelect, id, placeholder }) => {
  const [open, setOpen] = React.useState<boolean>(false);

  const handleSelect = (next: Date | undefined): void => {
    onSelect(next);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            date === undefined && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 size-4" />
          {date === undefined ? (placeholder ?? "Choisir une date") : format(date, "d MMMM yyyy", { locale: fr })}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          locale={fr}
          captionLayout="label"
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
};

/* Export CalendarPopover component -------------------- */
export default CalendarPopover;
```

Notes for the implementer:
- `cn` lives at `src/lib/utils.ts` (shadcn helper) — import as `from 'lib/utils'`.
- `Calendar` already spreads `...props` to `DayPicker`, so `locale={fr}` gives French month/weekday names and a Monday-first week; `mode="single"` makes `selected`/`onSelect` take a single `Date`.
- The string literals inside `cn(...)` and the JSX ternary are JS-context — if eslint's `quotes` rule flags the double quotes there, switch those specific strings to single quotes (run `pnpm lint-fix`).

- [ ] **Step 2: Verify**

Run: `pnpm tsc:ci && pnpm exec eslint src/components/DateTimePicker/CalendarPopover.tsx`
Expected: no errors. If `explicit-function-return-type` warns, run `pnpm lint-fix` and re-check (warnings don't fail tsc).

- [ ] **Step 3: Commit**

```bash
git add src/components/DateTimePicker/CalendarPopover.tsx
git commit -m "Add CalendarPopover (French, Monday-first date popover)"
```

---

## Task 3: DatePicker (date-only field)

**Files:**
- Create: `src/components/DateTimePicker/DatePicker.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/DateTimePicker/DatePicker.tsx`:

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import CalendarPopover from './CalendarPopover';

/* Module imports (project) ---------------------------- */
import { parseDateString, formatDateString } from './dateStrings';

/* DatePicker component prop types --------------------- */
interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
}

/* DatePicker component -------------------------------- */
const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, id, placeholder }) => {
  const date = parseDateString(value);

  const handleSelect = (next: Date | undefined): void => {
    onChange(next === undefined ? '' : formatDateString(next));
  };

  return (
    <CalendarPopover date={date} onSelect={handleSelect} id={id} placeholder={placeholder} />
  );
};

/* Export DatePicker component ------------------------- */
export default DatePicker;
```

- [ ] **Step 2: Verify**

Run: `pnpm tsc:ci && pnpm exec eslint src/components/DateTimePicker/DatePicker.tsx`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/DateTimePicker/DatePicker.tsx
git commit -m "Add DatePicker (date-only, YYYY-MM-DD)"
```

---

## Task 4: DateTimePicker (date + 24h time)

**Files:**
- Create: `src/components/DateTimePicker/DateTimePicker.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/DateTimePicker/DateTimePicker.tsx`:

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import { Input } from 'components/ui/input';
import CalendarPopover from './CalendarPopover';

/* Module imports (project) ---------------------------- */
import { parseDateString, formatDateString, splitDateTime } from './dateStrings';

/* DateTimePicker component prop types ----------------- */
interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  datePlaceholder?: string;
}

/* DateTimePicker component ---------------------------- */
const DateTimePicker: React.FC<DateTimePickerProps> = ({ value, onChange, id, datePlaceholder }) => {
  const { datePart, timePart } = splitDateTime(value);
  /* When no date is chosen yet, hold the typed time locally so the field stays
     editable without emitting an invalid partial string. */
  const [pendingTime, setPendingTime] = React.useState<string>('');
  const date = parseDateString(datePart);
  const timeValue = datePart === '' ? pendingTime : timePart;

  const handleDateSelect = (next: Date | undefined): void => {
    if(next === undefined) {
      onChange('');
      return;
    }
    const nextDate = formatDateString(next);
    const effectiveTime = timeValue === '' ? '00:00' : timeValue;
    onChange(`${nextDate}T${effectiveTime}`);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const nextTime = e.target.value;
    if(datePart === '') {
      setPendingTime(nextTime);
      return;
    }
    if(nextTime === '') {
      onChange(`${datePart}T00:00`);
      return;
    }
    onChange(`${datePart}T${nextTime}`);
  };

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <CalendarPopover date={date} onSelect={handleDateSelect} id={id} placeholder={datePlaceholder} />
      </div>
      <Input
        type="time"
        aria-label="Heure"
        className="w-32"
        value={timeValue}
        onChange={handleTimeChange}
      />
    </div>
  );
};

/* Export DateTimePicker component --------------------- */
export default DateTimePicker;
```

Notes for the implementer:
- A native `<input type="time">` renders 24h under the `fr` locale. `Input` is the shadcn component (`components/ui/input`); the `w-32` keeps it compact next to the flexible date button.
- The `aria-label="Heure"` is the only label the time field carries (its visible label is the shared "Début"/"Fin" above the row).

- [ ] **Step 2: Verify**

Run: `pnpm tsc:ci && pnpm exec eslint src/components/DateTimePicker/DateTimePicker.tsx`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/DateTimePicker/DateTimePicker.tsx
git commit -m "Add DateTimePicker (French date popover + 24h time)"
```

---

## Task 5: Wire DateTimePicker into the event form

**Files:**
- Modify: `src/app/admin/events/EventForm.tsx` (imports near line 25; datetime block lines 158-175)

- [ ] **Step 1: Add the import**

In `src/app/admin/events/EventForm.tsx`, add to the `/* Component imports */` block (after the `AddressAutocomplete` import line):

```ts
import DateTimePicker from 'components/DateTimePicker/DateTimePicker';
```

- [ ] **Step 2: Replace the two datetime fields**

Replace the entire block (current lines 158-175):

```tsx
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1 flex flex-col gap-1">
          <Label htmlFor="startTime">Début</Label>
          <Input id="startTime" type="datetime-local" {...form.register('startTime')} />
          {
            form.formState.errors.startTime !== undefined &&
              <p className="text-sm text-destructive">Début requis.</p>
          }
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <Label htmlFor="endTime">Fin (optionnelle)</Label>
          <Input id="endTime" type="datetime-local" {...form.register('endTime')} />
          {
            form.formState.errors.endTime !== undefined &&
              <p className="text-sm text-destructive">{form.formState.errors.endTime.message}</p>
          }
        </div>
      </div>
```

with:

```tsx
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1 flex flex-col gap-1">
          <Label htmlFor="startTime">Début</Label>
          <Controller
            control={form.control}
            name="startTime"
            render={({ field }): React.ReactElement => (
              <DateTimePicker id="startTime" value={field.value} onChange={field.onChange} />
            )}
          />
          {
            form.formState.errors.startTime !== undefined &&
              <p className="text-sm text-destructive">Début requis.</p>
          }
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <Label htmlFor="endTime">Fin (optionnelle)</Label>
          <Controller
            control={form.control}
            name="endTime"
            render={({ field }): React.ReactElement => (
              <DateTimePicker id="endTime" value={field.value ?? ''} onChange={field.onChange} />
            )}
          />
          {
            form.formState.errors.endTime !== undefined &&
              <p className="text-sm text-destructive">{form.formState.errors.endTime.message}</p>
          }
        </div>
      </div>
```

Notes:
- `startTime` is a required string in `EventFormValues` (`field.value` is `string`). `endTime` is `string | undefined` (its zod type is `union([localDateTime, literal('')]).optional()`), so coerce with `field.value ?? ''`.
- `Controller` and `Label` are already imported. `Input` is still used by other fields, so keep its import.

- [ ] **Step 3: Verify**

Run: `pnpm tsc:ci && pnpm exec eslint src/app/admin/events/EventForm.tsx`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/events/EventForm.tsx
git commit -m "Use DateTimePicker for event start/end fields"
```

---

## Task 6: Wire DatePicker into the edition form

**Files:**
- Modify: `src/app/admin/editions/EditionFormDialog.tsx` (imports + the `dayOfFestival` field, currently `<Input id="dayOfFestival" type="date" {...form.register('dayOfFestival')} />`)

- [ ] **Step 1: Add the import**

In `src/app/admin/editions/EditionFormDialog.tsx`, add to its component-imports area (place it alongside the existing `MarkdownInput`/`Input` imports, matching the file's banner):

```ts
import DatePicker from 'components/DateTimePicker/DatePicker';
```

- [ ] **Step 2: Replace the date field**

Replace:

```tsx
            <Input id="dayOfFestival" type="date" {...form.register('dayOfFestival')} />
```

with:

```tsx
            <Controller
              control={form.control}
              name="dayOfFestival"
              render={({ field }): React.ReactElement => (
                <DatePicker id="dayOfFestival" value={field.value} onChange={field.onChange} />
              )}
            />
```

Notes:
- `dayOfFestival` is a required string in the edition form values, so `field.value` is `string`.
- If `Controller` is not yet imported in this file, add `Controller` to the existing `import { useForm, ... } from 'react-hook-form';` line (the file already uses `Controller` for the description `MarkdownInput`, so it is almost certainly imported — verify before adding).
- `Input` stays imported (still used by the `year` field).

- [ ] **Step 3: Verify**

Run: `pnpm tsc:ci && pnpm exec eslint src/app/admin/editions/EditionFormDialog.tsx`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/editions/EditionFormDialog.tsx
git commit -m "Use DatePicker for the edition day-of-festival field"
```

---

## Task 7: End-to-end verification

**Files:** none (manual verification + final gates).

- [ ] **Step 1: Final static gates**

Run: `pnpm tsc:ci && pnpm exec eslint src/components/DateTimePicker src/app/admin/events/EventForm.tsx src/app/admin/editions/EditionFormDialog.tsx && pnpm build`
Expected: all pass. (If `pnpm lint` is noisy from a stray `.next/` worktree, scope eslint to `src` as above.)

- [ ] **Step 2: Event form — visual + round-trip**

With `pnpm dev` running and logged in as admin/editor, open `/admin/events/new?edition=<id>`:
- The **Début** field shows a date button (placeholder until picked) + a 24h time field. Click it → the calendar is in French, months/weekdays French, week starts **Monday**.
- Pick a day → button shows e.g. *"21 juin 2026"*; the time field defaults to `00:00`. Set the time to `19:30`.
- Fill the other required fields and submit. In `pnpm db:studio`, confirm the saved `start_time` corresponds to **21 June 2026 19:30 Europe/Paris** (i.e. the existing Paris→UTC round-trip is unchanged).

- [ ] **Step 3: Optional end + validation**

- Leave **Fin** empty → the event saves (endTime optional).
- Clear **Début** (calendar "Clear") and submit → the existing "Début requis" error shows.
- Edit an existing event → both fields pre-fill from the stored instant (via `toParisInput`), showing the correct French date and 24h time.

- [ ] **Step 4: Edition form**

Open `/admin/editions`, create/edit an edition: the **Date du festival** field is now the French date picker, round-trips `"YYYY-MM-DD"`, and saves correctly.

---

## Self-Review (completed during authoring)

- **Spec coverage:** value contract → Tasks 1/3/4 (string↔Date, both formats); `CalendarPopover` (fr, Monday-first) → Task 2; `DatePicker` → Task 3; `DateTimePicker` combine rules (date-select defaults time to `00:00`; time-before-date held locally; clear → `''`) → Task 4; event-form wiring → Task 5; edition-form wiring → Task 6; styling/tokens → Tasks 2/4; verification → Task 7. All covered.
- **Type consistency:** `parseDateString`/`formatDateString`/`splitDateTime` (Task 1) are consumed with matching signatures in Tasks 3/4. `CalendarPopover` props `{ date, onSelect, id?, placeholder? }` (Task 2) match the calls in Tasks 3/4. `DatePicker`/`DateTimePicker` props `{ value, onChange, id?, ... }` match the `Controller` render props in Tasks 5/6. `endTime` coerced `?? ''` because its form type is `string | undefined`.
- **No placeholders:** every code step contains full code; no TBDs.
