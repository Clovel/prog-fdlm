# Address autocomplete (BAN) for the event form — design

**Date:** 2026-06-16
**Status:** Approved (design); pending implementation plan

## Goal

In the admin event form (`/admin/events/new` and the edit form), turn the free-text
**Adresse (pour la carte)** field into a search-as-you-type autocomplete backed by
France's Base Adresse Nationale (BAN). Picking a suggestion captures the address
label **and its coordinates**; typing manually stays fully supported and falls back
to the existing server-side geocode on save.

## Context — what already exists

- `src/lib/geocode.ts` — server-only `geocodeAddress(address)` calling the BAN
  endpoint at IGN's Géoplateforme (`https://data.geopf.fr/geocodage`, no API key),
  with `autocomplete=0&limit=1` (single best match). Honours `GEOCODING_BASE_URL`.
- `src/db/geocodeColumns.ts` — `geocodeResultToColumns(addr, result)` maps a
  `GeocodeResult` to the 7 geocode columns (`latitude`, `longitude`,
  `geocodedAddress`, `geocodeStatus`, `geocodeScore`, `geocodedAt`,
  `formattedAddress`).
- `src/db/mutations/events.ts` — on create/update, `geocodeColumns(addr, prev)`
  re-geocodes the address (skipping the call when the address text is unchanged)
  and merges the columns into the write.
- `src/app/admin/events/EventForm.tsx` — the address field is a plain
  `<Input {...register('locationAddress')}>`.
- shadcn `command` (cmdk) is already installed under `src/components/ui/`.

The BAN integration therefore exists end-to-end; what's missing is the interactive
`autocomplete=1` multi-candidate search wired into the form, plus a fast-path that
trusts coordinates the admin explicitly selected.

## Design

### 1. Autocomplete proxy — `GET /api/geocode/autocomplete`

New route `src/app/api/geocode/autocomplete/route.ts`.

- Guarded with `authorizeApi(['admin', 'editor'])` — maintainers only, not a
  public-site feature.
- Query param `q` (string). Blank or `< 3` chars → `{ results: [] }` (no upstream call).
- Forwards to `${GEOCODING_BASE_URL ?? DEFAULT_BASE_URL}/search/?q=<q>&limit=5&autocomplete=1&lat=44.84&lon=-0.58`.
  The `lat`/`lon` are a **proximity bias toward Bordeaux** (FdlM is Bordeaux-only);
  it ranks local addresses first without hard-filtering out-of-town ones.
  Result types are left **unrestricted** (housenumber / street / place all useful
  for a venue).
- Maps each BAN feature to a slim DTO so the client never parses raw GeoJSON:
  ```ts
  interface AddressSuggestion {
    label: string;        // properties.label
    lat: number;          // geometry.coordinates[1]
    lng: number;          // geometry.coordinates[0]
    score: number;        // properties.score
    city?: string;        // properties.city
    postcode?: string;    // properties.postcode
  }
  ```
- Never throws to the client: upstream/network/parse errors → `200 { results: [] }`
  (logged with `console.error`), so the form degrades to plain typing.
- The BAN base-URL/`DEFAULT_BASE_URL` constant is shared with `lib/geocode.ts`
  (extract the constant rather than duplicating the host string).

### 2. `AddressAutocomplete` component — `src/components/AddressAutocomplete/`

A reusable combobox built on cmdk `Command` (+ a popover/list), following the
repo's component banner conventions and typed as `React.FC<AddressAutocompleteProps>`.

Props (controlled):
```ts
interface AddressAutocompleteValue {
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
```

Behavior:
- The text field is **always free-editable** — the dropdown only *suggests*.
- Suggestions fetched via TanStack Query, key `['geocode-autocomplete', q]`,
  `enabled: q.trim().length >= 3`, debounced ~300 ms (debounce the query string in
  local state). Hits the proxy from §1.
