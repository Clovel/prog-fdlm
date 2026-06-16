# BAN Address Autocomplete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the admin event form's free-text address field into a BAN-backed search-as-you-type autocomplete that captures coordinates when a suggestion is picked, while keeping manual typing fully supported (server-side geocode fallback on save).

**Architecture:** A new admin-guarded proxy route forwards keystrokes to France's BAN search API (`autocomplete=1`, Bordeaux-biased) and returns slim suggestions. A reusable `AddressAutocomplete` combobox renders them and emits `{ address, lat, lng }`; picking a suggestion captures coordinates, editing the text clears them. The event mutation trusts client-supplied coordinates (skipping the BAN round-trip) and otherwise falls back to the existing server-side `geocodeAddress`.

**Tech Stack:** Next.js App Router (route handler), React 19 + react-hook-form, TanStack Query, the existing `src/lib/geocode.ts` BAN client, Tailwind v4 + shadcn `Input`.

**Verification note:** This repo has **no test framework**. Per CLAUDE.md, verification = `pnpm tsc:ci`, `pnpm lint` (scope to `src/...` if the worktree is noisy: `pnpm exec eslint src/<paths>`), `pnpm build`, plus `curl` against a running dev server (with an admin cookie jar) and visual checks. Each task's "verify" steps use these gates instead of unit tests.

---

## File Structure

- **Create** `src/lib/banBaseUrl.ts` — single source of truth for the BAN base URL + `GEOCODING_BASE_URL` override (shared by the server geocoder and the new proxy).
- **Modify** `src/lib/geocode.ts` — use `getBanBaseUrl()` instead of its private `DEFAULT_BASE_URL`.
- **Modify** `src/validation/event.ts` — add optional `latitude`/`longitude` to `coreShape`.
- **Modify** `src/db/mutations/events.ts` — `geocodeColumns` accepts client coords and trusts them.
- **Create** `src/app/api/geocode/autocomplete/route.ts` — admin/editor-guarded BAN proxy; exports the `AddressSuggestion` wire type.
- **Create** `src/hooks/admin/useAddressSuggestions.ts` — TanStack Query wrapper over the proxy.
- **Create** `src/components/AddressAutocomplete/AddressAutocomplete.tsx` — the combobox; exports `AddressAutocompleteValue`.
- **Modify** `src/db/queries/admin/getEventForEdit.ts` — return stored `latitude`/`longitude`.
- **Modify** `src/app/admin/events/EventForm.tsx` — wire the combobox + include coords in the payload.
- **Modify** `src/app/admin/events/new/page.tsx` and `src/app/admin/events/EventEditLoader.tsx` — seed `latitude`/`longitude` in form defaults.

---

## Task 1: Shared BAN base-URL module

**Files:**
- Create: `src/lib/banBaseUrl.ts`
- Modify: `src/lib/geocode.ts:11`, `src/lib/geocode.ts:55`

- [ ] **Step 1: Create the shared module**

Create `src/lib/banBaseUrl.ts`:

```ts
/* Constants ------------------------------------------- */
/**
 * Default base URL for the BAN geocoding API, served by IGN's Géoplateforme.
 * The legacy `api-adresse.data.gouv.fr` host was decommissioned end of Jan 2026;
 * this endpoint returns identical GeoJSON. Override with GEOCODING_BASE_URL.
 */
export const DEFAULT_BAN_BASE_URL = 'https://data.geopf.fr/geocodage';

/* getBanBaseUrl --------------------------------------- */
/** Resolve the BAN base URL, honouring the GEOCODING_BASE_URL override. */
export const getBanBaseUrl = (): string => process.env.GEOCODING_BASE_URL ?? DEFAULT_BAN_BASE_URL;
```

- [ ] **Step 2: Point `geocode.ts` at the shared module**

In `src/lib/geocode.ts`, delete the local `DEFAULT_BASE_URL` constant (lines 5–11, the JSDoc block + `const DEFAULT_BASE_URL = ...`) and add an import under the existing imports area (the file currently has no imports — add a `/* Module imports (project) */` banner above the `/* Constants */` banner):

