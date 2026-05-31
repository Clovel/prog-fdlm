# Feature Spec: Server-Side Geocoding with Persisted Coordinates (BAN)

**Status:** Refined against the live codebase; provider committed to **BAN** — 2026-05-31
**Last verified:** 2026-05-31 (re-confirm API limits before finalising, see §12)
**Stack (confirmed):** Next.js App Router · React 19 · Drizzle ORM over postgres-js · Supabase (Postgres) · Vercel (Hobby) · geocoding via **France's BAN — `api-adresse.data.gouv.fr`** (server-side), replacing the current client-side Google `react-geocode` call.

> **Provider decision: settled.** All addresses in this app are French street addresses in Bordeaux, so this spec uses **BAN** (Base Adresse Nationale / `addok`). That choice removes the entire Google 30-day licensing apparatus the original draft carried — **no expiry column, no refresh endpoint, no cron, no `CRON_SECRET`.** Geocoding is **once-ever per address**, re-run only when an address string changes. The Google path survives only as a one-line fallback note (§3).

---

## 0. Audit of the current implementation (what exists today)

Verified against the codebase on 2026-05-31. Ground truth the rest of the spec builds on.

| Concern | Reality today | File |
|---|---|---|
| **Where geocoding happens** | **Client-side, in the browser**, via `react-geocode`'s `fromAddress()`. | `src/components/EventsMap/EventsMap.tsx:85-140` |
| **When** | **Per render** — a `useEffect` keyed on the `events` array re-geocodes *every* address each time the array reference changes (i.e. on every page view of `/[year]`). No memoisation, no cache. | `EventsMap.tsx:96`, dep array `:137-139` |
| **Key exposure** | The geocoding key is `NEXT_PUBLIC_GEOCODING_API_KEY` — shipped to and visible in the browser. Map-tile rendering separately uses `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. | `EventsMap.tsx:55`, `:81`; `.env.example:5-7` |
| **Stored coordinates** | **None.** The `events` table has only `locationName` (NOT NULL) and `locationAddress` (nullable text). No lat/lng/place columns. | `src/db/schema/events.ts` |
| **Render type already supports coords?** | `Location` has an optional `coords?: Coords` (`{lat,lng,alt?}`) — **but `EventsMap` never reads it.** It always geocodes `addressStr`. So "serve coords from DB" is *not* a no-op; the map must be rewired. | `src/types/Location.ts:7`, `src/types/Coords.ts`, `EventsMap.tsx:90-96` |
| **DTO carries coords?** | No. `EventSummaryDto.location` is `{ name, address }` only. `summaryToEvent` maps `address → addressStr`; coords never populated. | `src/db/queries/types.ts:36-39` |
| **Seed** | `db:seed` maps fixture `location.addressStr → locationAddress`. It explicitly **ignores** any `location.coords` with a warning: *"coord columns deferred to Spec 3."* No geocoding at seed time. | `src/db/seed/index.ts:129-131,146` |
| **Write paths (plural!)** | Events are written through **mutation functions** `createEventWithChildren` / `updateEventWithChildren` / `createEventsBatch` (`db.transaction`-based). Called by **two** callers: the admin API route `POST/PUT /api/admin/events`, **and** the in-progress MCP write tools (`src/mcp/tools.ts:95,124` — this branch, `feat/ai-agent-mcp-access`). | `src/db/mutations/events.ts`, `src/mcp/tools.ts` |
| **Cron / scheduled jobs** | None. `vercel.json` has only `$schema` + `installCommand`; no `crons` key. No `CRON_SECRET` anywhere. | `vercel.json` |
| **Scale** | ~80 events across two editions (2023: 40, 2024: 44), **~70 distinct address strings**, **all in Bordeaux, France**, at fixed venues. | `src/fixtures/events-2023.tsx`, `events-2024.tsx` |

**Two audit findings that the original draft got wrong for this codebase:**

1. The original §R2 said geocode-on-write goes in a "route handler or server action." That would **miss the MCP write path and the seed**. Geocoding must hook into the **mutation/service layer** so all three callers — admin API, MCP tools, seed — share it. (See §6.)
2. The original treated the read path as "UI already reads coords." It does **not** — `EventsMap` ignores `coords`. Rewiring the map to prefer stored coords is in-scope and is what actually deletes the client-side geocoding call.

---

## 1. Problem & context

The map geocodes every event address **client-side, on every page view**, with a **publicly-exposed key**. For a free public app this creates:

- **Quota / cost risk concentrated on one day.** This is the Fête de la Musique agenda — traffic is spiky and seasonal (June 21). ~40 geocode calls per edition page-view means a few hundred concurrent visitors on the night can burn through a monthly free allowance in hours. Cost scales with *page views*, not with the ~30 distinct, static venue addresses.
- **Key abuse.** A `NEXT_PUBLIC_` geocoding key is harvestable and usable by anyone.
- **UX cost.** Every visitor waits on ~40 serial geocode round-trips (`for…await` loop, `EventsMap.tsx:90-118`) before markers appear.

**The fix:** geocode **once, server-side, at write/seed time**, persist the coordinates, and serve them from the DB. The map renders stored coords and stops geocoding in the browser. The client geocoding key is then **removed entirely**.

---

## 2. Is this feature worth doing? (unbiased assessment)

**Yes — the BAN version is clearly worth it and is genuinely small.**

**For (do it):**
- Removes a public API key from the client (permanent security win).
- Removes per-view client geocoding → faster, deterministic map; no quota exposure during the one night that matters.
- Coordinates are computed from data the app already owns (`locationAddress`); the change is small and localised.
- Unblocks the long-standing "Spec 3" coords work the seed already references.

**Honest caveats:**
- The dataset is **tiny and static** (~70 distinct Bordeaux addresses, changing only when an admin edits an event). This single fact invalidates most of the original draft's complexity: **no large table to drain, no 10s-timeout batching, no advisory locks, no overlap-claim guards.**
- BAN is keyless, free, and storage-permissive (Licence Ouverte), so there is **no recurring cost and no caching-lifetime constraint** — geocoding is once-ever.

**Verdict:** Implement the **persist-on-write + persist-on-seed + rewire-the-map** core. No cron, no expiry. The feature is "schema columns + one geocode helper + 3 mutation call-sites + 1 map edit + 1 read-path edit."

---

## 3. Provider — BAN (`api-adresse.data.gouv.fr`), committed

**Why BAN:** every address is a French street address in Bordeaux. BAN is government-run, **free, keyless, no per-call billing**, optimised for French addresses, **storage-permissive (Licence Ouverte / Etalab — store coordinates indefinitely)**, and offers a **bulk CSV endpoint** for the seed.

### Matching behaviour (researched against the `addok` engine; informs how we call it)
BAN is powered by `addok`. Confirmed behaviour relevant to our stored, real-world address strings:
- **Typo-tolerant.** Fuzzy phase tests letter inversion (`segur`→`seur`), deletion, substitution, and **keyboard-adjacent** substitution, plus French phonetic simplification. `Bordaux`, `Mériadek` vs `Mériadeck` resolve.
- **Case-insensitive.** Normalisation lowercases before matching.
- **Punctuation & accents normalised.** Diacritics and punctuation stripped; abbreviations expanded via synonyms (`av`→`avenue`, `bd`→`boulevard`). Real fixture data like `rue Jacques d'Welles, Square Dom Bedos, 33800 Bordeaux` matches cleanly.
- **Autocomplete.** On by default (`autocomplete=1`); completes the last partial token. **We disable it** for full-address batch geocoding (see call spec) — it's a per-keystroke UI feature that can over-complete a finished token.
- **Confidence `score`** (0–1; engine `MIN_SCORE` floor 0.1) combining trigram/Levenshtein text similarity + geographic/importance weighting. We use it as a quality gate.

