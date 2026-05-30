# Spec 2 — Auth (BetterAuth: email+password, roles, password reset)

**Status:** approved
**Date:** 2026-05-30
**Scope:** second of three specs. Spec 1 shipped the data layer (Drizzle + PostgreSQL + DB-backed public read path). Spec 2 adds authentication: email+password login via BetterAuth, three roles, a seeded first admin, a role-aware route guard for `/admin/*`, and self-service password reset over Resend. Spec 3 will add the backoffice CRUD (including user management) on top of this.

---

## 1. Goals

- Integrate **BetterAuth** for email+password authentication, backed by our existing Drizzle + Supabase Postgres.
- **No public sign-up.** The only way to obtain an account is to be seeded (the first admin) or created by an admin later (Spec 3).
- Three roles: **`admin`**, **`editor`**, **`viewer`** — stored as a custom `role` field on the user (no BetterAuth admin plugin).
- A **two-layer route guard** protecting `/admin/*`: optimistic middleware redirect + authoritative server-side session check.
- **Seed the first admin** from environment variables, idempotently.
- **Self-service password reset** via Resend (the only email flow; no email verification).
- Architected so **Google / GitHub OAuth** can be added later with config only (the `account` table already carries the columns).

## 2. Non-goals

- User-management API and UI (create user, change role, delete, list users) — **Spec 3**. The internal `createUserWithCredentials` helper is built here but only the seed script calls it.
- Per-section role gating inside the backoffice — **Spec 3** (consumes the `requireRole()` helper built here).
- Google / GitHub OAuth — later; only the schema is forward-compatible.
- Email verification, change-email, two-factor auth, organizations / multi-tenant — not now.
- Rate-limit tuning, account lockout, captcha — BetterAuth defaults stand.
- Any change to the public event site beyond adding the auth routes — the public pages from Spec 1 are untouched.

## 3. Decisions captured

| Question | Decision |
| --- | --- |
| Roles | `admin`, `editor`, `viewer` |
| Admin operations | Custom `role` field + custom endpoints (NOT the BetterAuth admin plugin) |
| Email flows | Password reset only, via Resend. No email verification. |
| Spec 2 scope | Auth plumbing only: login/logout/session/guard/seed-admin/password-reset. User management → Spec 3. |
| First admin | Seed script reading `ADMIN_EMAIL` / `ADMIN_PASSWORD` from env; idempotent upsert. |
| Auth table IDs | UUID (via `advanced.database.generateId: 'uuid'` + `uuid` columns), matching Spec 1. |
| User name model | `firstName` + `lastName` (required); `name` kept as a denormalized `"{first} {last}"` column BetterAuth requires. |
| Avatar | `image` optional → Gravatar (by email) → initials fallback. |
| Sessions | DB-backed, 7-day expiry, refreshed daily. |

## 4. Stack, dependencies, environment

- **New dependencies:** `better-auth`, `resend`.
- **New env vars** (documented in `.env.example`; real values in gitignored `.env.local`):
  - `BETTER_AUTH_SECRET` — ≥32-char secret (`openssl rand -base64 32`).
  - `BETTER_AUTH_URL` — base URL (`http://localhost:3000` dev; production URL on Vercel).
  - `RESEND_API_KEY` — Resend API key (already added to `.env.local` / `.env.example`).
  - `EMAIL_FROM` — verified Resend sender, e.g. `Fête de la Musique <noreply@yourdomain>`.
  - `ADMIN_EMAIL`, `ADMIN_PASSWORD` — consumed only by the seed script. Optional `ADMIN_FIRST_NAME`, `ADMIN_LAST_NAME`.
- **No change** to the existing `DATABASE_URL` / Google Maps keys.

## 5. File layout

