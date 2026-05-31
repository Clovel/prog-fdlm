# Feature Spec: Server-Side Geocoding with Persisted Coordinates

**Status:** Refined against the live codebase — 2026-05-31 (was: Draft)
**Last verified:** 2026-05-31 (pricing/ToS/platform limits change often — re-confirm, see §12)
**Stack (confirmed):** Next.js App Router · React 19 · Drizzle ORM over postgres-js · Supabase (Postgres) · Vercel (Hobby) · currently Google Geocoding via `react-geocode` (client-side)

> This revision replaces the original Google-centric draft. The original assumed a generic "address table", a route-handler write path, and a Google-licensing-driven refresh cron. The codebase audit (§1) changes three of those assumptions, and the all-French-addresses reality changes the provider recommendation (§3). Deviations from the original draft are flagged inline.

---

## 0. Audit of the current implementation (what exists today)

Verified against the codebase on 2026-05-31. This is the ground truth the rest of the spec builds on.

| Concern | Reality today | File |
|---|---|---|
| **Where geocoding happens** | **Client-side, in the browser**, via `react-geocode`'s `fromAddress()`. | `src/components/EventsMap/EventsMap.tsx:85-140` |
| **When** | **Per render** — a `useEffect` keyed on the `events` array re-geocodes *every* address each time the array reference changes (i.e. on every page view of `/[year]`). No memoisation, no cache. | `EventsMap.tsx:96`, dep array `:137-139` |
| **Key exposure** | The geocoding key is `NEXT_PUBLIC_GEOCODING_API_KEY` — shipped to and visible in the browser. Map-tile rendering separately uses `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. | `EventsMap.tsx:55`, `:81`; `.env.example:5-7` |
| **Stored coordinates** | **None.** The `events` table has only `locationName` (NOT NULL) and `locationAddress` (nullable text). No lat/lng/place columns. | `src/db/schema/events.ts` |
| **Render type already supports coords?** | `Location` has an optional `coords?: Coords` (`{lat,lng,alt?}`) — **but `EventsMap` never reads it.** It always geocodes `addressStr`. So "serve coords from DB" is *not* a no-op; the map must be rewired. | `src/types/Location.ts:7`, `src/types/Coords.ts`, `EventsMap.tsx:90-96` |
| **DTO carries coords?** | No. `EventSummaryDto.location` is `{ name, address }` only. `summaryToEvent` maps `address → addressStr`; coords never populated. | `src/db/queries/types.ts:36-39` |
| **Seed** | `db:seed` maps fixture `location.addressStr → locationAddress`. It explicitly **ignores** any `location.coords` with a warning: *"coord columns deferred to Spec 3."* No geocoding at seed time. | `src/db/seed/index.ts:129-131,146` |
| **Write paths (plural!)** | Events are written through **mutation functions** `createEventWithChildren` / `updateEventWithChildren` / `createEventsBatch` (`db.transaction`-based). These are called by **two** callers: the admin API route `POST/PUT /api/admin/events`, **and** the in-progress MCP write tools (`src/mcp/tools.ts:95,124` — this branch, `feat/ai-agent-mcp-access`). | `src/db/mutations/events.ts`, `src/mcp/tools.ts` |
| **Cron / scheduled jobs** | None. `vercel.json` has only `$schema` + `installCommand`; no `crons` key. No `CRON_SECRET` anywhere. | `vercel.json` |
| **Scale** | ~80 events across two editions (2023: 40, 2024: 44), **~70 distinct address strings**, **all in Bordeaux, France**, at fixed venues. | `src/fixtures/events-2023.tsx`, `events-2024.tsx` |

**Two audit findings that the original draft got wrong for this codebase:**

1. The original §R2 said geocode-on-write goes in a "route handler or server action." That would **miss the MCP write path and the seed**. Geocoding must hook into the **mutation/service layer** (or a helper the mutations call) so all three callers — admin API, MCP tools, seed — share it. (See §6.)
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

**Yes — the lightweight version is clearly worth it; the original draft's heavy version is over-engineered for this codebase.**

**For (do it):**
- Removes a public API key from the client (genuine, permanent security win).
- Removes per-view client geocoding → faster, deterministic map; no quota exposure during the one night that matters.
- Coordinates are computed from data the app already owns (`locationAddress`); the change is small and localised.
- It unblocks the long-standing "Spec 3" coords work the seed already references.

**Against / caveats (be honest):**
- The dataset is **tiny and static** (~70 distinct Bordeaux addresses, changing only when an admin edits an event). This is the single most important sizing fact, and it **invalidates most of the original draft's complexity**: there is no large table to drain, no 10s-timeout batching problem, no need for advisory locks or `pending`-claim overlap guards. The original §7's Vercel-Hobby-timeout analysis is moot at this scale.
- If the project switches to a **storage-permissive provider** (see §3), the entire Google 30-day licensing apparatus — expiry column, refresh endpoint, cron, `CRON_SECRET` — **disappears**. That removes ~half the original requirements (the original R3/R4/R5).

**Verdict:** Implement the **persist-on-write + persist-on-seed + rewire-the-map** core. Choose the provider per §3. With the recommended provider (BAN), **drop the refresh cron entirely** — it exists only to satisfy a Google constraint that doesn't apply. The feature shrinks from "8 requirements + cron + locks" to "schema columns + a geocode helper + 3 call-sites + 1 map edit."

---

## 3. Provider decision (this is the highest-leverage choice)

**Every address in this app is a French street address in Bordeaux.** That makes the provider choice lopsided.

### Recommended: **(B) France's BAN — `api-adresse.data.gouv.fr`**
- **Free, no API key, no per-call billing**, government-run, optimised for French addresses.
- **Storage-permissive** (Licence Ouverte / Etalab) — you may **store coordinates indefinitely**.
- Has a **bulk CSV endpoint** (`/search/csv/`) ideal for the seed: geocode all ~70 addresses in one request.
- **Consequences for this spec:** delete the expiry column, the refresh endpoint, the cron, and `CRON_SECRET`. Geocoding becomes **once-ever, on write and on seed** (re-run only when an address string changes). This is the right shape for static venue data.
- **Cons:** France-only coverage (a non-issue here); attribution courtesy; slightly less "polished" formatting than Google. Accuracy for Bordeaux venues is excellent.

### Fallback: **(A) Keep Google Geocoding (server-side)**
- Only justified if BAN coverage proves inadequate for some venue (verify empirically before assuming).
- Triggers Google's **30-day lat/lng caching limit** (§4-licensing) → you must add `geocodeExpiresAt` and a refresh path. **But even then**, at ~70 static rows refreshed on a ~25-day cadence, the refresh is trivially a single un-batched pass that finishes in well under the function timeout — so you still **do not** need bounded-batch windowing, advisory locks, or `pending`-claim overlap guards. Keep R3/R5 minimal.
- `place_id` is exempt and may be stored indefinitely.

**`HUMAN DECISION (blocking):` Confirm provider = BAN (recommended) or Google.** The rest of the spec is written for **BAN** as the default and marks the Google-only additions as `[Google-only]`. Do not switch providers without recording the decision here.

> Note: even on Google, serving stored lat/lng to a Google-rendered map is permitted; the only constraint is the 30-day cache lifetime on the stored values.

---

## 4. Hard constraint — Google Maps licensing `[Google-only]`

Applies **only if §3 resolves to (A) Google**. With BAN, this section is inert.

- Geocoding API lat/lng may be cached **≤ 30 consecutive days**, then must be deleted or refreshed (refresh resets the clock and re-bills).
- `place_id` is **exempt** — store indefinitely (Google suggests refreshing IDs older than ~12 months).
- Maintainer's billing address is in France (EEA) → EEA terms apply; the 30-day rule still holds. `HUMAN:` confirm billing geography if going with Google.

**Design consequence (Google only):** stored lat/lng carries `geocodeExpiresAt = geocodedAt + 25 days`, refreshed by a daily cron that re-queries the few stale rows.

---

## 5. Goals & non-goals

### Goals
- Geocoding happens **server-side only**; **no geocoding key or call reaches the browser.** Remove `NEXT_PUBLIC_GEOCODING_API_KEY`.
- Each address is geocoded **at write time** (create/update/batch) and **at seed time**, then served from the DB.
- The public map (`EventsMap`) renders **stored coordinates** and no longer calls `react-geocode`.
- `[Google-only]` Stored coordinates comply with the 30-day rule via an expiry + a minimal daily refresh.

### Non-goals
- Client-side / autocomplete geocoding (this is exactly what we are removing).
- Reverse geocoding.
- Map-tile / Maps-JS rendering changes — `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` and `@react-google-maps/api` stay as-is.
- A provider-abstraction layer — **YAGNI** at this scale. A single `geocodeAddress()` helper is enough; swapping providers later is a one-file change.

---

## 6. Data model (Drizzle) — confirmed conventions

Add columns to the **existing `events` table** (`src/db/schema/events.ts`). Match the confirmed conventions: camelCase TS identifier + snake_case DB name, `timestamp(..., { withTimezone: true })`, indexes/CHECKs in the second table-callback arg (see `generalAlerts.ts` / the existing `events_time_check`). `drizzle.config.ts` has `casing: 'snake_case'`.

| TS field | DB column | Type | Notes |
|---|---|---|---|
| `latitude` | `latitude` | `doublePrecision('latitude')` (nullable) | Null = not yet geocoded / failed. |
| `longitude` | `longitude` | `doublePrecision('longitude')` (nullable) | |
| `geocodedAddress` | `geocoded_address` | `text` (nullable) | The **exact address string that produced these coords**. Used to detect change (re-geocode only when `locationAddress !== geocodedAddress`). Simpler than a hash and self-documenting. |
| `geocodeStatus` | `geocode_status` | `text` (nullable) | `'ok' \| 'not_found' \| 'failed'`. Prevents infinite retry of ungeocodable addresses. Consider a pg enum mirrored in `enums.ts` per repo convention. |
| `geocodedAt` | `geocoded_at` | `timestamptz` (nullable) | When coords were last fetched. |
| `formattedAddress` | `formatted_address` | `text` (nullable) | Provider's normalised label — optional, useful for admin QA. |
| `[Google-only] placeId` | `place_id` | `text` (nullable) | Storable indefinitely; retain across refreshes. |
| `[Google-only] geocodeExpiresAt` | `geocode_expires_at` | `timestamptz` (nullable) | `geocodedAt + 25 days`; drives refresh selection; index it. |

**Notes:**
- With **BAN**, `placeId` and `geocodeExpiresAt` are **omitted** (no expiry, no place-id concept needed).
- Index: `[Google-only]` add an index on `geocode_expires_at`. For BAN, no refresh query exists, so **no extra index needed** at this scale (a `geocode_status` filter over ~80 rows is free).
- Change detection via `geocodedAddress` is **recommended** — it makes "re-geocode only when the address actually changed" a trivial string compare in the mutation.
- Generate the migration with `pnpm db:generate` → review the SQL in `src/db/migrations/` (next is `0007_*.sql`) → `pnpm db:migrate`. Do not hand-edit applied migrations.

---

## 7. Requirements

### P0 — Must have

**R1 — A single server-side geocode helper**
- One function, e.g. `src/lib/geocode.ts` → `geocodeAddress(address: string): Promise<{ lat, lng, formattedAddress?, placeId?, status }>`.
- Server-only (no `NEXT_PUBLIC_`). For BAN: `fetch('https://api-adresse.data.gouv.fr/search/?q=…&limit=1')`, no key. Follow the repo's error-handling/logging conventions.
- Returns a discriminated result; never throws into the caller's transaction.
- Acceptance:
  - [ ] Helper is importable only from server code; no client bundle references it.
  - [ ] A known Bordeaux address returns plausible lat/lng (~44.83, ~-0.57).
  - [ ] An unresolvable address returns `status: 'not_found'`, not an exception.

**R2 — Geocode in the mutation layer (covers admin API + MCP + seed)**
- Hook geocoding into `createEventWithChildren` / `updateEventWithChildren` / `createEventsBatch` (`src/db/mutations/events.ts`) — **not** the API route — so the admin route *and* `src/mcp/tools.ts` write tools both get it. (Audit finding §0.)
- **Do the network call _before/outside_ the `db.transaction`**, then write the resulting columns inside it. Holding a Postgres transaction open across an external HTTP call is an anti-pattern; the existing mutations should geocode, then persist coords alongside `coreValues()`.
- Re-geocode **only** when `locationAddress` changed (compare to stored `geocodedAddress`) or coords are missing. Unchanged address on update → no call.
- On failure, the write still succeeds; coords stay null, `geocodeStatus = 'failed'`, logged.
- Acceptance:
  - [ ] Creating an event (via admin API **or** MCP tool) persists coords + `geocodeStatus = 'ok'` + `geocodedAt` + `geocodedAddress`.
  - [ ] Updating an event without changing the address makes **no** geocode call.
  - [ ] Provider error on save does not roll back the write; failure is recorded and logged.

**R3 — Geocode on seed (idempotent, batched)**
- `db:seed` geocodes each seeded address server-side and persists the columns. Replace the *"coords deferred to Spec 3"* warning at `src/db/seed/index.ts:129-131`.
- **Idempotent**: rows already `ok` with `geocodedAddress === locationAddress` are skipped (and, `[Google-only]`, unexpired).
- BAN: use the **bulk CSV endpoint** to geocode all addresses in one request (no rate-limit concern). Google: a simple sequential pass with a small delay is fine at this volume.
- Acceptance:
  - [ ] After a fresh seed, every seeded address has coords **or** `geocodeStatus ∈ {failed, not_found}` with a logged reason.
  - [ ] Re-running the seed makes no geocode calls for already-resolved, unchanged rows.

**R4 — Serve coords on the read path and rewire the map (this is what removes client geocoding)**
- Add `coords` to `EventSummaryDto.location` (`src/db/queries/types.ts`) — populated from `latitude`/`longitude` when `geocodeStatus = 'ok'` (and `[Google-only]` not expired), else `null`. Update the public events query accordingly.
- Populate `event.location.coords` in `summaryToEvent` (`src/app/(public)/[year]/page.tsx`).
- **Rewire `EventsMap`** (`src/components/EventsMap/EventsMap.tsx`): build markers from `event.location.coords` directly; **delete** the `react-geocode` import, `setDefaults`, the `fromAddress` loop, and the `loadingGeocoding` state. Events lacking coords are simply omitted from the map (same effective behaviour as a failed geocode today).
- Remove `NEXT_PUBLIC_GEOCODING_API_KEY` from `.env.example` and deployment env once the map no longer references it. Consider dropping the `react-geocode` dependency.
- Acceptance:
  - [ ] The public page renders markers with **zero** outbound geocoding requests from the browser (verify in devtools network tab).
  - [ ] An event with `geocodeStatus = 'ok'` shows a marker at the stored position; one without is absent (no error).
  - [ ] `NEXT_PUBLIC_GEOCODING_API_KEY` is no longer referenced anywhere in `src/`.

### P0 `[Google-only]` — refresh (omit entirely if §3 = BAN)

**R5 — Minimal protected refresh endpoint + daily cron**
- Route `src/app/api/cron/geocoding-refresh/route.ts` (match routing conventions). `GET`, authenticated by `Authorization: Bearer ${CRON_SECRET}` with a **constant-time** compare; `401` on mismatch/absence.
- Select rows where `geocodeExpiresAt <= now()` OR coords null OR `geocodeStatus = 'failed'` (cap retries on `failed`). Re-geocode **in place** (update, never delete-then-insert). Refresh `geocodedAt`/`geocodeExpiresAt`/`geocodeStatus`; **retain `placeId`**. Return a JSON `{ refreshed, failed, skipped }` summary.
- At ~70 rows this completes in one pass — **no bounded-batch windowing, no advisory lock, no `pending`-claim overlap guard needed.** (Deliberately simpler than the original draft, which sized for a large table that does not exist here.)
- `vercel.json`: add a single daily cron (`{ "crons": [{ "path": "/api/cron/geocoding-refresh", "schedule": "0 3 * * *" }] }`). Vercel injects the `CRON_SECRET` Bearer automatically when the env var is set — confirm current behaviour (§12) and accept it.
- Acceptance:
  - [ ] No/invalid token → `401`, no work.
  - [ ] Valid token → only stale/missing/failed rows processed, coords overwritten in place, `placeId` retained.
  - [ ] `vercel.json` has exactly one daily cron pointing at the route.

### P1 — Nice to have
- A log line / tiny admin indicator of how many events are `failed`/`not_found` (so bad addresses get fixed).
- `[Google-only]` capped retries + backoff for transient provider errors.

### P2 — Future
- Provider abstraction (only if a second provider is ever genuinely needed).
- Address-level dedup cache (many events share a venue) — marginal at this scale; revisit only if volume grows by an order of magnitude.

---

## 8. Architecture summary (BAN-default)

```
Write path:  admin API route  ─┐
             MCP write tool   ─┼─► createEventWithChildren / update / batch
             seed             ─┘        │  (mutation layer)
                                        ├─ geocode BEFORE the tx (geocodeAddress)
                                        └─ persist coords + status + geocodedAddress IN the tx