### Pinned call (single address — used by the write path)
```
GET https://api-adresse.data.gouv.fr/search/?q=<urlencoded address>&limit=1&autocomplete=0
```
Optionally bias with `&type=housenumber` and `&postcode=33000`/`&citycode=…` if precision needs tightening — start without; add only if QA shows drift.
- Read `features[0].geometry.coordinates` → `[lng, lat]` (**GeoJSON order: longitude first**). Map to our `{lat, lng}`.
- Read `features[0].properties.score`. **Confidence gate: accept `score ≥ 0.5`** → `geocodeStatus = 'ok'`; below that (or empty `features`) → `geocodeStatus = 'failed'` for admin review rather than dropping a wrong pin silently. (0.5 is a starting threshold; tune against the seed run.)

### Bulk call (seed — all addresses in one request)
```
POST https://api-adresse.data.gouv.fr/search/csv/   (multipart/form-data)
  data=<CSV file with an address column>
  columns=<address column name>
```
Returns the input CSV with appended `latitude`, `longitude`, `result_score`, `result_status`, `result_label` columns. One request covers all ~70 rows; sidesteps the 50 req/IP/s limit.

### Credentials & setup — **no API key required**
BAN is free, keyless, and needs no account or billing. There is nothing to provision externally — do **not** go looking for an API key. Setup is purely codebase config:
- **No signup / key / quota / billing.** (Unlike the old Google path.)
- **Rate limit:** 50 req/IP/s → HTTP 429 + `retry-after`. Irrelevant for the single-address write path; the seed uses the bulk CSV endpoint, which is one request.
- **Attribution (Licence Ouverte):** add a small user-visible credit — e.g. map footer / about page — *"Géocodage : Base Adresse Nationale (data.gouv.fr)"*. See §4 Goals.
- **Optional config:** `GEOCODING_BASE_URL` (server-only, default `https://api-adresse.data.gouv.fr`) to allow mocking in tests / future host change. No `NEXT_PUBLIC_` var.
- **Verify connectivity** before coding the helper:
  ```bash
  # single
  curl "https://api-adresse.data.gouv.fr/search/?q=place+de+la+Bourse+33000+Bordeaux&limit=1&autocomplete=0"
  # bulk (seed)
  printf 'addr\nplace de la Bourse 33000 Bordeaux\n' > /tmp/a.csv
  curl -X POST -F "data=@/tmp/a.csv" -F "columns=addr" https://api-adresse.data.gouv.fr/search/csv/
  ```
  Expect coords ≈ `[-0.5705, 44.8412]` (**lng first**) and `score`/`result_score` near 1.