```
src/auth/
  config.ts          ← betterAuth() server instance
  client.ts          ← createAuthClient (better-auth/react)
  helpers.ts         ← server helpers: getSession(), requireSession(), requireRole()
  email.ts           ← Resend sender used by sendResetPassword
  gravatar.ts        ← gravatarUrl(email) helper
  roles.ts           ← userRoles const tuple + Role type + zod enum (shared source of truth)
  createUser.ts      ← createUserWithCredentials() internal helper (seed now, Spec 3 later)
src/db/schema/
  auth.ts            ← BetterAuth Drizzle schema (user/session/account/verification) incl. role — generated, then hand-edited to uuid, then committed
src/db/seed/
  admin.ts           ← seed first admin from env vars (pnpm db:seed:admin)
src/middleware.ts    ← optimistic /admin/* guard (cookie presence)
src/app/api/auth/[...all]/route.ts   ← toNextJsHandler(auth)
src/app/login/page.tsx
src/app/login/layout.tsx             ← bare layout (no public Header/Copyright chrome)
src/app/forgot-password/page.tsx
src/app/reset-password/page.tsx
src/app/admin/layout.tsx             ← authoritative server-side guard
src/app/admin/page.tsx               ← minimal landing (UserAvatar + name + email + role + logout)
src/components/UserAvatar/UserAvatar.tsx
src/components/LogoutButton/LogoutButton.tsx
```

Notes:
- Auth code lives in `src/auth/` (not `src/lib/`) so it stays under the project's **strict** ESLint rules — `src/lib/` is relaxed for shadcn-generated code.
- The BetterAuth CLI is pointed at the config explicitly: `npx @better-auth/cli@latest generate --config ./src/auth/config.ts`.
- `login`, `forgot-password`, `reset-password` use a bare auth layout (no public site chrome). The public `(year)` pages and the root redirect from Spec 1 are unchanged.

## 6. Database schema (auth tables)

Four BetterAuth-owned tables, generated by the CLI, hand-edited so `id`/FK columns are Postgres `uuid`, then committed and run through the **existing Drizzle pipeline** (`pnpm db:generate` produces the SQL; `pnpm db:migrate` applies it — same as Spec 1). The `casing: 'snake_case'` setting from Spec 1 governs column names.

### `user`

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK; value from BetterAuth's `generateId: 'uuid'` |
| name | text | NOT NULL — BetterAuth core field; populated as `"{firstName} {lastName}"` |
| firstName | text | NOT NULL — additional field |
| lastName | text | NOT NULL — additional field |
| email | text | NOT NULL, UNIQUE |
| emailVerified | boolean | NOT NULL, default false |
| image | text | NULL — optional avatar URL |
| role | text | NOT NULL, default `'viewer'`, `input: false` |
| createdAt | timestamptz | NOT NULL |
| updatedAt | timestamptz | NOT NULL |

### `session`

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| userId | uuid | NOT NULL, FK → `user.id` ON DELETE CASCADE |
| token | text | NOT NULL, unique |
| expiresAt | timestamptz | NOT NULL |
| ipAddress | text | NULL |
| userAgent | text | NULL |
| createdAt / updatedAt | timestamptz | NOT NULL |

### `account`

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| userId | uuid | NOT NULL, FK → `user.id` ON DELETE CASCADE |
| accountId | text | provider's account id (text, not our uuid) |
| providerId | text | `'credential'` for password; OAuth provider id later |
| password | text | NULL — credential hash (scrypt, BetterAuth default) |
| accessToken / refreshToken / idToken / scope / *expiresAt | text / timestamptz | NULL — OAuth columns, unused until Google/GitHub land |
| createdAt / updatedAt | timestamptz | NOT NULL |

### `verification`

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| identifier | text | NOT NULL |
| value | text | NOT NULL |
| expiresAt | timestamptz | NOT NULL |
| createdAt / updatedAt | timestamptz | NOT NULL |

Used for the password-reset token flow.

### Role constraint

- `role` is `text` (BetterAuth additional fields are string-typed), default `'viewer'`.
- Allowed set `('admin','editor','viewer')` is the single source of truth in `src/auth/roles.ts` (const tuple + `Role` type + zod enum), used by every server helper and (in Spec 3) every endpoint.
- A Postgres `CHECK (role IN ('admin','editor','viewer'))` constraint is added via a follow-up migration so the DB rejects invalid values independently of the app.