```ts
/* Module imports (project) ---------------------------- */
import { getBanBaseUrl } from 'lib/banBaseUrl';
```

Then replace line 55:

```ts
  const baseUrl: string = process.env.GEOCODING_BASE_URL ?? DEFAULT_BASE_URL;
```

with:

```ts
  const baseUrl: string = getBanBaseUrl();
```

- [ ] **Step 3: Verify types + lint**

Run: `pnpm tsc:ci && pnpm exec eslint src/lib/banBaseUrl.ts src/lib/geocode.ts`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/banBaseUrl.ts src/lib/geocode.ts
git commit -m "Extract shared BAN base-URL resolver"
```

---

## Task 2: Validation — optional coordinates

**Files:**
- Modify: `src/validation/event.ts:31-44` (the `coreShape` object)

- [ ] **Step 1: Add the fields to `coreShape`**

In `src/validation/event.ts`, inside `const coreShape = { ... }`, add these two lines after `locationAddress`:

```ts
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
```

(They are optional, so existing API/MCP callers using `createEventObject`/`updateEventObject` `.shape` are unaffected, and `EventFormValues`/`CreateEventInput`/`UpdateEventInput` all gain the fields automatically.)

- [ ] **Step 2: Verify types + lint**

Run: `pnpm tsc:ci && pnpm exec eslint src/validation/event.ts`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/validation/event.ts
git commit -m "Add optional latitude/longitude to event validation"
```

---

## Task 3: Mutation — trust client-supplied coordinates

**Files:**
- Modify: `src/db/mutations/events.ts:73-85` (the `geocodeColumns` helper), `:90`, `:112`, `:152` (call sites)

- [ ] **Step 1: Replace the `geocodeColumns` helper**

Replace the whole helper (lines 73–85) with:

```ts
const geocodeColumns = async (
  addr: string | null,
  previousGeocodedAddress: string | null | undefined,
  clientCoords: { lat?: number; lng?: number },
): Promise<Partial<typeof events.$inferInsert>> => {
  if(addr === null) {
    return geocodeResultToColumns(null, null);
  }
  /* Admin picked a BAN suggestion → trust those coordinates; skip the network call. */
  if(clientCoords.lat !== undefined && clientCoords.lng !== undefined) {
    return geocodeResultToColumns(addr, {
      status: 'ok',
      lat: clientCoords.lat,
      lng: clientCoords.lng,
      score: 1,
      formattedAddress: addr,
    });
  }
  if(addr === previousGeocodedAddress) {
    return {};
  }
  const result = await geocodeAddress(addr);
  return geocodeResultToColumns(addr, result);
};
```

- [ ] **Step 2: Update the three call sites**

Line 90 (`createEventWithChildren`):

```ts
  const geo = await geocodeColumns(addr, undefined, { lat: input.latitude, lng: input.longitude });
```

Line 112 (`createEventsBatch`, inside the `for` loop):

```ts
    const geo = await geocodeColumns(addr, undefined, { lat: item.latitude, lng: item.longitude });
```

Line 152 (`updateEventWithChildren`):

```ts
  const geo = await geocodeColumns(addr, existing.geocodedAddress, { lat: input.latitude, lng: input.longitude });
```

- [ ] **Step 3: Verify types + lint**

Run: `pnpm tsc:ci && pnpm exec eslint src/db/mutations/events.ts`
Expected: no errors. (`input.latitude`/`item.latitude` are `number | undefined`, provided by Task 2.)

- [ ] **Step 4: Commit**

```bash
git add src/db/mutations/events.ts
git commit -m "Trust client-supplied coordinates in event geocoding"
```

---

## Task 4: BAN autocomplete proxy route

**Files:**
- Create: `src/app/api/geocode/autocomplete/route.ts`

- [ ] **Step 1: Create the route**

Create `src/app/api/geocode/autocomplete/route.ts`:

