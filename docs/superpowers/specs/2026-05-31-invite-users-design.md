# Invite Users Design

**Status:** Approved (design phase)
**Date:** 2026-05-31
**Context:** Builds on Spec 2 (BetterAuth, `disableSignUp: true`) and Spec 3d (admin user management). Adds an email-invitation flow for provisioning users, coexisting with the existing direct-create dialog.

## 1. Goal & scope

An admin invites a person by **email + role**. The app sends an email with a link that **expires in 24 hours**. The invitee opens a **public page** explaining the site, fills in their **first/last name + password**, and accepts. On acceptance the user account is created with the invited role and the invitee is **logged in**. Admins can **list, revoke, and resend** pending invitations.

Invitations **coexist** with the Spec 3d direct-create-user dialog (admin sets a password directly) — both remain available on `/admin/users`. All invitation management is **admin-only**; the two public endpoints (validate + accept) are token-gated.

### Out of scope (YAGNI)

- Acceptance auditing/history beyond the invitation row's status.
- Bulk invites; CSV import.
- Custom per-invite expiry (fixed 24h).
- Editing a pending invite's role/email in place (revoke + re-invite instead).
- Inviting via OAuth providers.

## 2. Existing infrastructure (reused)

- `createUserWithCredentials({ email, firstName, lastName, password, role })` (`src/auth/createUser.ts`) — creates user + credential account via BetterAuth's internal adapter. Used by the seed and the 3d create route; reused at accept time.
- `src/auth/roles.ts` — `roleSchema`, `Role`, `userRoles`.
- `src/auth/email.ts` — Resend wrapper pattern (`sendResetPasswordEmail`); a new `sendInvitationEmail` is added alongside it.
- `src/auth/apiGuard.ts` — `authorizeApi(['admin'])`; `src/auth/helpers.ts` — `requireRole`.
- `authClient.signIn.email` (`src/auth/client.ts`) — used by the accept page to log the new user in.
- 3d patterns: `useAdminUsers` hooks, `UsersManager`/`UsersTable`, `ConfirmDialog`, TanStack Query, shadcn `Dialog`/`Select`/`Input`/`Switch`.
- The reset-password page (`src/app/(auth)/reset-password/page.tsx`) is the template for the set-password + redirect client flow.

## 3. Data model — new `invitation` table

New file `src/db/schema/invitations.ts` (re-exported from `schema/index.ts`); one migration.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `defaultRandom()` |
| `email` | text NOT NULL | stored lowercased |
| `role` | text NOT NULL | CHECK `role IN ('admin','editor','viewer')` (mirrors `user.role`) |
| `firstName` | text NULL | admin's optional pre-fill |
| `lastName` | text NULL | admin's optional pre-fill |
| `tokenHash` | text NOT NULL UNIQUE | SHA-256 hex of a 32-byte random token; the **raw token is never stored** |
| `status` | text NOT NULL | CHECK `status IN ('pending','accepted','revoked')`, default `'pending'` |
| `expiresAt` | timestamptz NOT NULL | invite/resend time + 24h |
| `invitedByUserId` | uuid NULL | FK → `user.id`, `onDelete: 'set null'` — nullable so deleting the inviting admin keeps the invitation row rather than cascade-deleting it |
| `createdAt` / `updatedAt` | timestamptz | `defaultNow()` |

Indexes:
- `tokenHash` UNIQUE (lookup at validate/accept).
- **Partial unique index** on `email` `WHERE status = 'pending'` — at most one live invite per email.

**"Expired" is derived** (`expiresAt < now()`), not a stored status; a pending-but-expired invite is treated as invalid at validate/accept and shown as "Expirée" in the admin list.

Exports: `invitations` table, `InvitationRow`, `InvitationInsert`.

## 4. Token model

