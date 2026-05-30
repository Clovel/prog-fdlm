# Backoffice 3d — User Management Design

**Status:** Approved (design phase)
**Date:** 2026-05-31
**Predecessors:** Spec 1 (data layer), Spec 2 (BetterAuth), Spec 3a (admin foundation + editions), 3b (events), 3c (general alerts). This is the final backoffice sub-spec.

## 1. Goal & scope

Admin-only user management at `/admin/users` (currently an admin-gated placeholder). Operations, all gated to `admin`:

- **List** all users.
- **Create** a user (email, name, role, initial password; optional reset email).
- **Change role** inline (admin / editor / viewer).
- **Delete** a user.

This closes the original project requirement: there is no public signup (`disableSignUp: true`); the first admin is seeded from env vars; all other users are provisioned by admins, who also manage roles.

### Out of scope (YAGNI)

Editing a user's name/email after creation; pagination / search / filtering; bulk operations; OAuth provider management; account lock/disable; email-change verification flows. These can be added later if a real need appears.

## 2. Existing infrastructure (reused, not rebuilt)

- `user` table (`src/db/schema/auth.ts`): `id` (uuid), `name`, `firstName`, `lastName`, `email` (unique), `role` (text, default `viewer`, CHECK `role IN ('admin','editor','viewer')`), `createdAt`, `updatedAt`. Sessions/accounts FK to `user` with `onDelete: 'cascade'`.
- `src/auth/roles.ts`: `userRoles`, `Role`, `roleSchema` (zod enum), `isRole`, `DEFAULT_ROLE`.
- `src/auth/createUser.ts`: `createUserWithCredentials({ email, firstName, lastName, password, role })` — creates user + credential account via BetterAuth's internal adapter, bypassing the disabled public sign-up. Already used by the admin seed; explicitly built "for Spec 3's admin create-user endpoint." Lowercases email.
- `src/auth/apiGuard.ts`: `authorizeApi(['admin'])` → `{ session, response }`, 401/403.
- `src/auth/helpers.ts`: `requireRole('admin')` for server components.
- Reset-password email: BetterAuth `sendResetPassword` wired to Resend (Spec 2).
- Admin shell + nav link `/admin/users → "Utilisateurs"` (3a).
- UI patterns: `UsersManager`/`UsersTable`/`UserFormDialog` mirror the editions/alerts manager+table+dialog trio; `ConfirmDialog` (no-typing) from 3b/3c; TanStack Query hooks; shadcn `Select`/`Input`/`Switch`/`Badge`.

**No schema migration is required** for 3d.

## 3. Data layer

### Read query — `src/db/queries/admin/listUsers.ts`

```
AdminUserDto = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'editor' | 'viewer';   // reuse Role
  createdAt: string;                       // ISO
}
```

Plain Drizzle select from `user`, ordered `createdAt ASC` (oldest first — the seeded admin appears first). Mirrors `listAllEditions`.

### Mutations — `src/db/mutations/users.ts`

- `createUser(input)` → delegates to `createUserWithCredentials`; returns the new id. The unique-email constraint violation is caught and re-surfaced so the route can return 409 (mirroring `editionYearExists`, except detection is via a pre-check `emailExists(email)` to keep it explicit and avoid parsing PG error codes).
- `emailExists(email: string): Promise<boolean>` — case-insensitive existence check (email is lowercased on store).
- `updateUserRole(id, role)` → `UPDATE user SET role = ?, updatedAt = NOW() WHERE id = ?`; returns the updated row or null (→ 404).
- `deleteUser(id)` → `DELETE FROM user WHERE id = ?`; sessions/accounts cascade. Returns boolean (false → 404).
- `countAdmins(): Promise<number>` — `SELECT COUNT(*) WHERE role = 'admin'`. Used by the last-admin guard.

## 4. Last-admin guard (server-enforced)

A single invariant enforced server-side before any **demote** or **delete**:

> If the target user is currently `admin` and `countAdmins() === 1`, reject with **409** and message `Impossible de retirer le dernier administrateur.`

- "Demote" = a PATCH that changes an `admin`'s role to a non-admin role.
- "Delete" = deleting a user who is currently `admin`.

This inherently also blocks a sole admin from demoting or deleting **themselves** (they are the last admin). No additional self-modification block is implemented — when more than one admin exists, an admin may demote/delete themselves or peers freely (per product decision). The guard lives in the mutation/route layer, not the UI, so it cannot be bypassed by a crafted request.

## 5. Validation — `src/validation/user.ts` (zod v4)

```
createUserSchema = {
  email: z.email(),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  password: z.string().min(12),         // matches BetterAuth minPasswordLength
  role: roleSchema,
  sendResetEmail: z.boolean(),
}

updateRoleSchema = { role: roleSchema }
```

Inferred types `CreateUserInput`, `UpdateRoleInput` exported.