### ID type maintenance note

BetterAuth's Drizzle generator emits `text` PK/FK columns by default. The committed `src/db/schema/auth.ts` hand-edits the `id` columns and their FK references to `uuid`. `account.accountId` and `verification.value`/`identifier` stay `text`. If the schema is regenerated after a BetterAuth upgrade or plugin change, re-apply the `text`→`uuid` edit on the id/FK columns. This is documented in the file header. BetterAuth only ever passes/reads the string value, so it is agnostic to the column type.

## 7. BetterAuth configuration (`src/auth/config.ts`)

```ts
betterAuth({
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,               // no public registration
    requireEmailVerification: false,   // email verification skipped
    minPasswordLength: 12,
    sendResetPassword: async ({ user, url }) => sendResetPasswordEmail(user.email, url),
    revokeSessionsOnPasswordReset: true,
  },
  user: {
    additionalFields: {
      firstName: { type: 'string', required: true },
      lastName:  { type: 'string', required: true },
      role:      { type: 'string', required: false, defaultValue: 'viewer', input: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,       // 7 days
    updateAge: 60 * 60 * 24,           // refresh daily
  },
  advanced: {
    database: { generateId: 'uuid' },  // BetterAuth's built-in UUID id strategy
  },
  plugins: [ nextCookies() ],          // must be last
});
```

- `disableSignUp: true` closes `POST /api/auth/sign-up/email` — there is no self-registration path.
- `input: false` on `role` blocks the field from being set through any auth request; only server-side code (seed now, Spec 3 endpoints later) writes it. The official docs use `role` with `input: false` as the canonical example for security-sensitive fields.
- DB-backed sessions because we have Postgres.
- `nextCookies()` last so cookie handling works in route handlers and server actions.
- **No `backgroundTasks` handler.** BetterAuth's reset email is awaited inline by `sendResetPassword`. On this app's low volume that is simpler and more reliable on serverless than a fire-and-forget `waitUntil` handler (no risk of a frozen function cutting off the send); the only cost is a slightly slower password-reset response. `advanced.backgroundTasks.handler` exists (docs-confirmed) and can be added later if email volume grows.