### Fallback note
Only if BAN coverage proves inadequate for a specific venue (verify empirically first): fall back to **server-side Google Geocoding** for that case. Doing so reintroduces Google's **30-day lat/lng caching limit** → you'd then need a `geocodeExpiresAt` column + a tiny daily refresh. Not planned; recorded for completeness. Do not reintroduce without updating this section.

---

## 4. Goals & non-goals

### Goals
- Geocoding happens **server-side only**; **no geocoding key or call reaches the browser.** Remove `NEXT_PUBLIC_GEOCODING_API_KEY`.
- Each address is geocoded **once** at write time (create/update/batch) and at seed time, then served from the DB. Re-geocode only when the address string changes.
- The public map (`EventsMap`) renders **stored coordinates** and no longer calls `react-geocode`.
- A small **BAN attribution** credit is shown to users (Licence Ouverte obligation), e.g. *"Géocodage : Base Adresse Nationale (data.gouv.fr)"* in the map footer or about page.

### Non-goals
- Client-side / autocomplete geocoding (exactly what we are removing).
- Reverse geocoding.
- Map-tile / Maps-JS rendering changes — `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` and `@react-google-maps/api` stay as-is.
- A provider-abstraction layer — **YAGNI**. A single `geocodeAddress()` helper suffices; a future provider swap is a one-file change.
- Any expiry / refresh / cron machinery — **not needed with BAN.**

---

## 5. (reserved)

*Licensing section removed — BAN's Licence Ouverte permits indefinite storage, so there is no caching-lifetime constraint to design around.*

---

## 6. Data model (Drizzle) — confirmed conventions

Add columns to the **existing `events` table** (`src/db/schema/events.ts`). Match the confirmed conventions: camelCase TS identifier + snake_case DB name, `timestamp(..., { withTimezone: true })`, indexes/CHECKs in the second table-callback arg (see `generalAlerts.ts` / the existing `events_time_check`). `drizzle.config.ts` has `casing: 'snake_case'`.

| TS field | DB column | Type | Notes |
|---|---|---|---|
| `latitude` | `latitude` | `doublePrecision('latitude')` (nullable) | Null = not yet geocoded / failed. |
| `longitude` | `longitude` | `doublePrecision('longitude')` (nullable) | |
| `geocodedAddress` | `geocoded_address` | `text` (nullable) | The **exact address string that produced these coords**. Re-geocode only when `locationAddress !== geocodedAddress`. Simpler than a hash and self-documenting. |
| `geocodeStatus` | `geocode_status` | `text` (nullable) | `'ok' \| 'failed'`. (`'failed'` covers both not-found and below-threshold score.) Consider a pg enum mirrored in `enums.ts` per repo convention. |
| `geocodeScore` | `geocode_score` | `doublePrecision('geocode_score')` (nullable) | BAN match confidence (0–1). Stored for admin QA / threshold tuning. |
| `geocodedAt` | `geocoded_at` | `timestamptz` (nullable) | When coords were last fetched. |
| `formattedAddress` | `formatted_address` | `text` (nullable) | BAN `result_label` / `properties.label` — optional, useful for admin QA. |