```ts
/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';

/* Module imports (project) ---------------------------- */
import { authorizeApi } from 'auth/apiGuard';
import { getBanBaseUrl } from 'lib/banBaseUrl';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* Constants ------------------------------------------- */
/** Minimum query length before hitting BAN. */
const MIN_QUERY_LENGTH = 3;
/** Proximity bias toward Bordeaux (FdlM is Bordeaux-only); ranks local hits first. */
const BORDEAUX_LAT = 44.84;
const BORDEAUX_LON = -0.58;

/* Type exports ---------------------------------------- */
export interface AddressSuggestion {
  label: string;
  lat: number;
  lng: number;
  score: number;
  city?: string;
  postcode?: string;
}

/* Internal types -------------------------------------- */
interface BanFeature {
  geometry: { coordinates: [number, number] }; /* [lng, lat] — GeoJSON order */
  properties: { label?: string; score: number; city?: string; postcode?: string };
}

interface BanResponse {
  features: BanFeature[];
}

/* GET — address autocomplete (admin + editor) --------- */
export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const { response } = await authorizeApi(['admin', 'editor']);
  if(response !== null) {
    return response;
  }

  const q = (new URL(request.url).searchParams.get('q') ?? '').trim();
  if(q.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ results: [] });
  }

  const url = `${getBanBaseUrl()}/search/?q=${encodeURIComponent(q)}&limit=5&autocomplete=1&lat=${BORDEAUX_LAT.toString()}&lon=${BORDEAUX_LON.toString()}`;

  let res: Response;
  try {
    res = await fetch(url);
  } catch(err: unknown) {
    console.error('[api/geocode/autocomplete] network error:', err);
    return NextResponse.json({ results: [] });
  }
  if(!res.ok) {
    console.error(`[api/geocode/autocomplete] BAN HTTP ${res.status.toString()} for q: ${q}`);
    return NextResponse.json({ results: [] });
  }

  let data: BanResponse;
  try {
    data = (await res.json()) as BanResponse;
  } catch(err: unknown) {
    console.error('[api/geocode/autocomplete] parse error:', err);
    return NextResponse.json({ results: [] });
  }

  const results: AddressSuggestion[] = data.features
    .map((f): AddressSuggestion => {
      /* GeoJSON order is [longitude, latitude] — destructure carefully. */
      const [lng, lat] = f.geometry.coordinates;
      return {
        label: f.properties.label ?? '',
        lat,
        lng,
        score: f.properties.score,
        city: f.properties.city,
        postcode: f.properties.postcode,
      };
    })
    .filter((s): boolean => s.label.length > 0);

  return NextResponse.json({ results });
};
```

- [ ] **Step 2: Verify types + lint**

Run: `pnpm tsc:ci && pnpm exec eslint src/app/api/geocode/autocomplete/route.ts`
Expected: no errors.

- [ ] **Step 3: Manually verify against a running dev server**

Start the server (`pnpm dev`) and, with an admin cookie jar (`cookies.txt` from a `/api/auth` login):

Run: `curl -s --cookie cookies.txt 'http://localhost:3000/api/geocode/autocomplete?q=place%20de%20la%20bourse'`
Expected: JSON `{ "results": [ { "label": "Place de la Bourse 33000 Bordeaux", "lat": 44.8..., "lng": -0.5..., "score": ..., "city": "Bordeaux", "postcode": "33000" }, ... ] }` with Bordeaux hits ranked first.

Run: `curl -s 'http://localhost:3000/api/geocode/autocomplete?q=ab'` (no cookie)
Expected: a 401 envelope (guarded). With cookie + `q=ab`: `{ "results": [] }` (below min length).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/geocode/autocomplete/route.ts
git commit -m "Add BAN address autocomplete proxy route"
```

---

## Task 5: Suggestions hook + AddressAutocomplete component

**Files:**
- Create: `src/hooks/admin/useAddressSuggestions.ts`
- Create: `src/components/AddressAutocomplete/AddressAutocomplete.tsx`

- [ ] **Step 1: Create the query hook**

Create `src/hooks/admin/useAddressSuggestions.ts`:

```ts
'use client';