Read path:   public events query ──► DTO.location.coords ──► summaryToEvent ──► EventsMap renders stored coords
                                                                                  (no react-geocode)
[Google-only] Refresh: Vercel Cron (daily) ──GET+Bearer──► /api/cron/geocoding-refresh
                                                              └► refresh the few stale rows in place
```
With BAN, the bottom line is **deleted** and geocoding is once-ever-per-address.

---

## 9. Platform limits — recalibrated for this codebase

The original draft's gotchas were sized for a large table on Vercel Hobby. Recalibrated:

- **Vercel Hobby cron = once/day, ~10s timeout, no retries, imprecise firing.** Relevant **only** on the Google path, and **not a real constraint here**: refreshing ≤ ~80 rows fits easily in one ~10s invocation. No windowing/locks needed.
- **BAN:** no key, no per-call billing, no meaningful rate limit for a bulk CSV of ~70 rows. The platform-limit section is essentially moot.
- **Vercel Hobby is non-commercial only.** This app is a free, non-commercial public agenda → fine. (Resolves the original open question.)
- **`[Google-only]` cost ceiling:** if Google is chosen, the human should still set a GCP daily quota cap + billing alert and restrict the key — config, not code.
- **`pg_cron`/Edge Function alternative** (original §7): unnecessary. The refresh, if it exists at all, is tiny and fits Vercel Cron.

---

## 10. Environment variables

- **Remove:** `NEXT_PUBLIC_GEOCODING_API_KEY` (after R4 lands).
- **Keep:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (map tiles — unrelated).
- **BAN:** no new env var required (keyless). Optionally `GEOCODING_BASE_URL` if you want it configurable.
- **`[Google-only]`:** `GOOGLE_GEOCODING_API_KEY` (server-only, restricted in GCP) and `CRON_SECRET` (server-only).
- Update `.env.example` to match (the file currently lists both `NEXT_PUBLIC_` map keys at lines 5-7).

---

## 11. Open questions (resolve before coding the affected part)

- **[blocking · human]** Provider = **BAN (recommended)** or Google? (§3) — determines whether R5/expiry/`CRON_SECRET`/`placeId` exist at all.
- **[blocking · human, Google-only]** Confirm EEA billing (it is France) → 30-day rule applies. Moot for BAN.
- **[resolved · codebase]** ~~Address table/columns~~ → `events.locationName` / `events.locationAddress`; add coord columns to `events`.
- **[resolved · codebase]** ~~Write-path style~~ → **mutation layer** (`db/mutations/events.ts`), shared by admin API + MCP + seed. (Not a route handler.)
- **[resolved · codebase]** ~~Run refresh on Vercel or pg_cron~~ → Vercel Cron is sufficient (only if Google); pg_cron is overkill.
- **[resolved · human]** App is non-commercial → Vercel Hobby ToS fine.
- **[resolved · codebase]** Scale ≈ 80 events / ~70 addresses, static → no batching/locking machinery.
- **[non-blocking · human]** Should events that fail to geocode surface anywhere in the admin UI (P1)?

---

## 12. Verification note

Re-confirm before finalising: BAN API terms + endpoint shape (`api-adresse.data.gouv.fr`, Licence Ouverte storage permission), and — if Google is chosen — Google Maps Platform Service Specific Terms (30-day lat/lng cache, place_id exemption), Vercel Hobby cron/timeout limits, and the `CRON_SECRET` auto-injection behaviour. Prefer live values over the numbers quoted here and note any discrepancy in the implementation summary.