- Raw token: 32 random bytes, base64url (URL-safe), generated server-side (`crypto.randomBytes`).
- Stored: `tokenHash = sha256(rawToken)` (hex). Lookups hash the incoming token and compare. This means a DB read never exposes a usable token.
- Single-use: accept sets `status='accepted'`. Revoke sets `status='revoked'`. Resend generates a new token (new hash), resets `expiresAt`, keeps `status='pending'` — the old link's hash no longer matches, so it dies.

## 5. Validation — `src/validation/invitation.ts` (zod v4)

```
createInvitationSchema = {
  email: z.email(),
  role: roleSchema,
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName:  z.string().trim().min(1).max(100).optional(),
}

acceptInvitationSchema = {
  token: z.string().min(1),
  firstName: z.string().trim().min(1).max(100),
  lastName:  z.string().trim().min(1).max(100),
  password:  z.string().min(12),
}
```
Inferred types `CreateInvitationInput`, `AcceptInvitationInput` exported.

## 6. Server rules (enforced in mutations, bypass-proof)

- **Create invite**: reject (409 `conflict`) if a `user` already exists with that email, or a `pending` invitation already exists for it (admin uses *resend*). Otherwise insert with a fresh token + `expiresAt = now+24h`, then send the email. If the email send fails, the invitation row is **rolled back / deleted** so the admin sees a clear failure (unlike the best-effort reset email — here the email IS the deliverable).
- **Validate** (public): hash token → find row. Valid iff row exists, `status='pending'`, `expiresAt > now()`. Returns `{ valid:true, email, role, firstName, lastName }` or `{ valid:false, reason: 'invalid'|'expired'|'used'|'revoked' }`.
- **Accept** (public): re-validate token as above (in a transaction); re-check no `user` exists with that email (race) → 409; create the user via `createUserWithCredentials` with the invited role + submitted name + password; set invitation `status='accepted'`. All in one transaction so a duplicate accept can't create two users.
- **Resend** (admin): only for a `pending` invitation; regenerate token, reset `expiresAt`, re-send. 404 if not found/not pending.
- **Revoke** (admin): set `status='revoked'`. 404 if not found.

## 7. API routes

| Route | Method | Guard | Behavior |
|---|---|---|---|
| `/api/admin/invitations` | GET | `['admin']` | List non-accepted invitations (pending + revoked + expired-pending), newest first, as `AdminInvitationDto[]`. |
| `/api/admin/invitations` | POST | `['admin']` | Validate `createInvitationSchema`; 409 existing user / existing pending; create + email; 201 `{ invitation }`. |
| `/api/admin/invitations/[id]/resend` | POST | `['admin']` | Regenerate token + expiry, re-send. 200 / 404. |
| `/api/admin/invitations/[id]` | DELETE | `['admin']` | Revoke. 200 / 404. |
| `/api/invitations/validate` | GET | public (token in query) | `{ valid, ... }`. Never leaks more than the invitee's own email/role. |
| `/api/invitations/accept` | POST | public (token in body) | Validate + create user + mark accepted. 200 / 400 / 409 (email taken). |

`AdminInvitationDto`: `{ id, email, role, firstName, lastName, status, expiresAt (ISO), isExpired (boolean), invitedByEmail (string|null), createdAt (ISO) }`.

Standard envelope `{ error, message?, issues? }`; `console.error` on 500s.

## 8. Email — `sendInvitationEmail(to, url, role)`

Added to `src/auth/email.ts`, same Resend guard pattern (reads `RESEND_API_KEY`/`EMAIL_FROM` at call time, throws if missing). French copy, e.g.:

> Bonjour, vous avez été invité·e à rejoindre l'espace de gestion du site de la Fête de la Musique à Bordeaux en tant que **{role}**. Cliquez sur le lien pour créer votre compte. Ce lien expire dans 24 heures.