/* Module imports -------------------------------------- */
import { useQuery } from '@tanstack/react-query';

/* Type imports ---------------------------------------- */
import type { UseQueryResult } from '@tanstack/react-query';
import type { AddressSuggestion } from 'app/api/geocode/autocomplete/route';

/* Constants ------------------------------------------- */
const MIN_QUERY_LENGTH = 3;

/* Fetcher --------------------------------------------- */
const fetchSuggestions = async (q: string): Promise<AddressSuggestion[]> => {
  const res = await fetch(`/api/geocode/autocomplete?q=${encodeURIComponent(q)}`, { cache: 'no-store' });
  if(!res.ok) {
    return [];
  }
  const body = await res.json() as { results: AddressSuggestion[] };
  return body.results;
};

/* useAddressSuggestions ------------------------------- */
export const useAddressSuggestions = (query: string): UseQueryResult<AddressSuggestion[], Error> => {
  const q = query.trim();
  return useQuery({
    queryKey: ['geocode-autocomplete', q],
    queryFn: (): Promise<AddressSuggestion[]> => fetchSuggestions(q),
    enabled: q.length >= MIN_QUERY_LENGTH,
    staleTime: 60_000,
  });
};
```

(The `import type` from the route file is erased at compile time — no server code is bundled into the client.)

- [ ] **Step 2: Create the component**

Create `src/components/AddressAutocomplete/AddressAutocomplete.tsx`:

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import { Input } from 'components/ui/input';

/* Module imports (project) ---------------------------- */
import { useAddressSuggestions } from 'hooks/admin/useAddressSuggestions';

/* AddressAutocomplete component prop types ------------ */
export interface AddressAutocompleteValue {
  address: string;
  lat: number | null;
  lng: number | null;
}

interface AddressAutocompleteProps {
  value: AddressAutocompleteValue;
  onChange: (next: AddressAutocompleteValue) => void;
  id?: string;
  placeholder?: string;
}

/* Constants ------------------------------------------- */
const DEBOUNCE_MS = 300;

/* AddressAutocomplete component ----------------------- */
const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({ value, onChange, id, placeholder }) => {
  const [open, setOpen] = React.useState<boolean>(false);
  const [debounced, setDebounced] = React.useState<string>(value.address);
  const [highlight, setHighlight] = React.useState<number>(-1);

  /* Debounce the typed text before querying BAN. */
  React.useEffect((): (() => void) => {
    const t = setTimeout((): void => { setDebounced(value.address); }, DEBOUNCE_MS);
    return (): void => { clearTimeout(t); };
  }, [value.address]);

  const query = useAddressSuggestions(open ? debounced : '');
  const suggestions = query.data ?? [];

  const select = (s: AddressAutocompleteValue): void => {
    onChange(s);
    setOpen(false);
    setHighlight(-1);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    onChange({ address: e.target.value, lat: null, lng: null });
    setOpen(true);
    setHighlight(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if(!open || suggestions.length === 0) {
      return;
    }
    if(e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h): number => (h + 1) % suggestions.length);
    } else if(e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h): number => (h <= 0 ? suggestions.length - 1 : h - 1));
    } else if(e.key === 'Enter' && highlight >= 0) {
      e.preventDefault();
      const s = suggestions[highlight];
      select({ address: s.label, lat: s.lat, lng: s.lng });
    } else if(e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showDropdown: boolean = open && suggestions.length > 0;

  return (
    <div className="relative">
      <Input
        id={id}
        value={value.address}
        placeholder={placeholder}
        autoComplete="off"
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={(): void => { if(value.lat === null) { setOpen(true); } }}
        onBlur={(): void => { window.setTimeout((): void => { setOpen(false); }, 120); }}
      />
      {
        showDropdown &&
          <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md">
            {
              suggestions.map((s, i) => (
                <li key={`${s.label}-${i.toString()}`}>
                  <button
                    type="button"
                    className={`block w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground ${i === highlight ? "bg-accent text-accent-foreground" : ""}`}
                    onMouseDown={(e): void => { e.preventDefault(); select({ address: s.label, lat: s.lat, lng: s.lng }); }}
                  >
                    {s.label}
                  </button>
                </li>
              ))
            }
          </ul>
      }
    </div>
  );
};

/* Export AddressAutocomplete component ---------------- */
export default AddressAutocomplete;
```