**Notes:**
- **No `placeId`, no `geocodeExpiresAt`, no expiry index** — BAN is storage-permissive and there is no refresh.
- Change detection via `geocodedAddress` makes "re-geocode only when the address actually changed" a trivial string compare in the mutation.
- No special index needed: filtering ~80 rows by `geocode_status` for an admin "needs attention" view is free.
- Generate the migration with `pnpm db:generate` → review the SQL in `src/db/migrations/` (next is `0007_*.sql`) → `pnpm db:migrate`. Do not hand-edit applied migrations.

---

## 7. Requirements

### P0 — Must have

**R1 — A single server-side BAN geocode helper**
- One module, e.g. `src/lib/geocode.ts` → `geocodeAddress(address: string): Promise<{ lat: number; lng: number; score: number; label?: string; status: 'ok' | 'failed' }>`.
- Server-only (no `NEXT_PUBLIC_`). Calls the pinned BAN endpoint: `GET https://api-adresse.data.gouv.fr/search/?q=…&limit=1&autocomplete=0` (no key).
- Parse `features[0]`: coordinates are **GeoJSON `[lng, lat]`** — swap to `{lat, lng}`. Apply the **`score ≥ 0.5`** gate (configurable constant); empty result or low score → `status: 'failed'`.
- Never throws into a caller's transaction; network/HTTP errors resolve to `status: 'failed'` and are logged per repo conventions.
- Acceptance:
  - [ ] Importable only from server code; no client-bundle reference.
  - [ ] A known Bordeaux address (e.g. `place de la Bourse, 33000 Bordeaux`) returns plausible coords (~44.84, ~-0.57) with `status: 'ok'`.
  - [ ] A garbage/unresolvable string returns `status: 'failed'`, no exception.
  - [ ] Coordinate order is correct (lat ≈ 44.8, lng ≈ -0.5 — not swapped).

**R2 — Geocode in the mutation layer (covers admin API + MCP + seed)**
- Hook geocoding into `createEventWithChildren` / `updateEventWithChildren` / `createEventsBatch` (`src/db/mutations/events.ts`) — **not** the API route — so the admin route *and* `src/mcp/tools.ts` write tools both get it. (Audit §0.)
- **Do the BAN call _before/outside_ the `db.transaction`**, then write the resulting columns inside it alongside `coreValues()`. Do not hold a Postgres transaction open across an external HTTP call.
- Re-geocode **only** when `locationAddress` changed (compare to stored `geocodedAddress`) or coords are missing. Unchanged address on update → no call.
- On `status: 'failed'`, the write still succeeds; coords stay null, `geocodeStatus = 'failed'`, score recorded, logged.
- Acceptance:
  - [ ] Creating an event (via admin API **or** MCP tool) persists coords + `geocodeStatus = 'ok'` + `geocodeScore` + `geocodedAt` + `geocodedAddress`.
  - [ ] Updating an event without changing the address makes **no** BAN call.
  - [ ] BAN error/low-score on save does not roll back the write; the failure is recorded and logged.

**R3 — Geocode on seed (idempotent, bulk CSV)**
- `db:seed` geocodes seeded addresses server-side and persists the columns. Replace the *"coords deferred to Spec 3"* warning at `src/db/seed/index.ts:129-131`.
- Use the **BAN bulk CSV endpoint** to geocode all addresses in one request, then upsert coords. (Falls back to per-address `geocodeAddress()` if bulk integration is deferred — acceptable at this volume.)
- **Idempotent**: rows already `ok` with `geocodedAddress === locationAddress` are skipped (no call).
- Acceptance:
  - [ ] After a fresh seed, every seeded address has coords (`ok`) **or** `geocodeStatus = 'failed'` with a logged reason + score.
  - [ ] Re-running the seed makes no BAN calls for already-resolved, unchanged rows.