Link: `${origin}/invite/${rawToken}` (origin derived from the request URL in the route, mirroring 3d's reset-email handling). `{role}` is shown in French (Administrateur/Éditeur/Lecteur).

## 9. Public accept page — `src/app/(public)/invite/[token]/page.tsx` (+ client form)

Lives in the `(public)` route group (no admin shell, no auth required). Server component:
1. Reads `token` from the route, calls the validate logic (directly, server-side — not over HTTP).
2. If invalid/expired/used/revoked → render a friendly French "Lien invalide ou expiré" panel with a short explanation and no form.
3. If valid → render a client `AcceptInviteForm` showing:
   - **3–4 lines explaining the site**: an agenda of concerts and events for la Fête de la Musique à Bordeaux; the invitee has been asked to help curate/manage it; creating an account lets them edit editions, events, and alerts.
   - the invitee's **email (read-only)** and **role**,
   - **first/last name** pre-filled (from the invite, if provided) and **editable**,
   - **password + confirm** (≥12 chars, must match).
4. Submit → `POST /api/invitations/accept`. On success → `authClient.signIn.email({ email, password })` (email comes from the validated invite) → `router.push('/admin')`. On failure → inline error (e.g. expired meanwhile, email taken).

## 10. Admin UI — `/admin/users`

- Add an **"Inviter un utilisateur"** button + `InviteUserDialog` (email, role `<Select>`, optional first/last name) beside the existing "Nouvel utilisateur".
- Add an **"Invitations en attente"** section below the users table: an `InvitationsTable` listing email, role, status badge (En attente / Expirée / Révoquée), invited-by, expiry, with **Renvoyer** (resend) and **Révoquer** (revoke via `ConfirmDialog`) per row.
- `src/hooks/admin/useAdminInvitations.ts`: `useInvitationsQuery`, `useCreateInvitation`, `useResendInvitation`, `useRevokeInvitation` (TanStack Query, `['admin','invitations']` key, broad invalidation; surfaces server `message` on 409 like `useAdminUsers`).

## 11. Error handling & verification

No test framework (`CLAUDE.md`). Verify via `tsc:ci` + `lint` + `build` + curl + browser:

- **curl** (admin jar): create invite 201; create for existing user 409; create duplicate-pending 409; create invalid email 400; GET list shows it; validate (good token) → `valid:true`; accept (good) → 200 then a new `user` exists + login works; validate after accept → `valid:false (used)`; resend → new token works, old token `invalid`; revoke → validate `revoked`; accept with expired/revoked token → 400/409; accept when email got taken → 409; all admin routes 401 unauth / 403 non-admin. Clean up test users/invites afterward.
- **browser**: invite from `/admin/users`; open the emailed link (or the validate URL) → explanation + form; set name/password → lands logged-in on `/admin`; pending list shows revoke/resend.

## 12. Rollout

Single plan, subagent-driven. Rough tasks: (1) schema + migration, (2) validation, (3) token helper, (4) mutations + queries (create/validate/accept/resend/revoke/list, last-admin N/A), (5) email function, (6) admin routes, (7) public validate+accept routes, (8) curl verification, (9) hooks, (10) InviteUserDialog + InvitationsTable + wire into UsersManager, (11) public accept page + form, (12) E2E + build.

## 13. Risks

- **Email is the deliverable** — if Resend fails on create, roll back the invitation so the admin isn't misled (unlike the best-effort reset email).
- **Token security** — only the SHA-256 hash is stored; raw token lives only in the email link; single-use + 24h expiry.
- **Race on accept** — accept runs in a transaction and re-checks email uniqueness, so a double-submit or a concurrent direct-create can't create two users for one email (the `user.email` UNIQUE also backstops this → surfaced as 409).
- **Public endpoints** — validate/accept are unauthenticated by necessity; they only act on a valid high-entropy token and never expose data beyond the invitee's own email/role.
- **No public signup regression** — `disableSignUp` stays true; account creation still happens only through the admin-issued invite (or the existing admin direct-create), never self-serve.