(`onMouseDown` + `preventDefault` fires before the input's `onBlur`, so the click registers; the 120 ms blur delay is the fallback. Keyboard nav works because focus stays on the input.)

- [ ] **Step 3: Verify types + lint**

Run: `pnpm tsc:ci && pnpm exec eslint src/hooks/admin/useAddressSuggestions.ts src/components/AddressAutocomplete/AddressAutocomplete.tsx`
Expected: no errors. If `explicit-function-return-type` warns on any inline arrow, run `pnpm lint-fix` and re-check; warnings do not fail `tsc:ci`.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/admin/useAddressSuggestions.ts src/components/AddressAutocomplete/AddressAutocomplete.tsx
git commit -m "Add AddressAutocomplete combobox + suggestions hook"
```

---

## Task 6: Wire the combobox into the event form

**Files:**
- Modify: `src/db/queries/admin/getEventForEdit.ts:9-26` (type), `:42-59` (return)
- Modify: `src/app/admin/events/EventForm.tsx` (imports, address block, payload)
- Modify: `src/app/admin/events/new/page.tsx:16-31` (`blankValues`)
- Modify: `src/app/admin/events/EventEditLoader.tsx:31-46` (`toFormValues`)

- [ ] **Step 1: Return coordinates from `getEventForEdit`**

In `src/db/queries/admin/getEventForEdit.ts`, add to the `AdminEventDetail` interface (after `locationAddress`):

```ts
  latitude: number | null;
  longitude: number | null;
```

And in the returned object (after `locationAddress: ev.locationAddress,`):

```ts
    latitude: ev.latitude,
    longitude: ev.longitude,
```

- [ ] **Step 2: Seed coords in the blank (create) form values**

In `src/app/admin/events/new/page.tsx`, inside `blankValues()`, add after `locationAddress: '',`:

```ts
  latitude: undefined,
  longitude: undefined,
```

- [ ] **Step 3: Seed coords in the edit form values**

In `src/app/admin/events/EventEditLoader.tsx`, inside `toFormValues`, add after `locationAddress: d.locationAddress ?? '',`:

```ts
  latitude: d.latitude ?? undefined,
  longitude: d.longitude ?? undefined,
```

- [ ] **Step 4: Import the component into `EventForm.tsx`**

Add to the `/* Component imports */` block (after the `AlertsSection` import):

```ts
import AddressAutocomplete from 'components/AddressAutocomplete/AddressAutocomplete';
```

- [ ] **Step 5: Replace the address field**

In `src/app/admin/events/EventForm.tsx`, replace this block (lines 131–134):

```tsx
      <div className="flex flex-col gap-1">
        <Label htmlFor="locationAddress">Adresse (pour la carte)</Label>
        <Input id="locationAddress" {...form.register('locationAddress')} />
      </div>
```

with:

```tsx
      <div className="flex flex-col gap-1">
        <Label htmlFor="locationAddress">Adresse (pour la carte)</Label>
        <Controller
          control={form.control}
          name="locationAddress"
          render={({ field }): React.ReactElement => (
            <AddressAutocomplete
              id="locationAddress"
              placeholder="Rechercher une adresse…"
              value={{
                address: field.value ?? "",
                lat: form.getValues("latitude") ?? null,
                lng: form.getValues("longitude") ?? null,
              }}
              onChange={(next): void => {
                field.onChange(next.address);
                form.setValue("latitude", next.lat ?? undefined, { shouldDirty: true });
                form.setValue("longitude", next.lng ?? undefined, { shouldDirty: true });
              }}
            />
          )}
        />
      </div>
```

- [ ] **Step 6: Include coordinates in the submit payload**

In `src/app/admin/events/EventForm.tsx`, in `onSubmit`, add to the `shared` object (after `locationAddress: values.locationAddress,`):

```ts
      latitude: values.latitude,
      longitude: values.longitude,
```

- [ ] **Step 7: Verify types + lint + build**

Run: `pnpm tsc:ci && pnpm exec eslint src/db/queries/admin/getEventForEdit.ts src/app/admin/events/EventForm.tsx src/app/admin/events/new/page.tsx src/app/admin/events/EventEditLoader.tsx`
Expected: no errors.

Run: `pnpm build`
Expected: build succeeds. (If `Input` is now unused in `EventForm.tsx`, ESLint's `no-unused-vars` will flag it — it is still used by other fields (`name`, `locationName`, `priceText`, times), so keep the import.)

- [ ] **Step 8: Commit**

```bash
git add src/db/queries/admin/getEventForEdit.ts src/app/admin/events/EventForm.tsx src/app/admin/events/new/page.tsx src/app/admin/events/EventEditLoader.tsx
git commit -m "Wire BAN address autocomplete into the event form"
```

---

## Task 7: End-to-end verification

**Files:** none (manual verification).

- [ ] **Step 1: Pick-a-suggestion path captures coords, no BAN call on save**

With `pnpm dev` running and logged in as admin/editor, go to `/admin/events/new?edition=<an edition id>`. Type "place de la bourse" in the address field. Expect a dropdown of Bordeaux suggestions. Click one — the field fills with the label. Fill the required fields (Lieu, Début) and submit.
- In `pnpm db:studio`, open the new `events` row: confirm `latitude`/`longitude` are set, `geocode_status = 'ok'`, `geocode_score = 1`, `geocoded_address` = the label.
- Confirm the dev-server log shows **no** `[geocode]` line for this save (the BAN round-trip was skipped).

- [ ] **Step 2: Manual-typing path falls back to server geocode**

Create another event, but **type** an address freely (e.g. "5 rue Sainte-Catherine Bordeaux") without selecting a suggestion (or pick one then edit a character). Submit.
- Confirm the row has coords derived server-side and `geocode_score` is the real BAN score (not exactly `1`), proving the fallback ran.

- [ ] **Step 3: Edit without touching the address preserves coords**

Edit the event from Step 1, change only the name, and save.
- Confirm `latitude`/`longitude` are unchanged (pre-filled coords were re-sent and trusted).

- [ ] **Step 4: Guard + degradation**

Run `curl -s 'http://localhost:3000/api/geocode/autocomplete?q=test'` with no cookie → expect 401. The form must still allow typing + saving even if the proxy returns `{ results: [] }` (e.g. temporarily set `GEOCODING_BASE_URL` to a bad host and confirm the field degrades to a plain input that still saves via server-side fallback).

- [ ] **Step 5: Final gates**

Run: `pnpm tsc:ci && pnpm lint && pnpm build`
Expected: all pass. (If `pnpm lint` is noisy from a stray `.next/` worktree, scope to `pnpm exec eslint src`.)

---

## Self-Review (completed during authoring)

- **Spec coverage:** §1 proxy → Task 4; §2 component → Task 5; §3 form wiring → Task 6; §4 validation → Task 2; §5 mutation → Task 3; shared base URL (spec §1 "extract the constant") → Task 1; `getEventForEdit` coords (spec §3) → Task 6 Step 1. All covered.
- **Type consistency:** `AddressSuggestion` (route, Task 4) is consumed by the hook (Task 5) and component; `AddressAutocompleteValue` (Task 5) is used in `EventForm` (Task 6). `geocodeColumns(addr, prev, clientCoords)` 3-arg signature (Task 3) matches all three call sites. `latitude`/`longitude` are `number | undefined` on inputs (Task 2) and `number | null` on the DB DTO (Task 6) — converted with `?? undefined` / `?? null` at each boundary.
- **No placeholders:** every code step contains full code; no TBDs.