## 6. API routes (admin-only) — mirror editions/alerts

| Route | Method | Guard | Behavior |
|---|---|---|---|
| `/api/admin/users` | GET | `['admin']` | List `AdminUserDto[]`. (Sensitive PII → admin-only, unlike the editions GET which is any-auth.) |
| `/api/admin/users` | POST | `['admin']` | Validate `createUserSchema`. 409 if `emailExists`. Create via `createUser`. If `sendResetEmail`, fire BetterAuth `requestPasswordReset({ email, redirectTo: '/reset-password' })` best-effort (failure logged, does not fail the create). 201 with `{ user }`. |
| `/api/admin/users/[id]` | PATCH | `['admin']` | Validate `updateRoleSchema`. Apply last-admin guard if demoting. 200 `{ user }`; 409 last-admin; 404 missing; 400 invalid. |
| `/api/admin/users/[id]` | DELETE | `['admin']` | Apply last-admin guard if target is admin. 200 `{ ok: true }`; 409 last-admin; 404 missing. |

Standard envelope: `{ error: 'invalid_request' | 'conflict' | 'not_found' | 'internal_error', message?, issues? }`. `console.error` on 500s.

## 7. Admin UI — `src/app/admin/users/`

- **`page.tsx`** (replaces placeholder): server component, `requireRole('admin')` (already redirects non-admins to `/admin`). Renders `<UsersManager />`. No `canManage` prop needed — the whole page is admin-only (unlike alerts, which editors could view read-only).
- **`UsersManager.tsx`** (`'use client'`): `useUsersQuery`, a "Nouvel utilisateur" button opening the create dialog, renders `<UsersTable>`.
- **`UsersTable.tsx`**: one row per user — full name, email, created date, an **inline role `<Select>`** (admin/editor/viewer), and a **Supprimer** button.
  - Changing the Select immediately calls `useUpdateUserRole` and toasts on success; on error (e.g. 409 last-admin) the toast shows the server message and the list refetches, snapping the Select back to the true value.
  - Supprimer opens `ConfirmDialog` (no-typing) → `useDeleteUser`; 409 surfaces the server message.
- **`UserFormDialog.tsx`**: create-only form (react-hook-form + zod resolver): email, firstName, lastName, password, role `<Select>` (default `viewer`), and a "Envoyer un e-mail de réinitialisation" `<Switch>` (default off). On submit → `useCreateUser`; 409 duplicate-email surfaces inline/as toast.
- **`src/hooks/admin/useAdminUsers.ts`**: `useUsersQuery`, `useCreateUser`, `useUpdateUserRole`, `useDeleteUser`, with `queryKey: ['admin','users']` and broad invalidation on each mutation (matching the 3c hooks pattern).

### Delete confirmation note

Delete reuses the existing `ConfirmDialog` (no typed phrase), consistent with every other destructive action in the app (events, alerts). This was not among the explicitly-selected guards but is retained for cross-feature consistency; it is a UI convenience only — the server-side last-admin guard is the real protection.

## 8. Error handling & verification

No test framework (per `CLAUDE.md`). Verification = `pnpm tsc:ci` + `pnpm lint` + `pnpm build` + curl + browser:

- **curl** (admin cookie jar): list 200; create 201; create duplicate-email 409; create invalid (short password) 400; PATCH role 200; PATCH demote-last-admin 409; DELETE non-admin user 200; DELETE last-admin 409; all routes 403 with a non-admin cookie / 401 unauthenticated. Restore DB (delete test users) afterward.
- **browser**: as admin, create a user (editor) with/without reset email; flip a role inline; attempt to demote the sole admin (blocked with message); delete a test user (confirm dialog). Verify a freshly-created editor can log in and reach `/admin` but not `/admin/users`.

## 9. Rollout

Single plan, implemented task-by-task via subagent-driven-development. Tasks roughly: (1) validation, (2) read query, (3) mutations + last-admin helper, (4) GET/POST route, (5) PATCH/DELETE route, (6) hooks, (7) UserFormDialog, (8) UsersTable, (9) UsersManager + page replacement, (10) E2E verification + build.

## 10. Risks

- **Last-admin lockout** — mitigated by the §4 guard, enforced in the mutation layer (not just UI), covered by a curl case.
- **`createUserWithCredentials` coupling to BetterAuth internals** — already in use by the seed and pinned/verified against better-auth 1.6.x; 3d adds no new internal-API surface beyond `requestPasswordReset`.
- **PII exposure** — user list is admin-only (GET guarded `['admin']`), no email/role data is exposed to editor/viewer.
- **Reset-email best-effort** — if Resend fails, the user is still created with the admin-set password; the failure is logged, not fatal.

## 11. Next

None — 3d completes the backoffice epic (editions, events, general alerts, users). Future work (OAuth providers, event-level alerts, user edit) would be new specs.