- **Picking a suggestion** → `onChange({ address: s.label, lat: s.lat, lng: s.lng })`.
- **Typing/editing the text** → `onChange({ address: text, lat: null, lng: null })`
  — clears any previously captured coordinates so a stale point can never stick to
  a changed address.
- No-results / error → no dropdown; typed text is kept as-is.

### 3. Form wiring — `EventForm.tsx`

- Replace the address `<Input>` with `AddressAutocomplete` inside a `Controller`,
  combining `locationAddress` + the two coordinate fields into one controlled value.
- Add `latitude` / `longitude` to `EventFormValues` defaults and to the create/update
  payloads assembled in `onSubmit` (alongside `locationAddress`).
- Edit mode: `getEventForEdit` must return the stored `latitude`/`longitude` so the
  field pre-fills its captured coords (so re-saving an unchanged event doesn't
  needlessly drop to a re-geocode). Confirm/extend that query + its DTO type.

### 4. Validation — `src/validation/event.ts`

Add to `coreShape` (so both form and API schemas inherit them):
```ts
latitude:  z.number().min(-90).max(90).optional(),
longitude: z.number().min(-180).max(180).optional(),
```
They are optional, so existing API/MCP callers (`createEventObject`/
`updateEventObject` `.shape` is consumed by the MCP tools) are unaffected. A future
refinement could require both-or-neither; not needed for v1.

### 5. Mutation — `src/db/mutations/events.ts`

Extend the geocode decision so client-supplied coordinates win:

```
geocodeColumns(addr, prev, clientCoords):
  1. addr === null                         → clear all geocode columns (as today)
  2. clientCoords present (lat & lng)       → synthesize a GeocodeResult
        { status: 'ok', lat, lng, score: 1, formattedAddress: addr }
     and return geocodeResultToColumns(addr, result)   // NO BAN call
  3. addr === prev                          → return {} (unchanged; as today)
  4. otherwise                              → await geocodeAddress(addr) (as today)
```

- Reuses `geocodeResultToColumns`; no new column-mapping code.
- `score: 1` marks an admin-confirmed point (BAN scores are 0–1). Acceptable; the
  score column is informational only.
- Thread `latitude`/`longitude` from the validated input into `createEventWithChildren`,
  `updateEventWithChildren`, and `createEventsBatch` (batch callers simply omit them).

## Data flow

```
type ≥3 chars
  → debounced GET /api/geocode/autocomplete?q=…   (admin/editor guarded)
  → BAN search (Bordeaux-biased, limit 5)
  → AddressSuggestion[]
  → pick → form value { address, lat, lng }   (edit text → coords cleared)
  → submit → mutation:
       coords present → trust them, skip BAN
       coords absent  → server-side geocodeAddress() fallback (unchanged behavior)
  → latitude/longitude + geocode* columns persisted
```

## Error handling

- Proxy: any upstream failure → `{ results: [] }`, logged; form keeps working as a
  plain text input.
- Component: query errors are swallowed (empty dropdown); free text always submittable.
- Mutation: unchanged from today — a failed fallback geocode is valid column data
  (`geocodeStatus: 'failed'`, null coords) and the write proceeds.

## Out of scope (YAGNI)

- Caching autocomplete responses (BAN is fast; per-keystroke debounce suffices).
- A map-pin "drag to adjust" coordinate picker.
- Both-or-neither coordinate refinement / showing the geocode score in the UI.
- Reusing the component outside the event form (built reusable, but only wired in here for now).

## Verification

No test framework. Verify with:
- `pnpm tsc:ci`, `pnpm lint` (scope eslint to `src/...` if noisy).
- Dev server: type an address → suggestions appear; pick one → field fills; submit →
  confirm `latitude`/`longitude` stored (db:studio) with no BAN call (no `[geocode]`
  log). Then type a free-form address → submit → confirm server-side geocode ran.
- Edit an existing event without touching the address → save → coords unchanged.
```