**R4 — Serve coords on the read path and rewire the map (this is what removes client geocoding)**
- Add `coords` to `EventSummaryDto.location` (`src/db/queries/types.ts`) — populated from `latitude`/`longitude` when `geocodeStatus = 'ok'`, else `null`. Update the public events query accordingly.
- Populate `event.location.coords` in `summaryToEvent` (`src/app/(public)/[year]/page.tsx`).
- **Rewire `EventsMap`** (`src/components/EventsMap/EventsMap.tsx`): build markers from `event.location.coords` directly; **delete** the `react-geocode` import, `setDefaults`, the `fromAddress` loop, and the `loadingGeocoding` state. Events lacking coords are simply omitted from the map (same effective behaviour as a failed geocode today).
- Remove `NEXT_PUBLIC_GEOCODING_API_KEY` from `.env.example` and deployment env once the map no longer references it. Drop the `react-geocode` dependency.
- Acceptance:
  - [ ] The public page renders markers with **zero** outbound geocoding requests from the browser (verify in devtools network tab).
  - [ ] An event with `geocodeStatus = 'ok'` shows a marker at the stored position; one without is absent (no error).
  - [ ] `NEXT_PUBLIC_GEOCODING_API_KEY` is no longer referenced anywhere in `src/`; `react-geocode` removed from `package.json`.

### P1 — Nice to have
- A log line / tiny admin indicator of how many events are `failed` (so bad/ambiguous addresses get fixed). The stored `geocodeScore` lets QA sort by lowest-confidence matches.
- Optional `type`/`postcode` biasing in the helper if QA reveals systematic drift.

### P2 — Future
- Provider abstraction (only if a second provider is ever genuinely needed).
- Address-level dedup cache (many events share a venue) — marginal at this scale; revisit only if volume grows by an order of magnitude.

---

## 8. Architecture summary

```
Write path:  admin API route  ─┐
             MCP write tool   ─┼─► createEventWithChildren / update / batch  (mutation layer)
             (seed: bulk CSV) ─┘        │  geocode via BAN BEFORE the tx (geocodeAddress / bulk)
                                        └─ persist lat/lng + status + score + geocodedAddress IN the tx
Read path:   public events query ──► DTO.location.coords ──► summaryToEvent ──► EventsMap renders stored coords
                                                                                  (no react-geocode)
```
No refresh path. Geocoding is once-ever-per-address (re-run only on address change).

---

## 9. Platform limits — recalibrated

- **BAN rate limit:** 50 req/IP/sec (HTTP 429 + `retry-after` on breach). Irrelevant for ~70 addresses; the bulk CSV endpoint avoids it entirely for the seed. The write path geocodes one address at a time.
- **Vercel Hobby** cron/timeout limits: **not applicable** — there is no cron and no batch job. The per-write BAN call is a single sub-second request.
- **Vercel Hobby is non-commercial only** — this is a free, non-commercial public agenda → fine.
- **No GCP quota/billing config** — BAN is keyless and free.

---

## 10. Environment variables

- **Remove:** `NEXT_PUBLIC_GEOCODING_API_KEY` (after R4 lands).
- **Keep:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (map tiles — unrelated).
- **BAN:** no new env var required (keyless). Optionally `GEOCODING_BASE_URL` (default `https://api-adresse.data.gouv.fr`) if you want it configurable/mockable in tests.
- Update `.env.example` accordingly (currently lists both `NEXT_PUBLIC_` map keys at lines 5-7).

---

## 11. Open questions

- **[resolved · human]** Provider = **BAN.** (§3)
- **[resolved · codebase]** ~~Address table/columns~~ → add coord columns to `events` (`locationName`/`locationAddress` exist).
- **[resolved · codebase]** ~~Write-path style~~ → **mutation layer** (`db/mutations/events.ts`), shared by admin API + MCP + seed.
- **[resolved · codebase]** ~~Refresh runtime~~ → no refresh exists (BAN).
- **[resolved · human]** App is non-commercial → Vercel Hobby ToS fine.
- **[resolved · codebase]** Scale ≈ 80 events / ~70 addresses, static → no batching/locking machinery.
- **[non-blocking · human]** Confidence threshold: start at `score ≥ 0.5`; confirm against the first seed run and adjust.
- **[non-blocking · human]** Should `failed` events surface in the admin UI (P1)?

---

## 12. Verification note

Before finalising, re-confirm against live sources: the BAN `/search/` and `/search/csv/` endpoint shapes and parameters (`q`, `limit`, `autocomplete`, `type`, `postcode`, `citycode`; GeoJSON `[lng, lat]` order; `properties.score`), the 50 req/IP/s limit, and Licence Ouverte storage permission. Prefer live values over the numbers quoted here and note any discrepancy in the implementation summary.