**Verified against the official BetterAuth docs for v1.6.x (the version we'll install, latest `1.6.12`):** `advanced.database.generateId` accepts the literal `'uuid'`; `emailAndPassword.disableSignUp` and `revokeSessionsOnPasswordReset` exist; `user.additionalFields` supports `input: false`; `advanced.backgroundTasks.handler` exists (we opt not to use it — see above). These config-API points are confirmed — no spike needed for them. (The internal *user-creation* API in §12 is a separate, still-unverified surface.)

## 8. Auth surface (handler, client, helpers)

- **`src/app/api/auth/[...all]/route.ts`** — `export const { GET, POST } = toNextJsHandler(auth)`. The only BetterAuth HTTP surface. `sign-up` is rejected by config.
- **`src/auth/client.ts`** — `export const authClient = createAuthClient()` (`better-auth/react`). Provides `signIn.email`, `signOut`, `requestPasswordReset`, `resetPassword`, `useSession`.
- **`src/auth/helpers.ts`** (server-only):
  - `getSession()` → `auth.api.getSession({ headers: await headers() })`, nullable.
  - `requireSession()` → the session, or `redirect('/login')`.
  - `requireRole(...roles: Role[])` → calls `requireSession()`, then redirects (or 403s) if the user's role isn't allowed. Built now, fully exercised in Spec 3.

## 9. Route protection

Two layers — middleware alone cannot authoritatively validate a BetterAuth session (no DB/crypto at the edge):

1. **`src/middleware.ts` — optimistic.** Uses `getSessionCookie(request)` (`better-auth/cookies`) to check session-cookie *presence*. Requests to `/admin/*` with no cookie → `redirect('/login?callbackUrl=<path>')`. Matcher: `/admin/:path*`. No DB call.
2. **`src/app/admin/layout.tsx` — authoritative.** Server component calling `auth.api.getSession`. No valid session → `redirect('/login')`. Reads `role` and makes the user available to the subtree. In Spec 2 **any authenticated role** may see the landing; per-section gating is Spec 3.

## 10. Login & logout

- **`src/app/login/page.tsx`** — client component under a bare `login/layout.tsx` (no public chrome). Email + password form (react-hook-form + zod, already in deps). `authClient.signIn.email({ email, password, callbackURL })`. Success → `callbackUrl` (default `/admin`). Failure → inline French error ("Identifiants invalides"). Includes a "Mot de passe oublié ?" link to `/forgot-password`. If already authenticated, redirects to `/admin`.
- **`src/components/LogoutButton/LogoutButton.tsx`** — client component, `authClient.signOut()` then `router.push('/login')`. Mounted on the `/admin` landing.
- **`src/app/admin/page.tsx`** — minimal landing proving the chain: `<UserAvatar>`, full name, email, role badge, logout. Replaced by the real dashboard in Spec 3.

## 11. Password reset (Resend)

- **`src/auth/email.ts`** — `sendResetPasswordEmail(to, url)` wraps the Resend SDK. Reads `RESEND_API_KEY` + `EMAIL_FROM`; throws a clear error if either is missing. Sends a French email (subject "Réinitialisation de votre mot de passe") with the reset `url`. One inline HTML template, no template engine.
- **`src/app/forgot-password/page.tsx`** — client. Email field → `authClient.requestPasswordReset({ email, redirectTo: '<BETTER_AUTH_URL>/reset-password' })`. Always shows a neutral confirmation ("Si un compte existe pour cette adresse, un email a été envoyé.") regardless of account existence.
- **`src/app/reset-password/page.tsx`** — client. Reads `token` from query. New-password + confirm fields (zod: ≥12 chars, must match). `authClient.resetPassword({ newPassword, token })`. Success → `/login` with a notice. Invalid/expired token → French error + link back to `/forgot-password`.
- **Security posture** (BetterAuth defaults, made explicit): single-use tokens deleted after use, 1-hour expiry, neutral responses that don't reveal account existence, all sessions revoked on reset (`revokeSessionsOnPasswordReset: true`). The reset email is sent inline (awaited), not via a background handler — see §7.

## 12. Seeding the first admin

**`src/db/seed/admin.ts`** (`pnpm db:seed:admin`):

With `disableSignUp: true` and no admin plugin, there is no HTTP path to create a user. We create it server-side through BetterAuth's internal context so the credential hash matches the login path exactly.

- Reads `ADMIN_EMAIL`, `ADMIN_PASSWORD` (+ optional `ADMIN_FIRST_NAME` / `ADMIN_LAST_NAME`, defaulting to `"Admin"` / `"FDLM"`). Throws if email or password is missing.
- Resolves `const ctx = await auth.$context` for `ctx.password.hash()` and `ctx.internalAdapter` (low-level — bypasses the disabled sign-up handler).
- **Idempotent:**
  - User with `ADMIN_EMAIL` exists → ensure `role = 'admin'` (update if needed), **leave the password untouched**, log "ensured admin role".
  - Otherwise → create the user (`role: 'admin'`, `emailVerified: true`, `name` from first/last) and the credential account (`providerId: 'credential'`, hashed password).
- Same `process.exit` pattern as the Spec 1 seed.

**`createUserWithCredentials({ email, firstName, lastName, password, role })`** lives in `src/auth/createUser.ts` and contains the actual create-user logic. The seed calls it now; Spec 3's admin "create user" endpoint reuses it. This establishes the "create a user without public signup" pattern once.

**Implementation risk:** the exact internal API (`auth.$context`, `internalAdapter.createUser` / `createAccount` / `linkAccount`, `ctx.password.hash`) is the riskiest surface in this spec. The implementation plan has an explicit **spike step** to confirm these against the installed BetterAuth version before writing the seed.

`package.json` gains `"db:seed:admin": "tsx --env-file=.env.local src/db/seed/admin.ts"`.

## 13. Avatar

- **`src/auth/gravatar.ts`** — `gravatarUrl(email, size?)` → `https://www.gravatar.com/avatar/<sha256(lowercased-trimmed email)>?d=404&s=<size>`. `d=404` makes the request fail when there is no Gravatar, so the UI can fall through to initials.
- **`src/components/UserAvatar/UserAvatar.tsx`** — wraps shadcn `<Avatar>`: `<AvatarImage src={user.image ?? gravatarUrl(user.email)} />` and `<AvatarFallback>` rendering initials (`firstName[0] + lastName[0]`, uppercased). Precedence: explicit `image` → Gravatar → initials (shadcn shows the fallback automatically when the image errors/404s).
- Used on the `/admin` landing in Spec 2; reused across the backoffice in Spec 3.

## 14. Rollout plan

1. Add deps (`better-auth`, `resend`); add env vars to `.env.example`.
2. Write `src/auth/roles.ts`, `gravatar.ts`, `email.ts`, then `config.ts`. (Config-API points already verified against v1.6.x docs — see §7.)
3. **Spike:** confirm BetterAuth internal *user-creation* API (`auth.$context`, `internalAdapter.createUser`/`createAccount`, `ctx.password.hash`) against the installed version. This is the one remaining unverified surface.
4. Generate auth schema (`npx @better-auth/cli@latest generate --config ./src/auth/config.ts`); hand-edit id/FK columns to `uuid`; commit `src/db/schema/auth.ts`; add to the schema barrel.
5. `pnpm db:generate` → migration; `pnpm db:migrate` against Supabase; add the `role` CHECK constraint migration.
6. Auth route handler, `client.ts`, `helpers.ts`, `createUser.ts`.
7. Seed admin script; run `pnpm db:seed:admin`; verify the admin row + credential account exist.
8. Middleware + `/admin` layout + `/admin` landing + `UserAvatar` + `LogoutButton`.
9. Login page + bare auth layout.
10. Forgot-password + reset-password pages; verify a full reset email round-trip via Resend.
11. End-to-end verification: login succeeds, `/admin` guard redirects when logged out, logout works, password reset round-trips, public Spec 1 pages still work.
12. `pnpm tsc:ci`, `pnpm lint`, `pnpm build` all clean.
13. Production: set `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `EMAIL_FROM`, Resend + admin env vars on Vercel; run `pnpm db:migrate` then `pnpm db:seed:admin` once.

## 15. Risk register

- **Internal user-creation API** (highest): mitigated by the explicit spike step (§14.3) before the seed task.
- **Schema regeneration drift**: the `text`→`uuid` hand-edit must be re-applied on regeneration — documented in the `auth.ts` header.
- **Middleware cannot validate sessions**: by design; the `/admin` layout is the authoritative gate, middleware is optimistic only.
- **Resend on serverless**: reset email is awaited inline (no `backgroundTasks` handler), which is reliable on serverless for this volume; revisit `backgroundTasks` + `waitUntil` if email volume grows.
- **`BETTER_AUTH_SECRET` rotation** invalidates all sessions — documented, acceptable for this app.
- **Public site regression**: auth routes are additive; the Spec 1 public read path is not modified. Verified in §14.11.

## 16. What lands in Spec 3 (informational)

- Backoffice dashboard replacing the minimal `/admin` landing.
- User management: list users, create user (reusing `createUserWithCredentials`), change role, delete — API + UI, admin-only via `requireRole('admin')`.
- Per-section role gating across editions / events / alerts CRUD.
- Public `<GeneralAlertsBanner>` and the rest of the deferred Spec 1 UI.
- Possibly: Google / GitHub OAuth (`socialProviders` + buttons), email verification, TanStack Query for the admin client.
