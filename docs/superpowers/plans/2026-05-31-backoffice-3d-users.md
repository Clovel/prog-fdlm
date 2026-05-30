# Backoffice 3d — User Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin-only user management at `/admin/users` — list, create (with optional reset email), inline role change, and delete — with a server-enforced last-admin guard.

**Architecture:** New `/api/admin/users` REST routes (GET/POST + `[id]` PATCH/DELETE), all guarded `admin`-only, zod-validated, backed by Drizzle mutations. User creation delegates to the existing `createUserWithCredentials` (BetterAuth internal adapter). The last-admin guard is encapsulated inside the `updateUserRole`/`deleteUser` mutations (bypass-proof), which return a discriminated result the routes map to 404/409. Admin client uses TanStack Query + an inline per-row role `<Select>` + a create dialog + `ConfirmDialog` for delete. No schema migration.

**Tech Stack:** Next.js 16, React 19, TS 6, Drizzle + Supabase, BetterAuth 1.6.x, @tanstack/react-query, react-hook-form, zod v4, shadcn/ui, sonner, Tailwind v4, pnpm.

**Spec source:** `docs/superpowers/specs/2026-05-31-backoffice-3d-users-design.md`. Read it once before Task 1.

**Verification note:** No test framework (`CLAUDE.md`). "Verify" = `pnpm tsc:ci`, `pnpm lint`, `pnpm build`, `curl` with an admin cookie jar, browser checks. DB is Supabase; dev server must run with `BETTER_AUTH_URL=http://localhost:3000` on port 3000 (a seeded admin exists; its creds are in `.env.local` as `ADMIN_EMAIL`/`ADMIN_PASSWORD` — read at runtime, never hardcode them).

**Conventions** (`CLAUDE.md`): 2-space indent, single quotes TS / double quotes JSX, semicolons, always-multiline trailing commas, **no space after `if`/`for`/`while`/`catch`** (`if(x)`), `@typescript-eslint/strict-boolean-expressions` (write `x !== undefined && x.length > 0`, never `if(x)` on a string), `explicit-function-return-type` (annotate handlers), comment-banner layout, `import type`, `React.FC<Props>` default-exported components, react-hooks v7 (`set-state-in-effect` needs an eslint-disable on the single line), `toast.*` returns a value → call it inside a block-body `(): void => { toast.success(...); }`. Path alias `*` → `./src/*`. Run `pnpm lint-fix` after edits.

**Reuse map:** `createUserWithCredentials` from `auth/createUser`; `authorizeApi(['admin'])` from `auth/apiGuard`; `requireRole` from `auth/helpers`; `roleSchema`/`Role`/`userRoles` from `auth/roles`; `ConfirmDialog` (no-typing mode) from `components/admin/ConfirmDialog`; shadcn `Select`/`Input`/`Label`/`Switch`/`Badge`/`Button`/`Dialog`. Closest templates: `db/queries/admin/listEditionEventsAdmin.ts` (timestamp→ISO mapping), `db/mutations/editions.ts`, `app/api/admin/editions/[id]/route.ts`, `hooks/admin/useEditions.ts`, and the 3c alerts manager/table/dialog trio.

**Server reset trigger (verified):** `auth.api.requestPasswordReset({ body: { email, redirectTo } })` exists in better-auth 1.6.x (the client uses `authClient.requestPasswordReset({ email, redirectTo })` in `forgot-password/page.tsx`).

---

## Task 1: Shared user validation schemas

**Files:** Create `src/validation/user.ts`

- [ ] **Step 1: Write `src/validation/user.ts`**

```ts
/* Module imports -------------------------------------- */
import { z } from 'zod';

/* Module imports (project) ---------------------------- */
import { roleSchema } from 'auth/roles';

/* Schemas --------------------------------------------- */
export const createUserSchema = z.object({
  email: z.email(),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  password: z.string().min(12, '12 caractères minimum'),
  role: roleSchema,
  sendResetEmail: z.boolean(),
});

export const updateRoleSchema = z.object({
  role: roleSchema,
});

/* Inferred types -------------------------------------- */
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
```

- [ ] **Step 2: Verify + commit**

```bash
pnpm tsc:ci && pnpm lint
git add src/validation/user.ts
git commit -m "Added shared user validation schemas"
```
`git commit` without `--no-verify`. Both clean (a pre-existing `<img>` warning in `DescriptionRender.tsx` is acceptable; no NEW warnings). If `z.email()` doesn't typecheck, use `z.string().email()` and report.

---

## Task 2: Admin users read query

**Files:** Create `src/db/queries/admin/listUsers.ts`

- [ ] **Step 1: Write `src/db/queries/admin/listUsers.ts`**

`createdAt` is a `timestamp(..., { withTimezone: true })` → Drizzle returns a `Date`; map it to an ISO string (exactly as `listEditionEventsAdmin.ts` maps `startTime`).

```ts
/* Module imports -------------------------------------- */
import { asc } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../../index';
import { user } from '../../schema';

/* Type imports ---------------------------------------- */
import type { Role } from 'auth/roles';

/* Types ----------------------------------------------- */
export interface AdminUserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  createdAt: string;
}

/* Query ----------------------------------------------- */
export const listUsers = async (): Promise<AdminUserDto[]> => {
  const rows = await db
    .select({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(asc(user.createdAt), asc(user.id));

  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    firstName: r.firstName,
    lastName: r.lastName,
    role: r.role as Role,
    createdAt: r.createdAt.toISOString(),
  }));
};
```

- [ ] **Step 2: Verify + commit**

```bash
pnpm tsc:ci && pnpm lint
git add src/db/queries/admin/listUsers.ts
git commit -m "Added admin listUsers query"
```
Notes: `user.role` is `text` (not a pgEnum) so it selects as `string`; the `as Role` cast is required and NOT flagged by `no-unnecessary-type-assertion` (the source type is `string`, the target is the narrower union). If lint unexpectedly flags it, the column is wider than `Role` — keep the cast and report. `r.createdAt.toISOString()` assumes a `Date`; if tsc says `createdAt` is already `string`, drop `.toISOString()` and set the map to `createdAt: r.createdAt` (report which).

---

## Task 3: User mutations (create / role / delete) + last-admin guard

**Files:** Create `src/db/mutations/users.ts`

The last-admin guard is enforced **inside** the mutations (bypass-proof). `updateUserRole` and `deleteUser` return a discriminated result the route maps to 404/409.

- [ ] **Step 1: Write `src/db/mutations/users.ts`**

```ts
/* Module imports -------------------------------------- */
import { eq, sql } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../index';
import { user } from '../schema';
import { createUserWithCredentials } from '../../auth/createUser';

/* Type imports ---------------------------------------- */
import type { Role } from '../../auth/roles';
import type { CreateUserInput } from 'validation/user';

/* Result types ---------------------------------------- */
export type MutationResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'last_admin' };

/* Helpers --------------------------------------------- */
/** Case-insensitive existence check (emails are stored lowercased). */
export const emailExists = async (email: string): Promise<boolean> => {
  const rows = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email.toLowerCase()))
    .limit(1);
  return rows.length > 0;
};

/* Mutations ------------------------------------------- */
/**
 * Creates a user + credential account (delegates to BetterAuth). The caller is
 * responsible for the duplicate-email pre-check (emailExists -> 409). Returns
 * the new user id. The `sendResetEmail` flag is handled by the route, not here.
 */
export const createUser = async (input: Omit<CreateUserInput, 'sendResetEmail'>): Promise<string> => {
  return createUserWithCredentials({
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    password: input.password,
    role: input.role,
  });
};

/**
 * Changes a user's role. Refuses to demote the final admin (last_admin).
 * Returns not_found if no such user. Runs in a transaction so the admin count
 * and the update are consistent.
 */
export const updateUserRole = async (id: string, role: Role): Promise<MutationResult> => {
  return db.transaction(async (tx) => {
    const rows = await tx.select({ role: user.role }).from(user).where(eq(user.id, id)).limit(1);
    const target = rows[0];
    if(target === undefined) {
      return { ok: false, reason: 'not_found' };
    }
    const demotingAdmin: boolean = target.role === 'admin' && role !== 'admin';
    if(demotingAdmin) {
      const admins = await tx
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(user)
        .where(eq(user.role, 'admin'));
      if((admins[0]?.count ?? 0) <= 1) {
        return { ok: false, reason: 'last_admin' };
      }
    }
    await tx.update(user).set({ role, updatedAt: sql`NOW()` }).where(eq(user.id, id));
    return { ok: true };
  });
};

/**
 * Deletes a user (sessions/accounts cascade). Refuses to delete the final
 * admin (last_admin). Returns not_found if no such user.
 */
export const deleteUser = async (id: string): Promise<MutationResult> => {
  return db.transaction(async (tx) => {
    const rows = await tx.select({ role: user.role }).from(user).where(eq(user.id, id)).limit(1);
    const target = rows[0];
    if(target === undefined) {
      return { ok: false, reason: 'not_found' };
    }
    if(target.role === 'admin') {
      const admins = await tx
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(user)
        .where(eq(user.role, 'admin'));
      if((admins[0]?.count ?? 0) <= 1) {
        return { ok: false, reason: 'last_admin' };
      }
    }
    await tx.delete(user).where(eq(user.id, id));
    return { ok: true };
  });
};
```

- [ ] **Step 2: Verify + commit**

```bash
pnpm tsc:ci && pnpm lint
git add src/db/mutations/users.ts
git commit -m "Added user mutations (create/role/delete) with last-admin guard"
```
Notes: the admin count is done inline inside each transaction (so the count and the write are consistent under the same tx); there is intentionally no standalone `countAdmins` helper. `createUserWithCredentials` import path mirrors `seed/admin.ts` (`../../auth/createUser`). `eq(user.role, 'admin')` — `user.role` is `text`, so the string literal is accepted directly. `sql\`NOW()\`` for `updatedAt` mirrors the alerts/editions mutations.

---

## Task 4: `GET`/`POST /api/admin/users`

**Files:** Create `src/app/api/admin/users/route.ts`

- [ ] **Step 1: Write `src/app/api/admin/users/route.ts`**

```ts
/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';

/* Module imports (project) ---------------------------- */
import { authorizeApi } from 'auth/apiGuard';
import { auth } from 'auth/config';
import { listUsers } from 'db/queries/admin/listUsers';
import { createUser, emailExists } from 'db/mutations/users';
import { createUserSchema } from 'validation/user';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* GET — list all users (admin only; PII) -------------- */
export const GET = async (): Promise<NextResponse> => {
  const { response } = await authorizeApi(['admin']);
  if(response !== null) {
    return response;
  }
  try {
    const users = await listUsers();
    return NextResponse.json({ users });
  } catch(error) {
    console.error('[api/admin/users GET] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};

/* POST — create a user (admin only) ------------------- */
export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const { response } = await authorizeApi(['admin']);
  if(response !== null) {
    return response;
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch(error) {
    console.error('[api/admin/users POST] bad json:', error);
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  const parsed = createUserSchema.safeParse(body);
  if(!parsed.success) {
    return NextResponse.json({ error: 'invalid_request', issues: parsed.error.issues }, { status: 400 });
  }
  try {
    if(await emailExists(parsed.data.email)) {
      return NextResponse.json({ error: 'conflict', message: 'Cet e-mail existe déjà.' }, { status: 409 });
    }
    const id = await createUser(parsed.data);
    if(parsed.data.sendResetEmail) {
      try {
        const origin: string = new URL(request.url).origin;
        await auth.api.requestPasswordReset({
          body: { email: parsed.data.email.toLowerCase(), redirectTo: `${origin}/reset-password` },
        });
      } catch(mailError) {
        console.error('[api/admin/users POST] reset email failed (non-fatal):', mailError);
      }
    }
    return NextResponse.json({ user: { id } }, { status: 201 });
  } catch(error) {
    console.error('[api/admin/users POST] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
```

- [ ] **Step 2: Verify typecheck/lint**

```bash
pnpm tsc:ci && pnpm lint
```
If `auth.api.requestPasswordReset` is not typed (method name differs in the installed version), check `node_modules/better-auth/dist/api/index.d.mts` for the exact name (candidates: `requestPasswordReset`, `forgetPassword`) and adapt; the body shape is `{ email, redirectTo }`. Report any change.

- [ ] **Step 3: Curl-verify** (covered by the combined Task 6 curl; for now just ensure tsc/lint pass)

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/users/route.ts
git commit -m "Added GET/POST /api/admin/users"
```

---

## Task 5: `PATCH`/`DELETE /api/admin/users/[id]`

**Files:** Create `src/app/api/admin/users/[id]/route.ts`

Maps the mutation result: `not_found` → 404, `last_admin` → 409.

- [ ] **Step 1: Write `src/app/api/admin/users/[id]/route.ts`**

```ts
/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';
import { z } from 'zod';

/* Module imports (project) ---------------------------- */
import { authorizeApi } from 'auth/apiGuard';
import { updateUserRole, deleteUser } from 'db/mutations/users';
import { updateRoleSchema } from 'validation/user';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* Schema ---------------------------------------------- */
const idSchema = z.string().uuid();
const LAST_ADMIN_MESSAGE = 'Impossible de retirer le dernier administrateur.';

/* PATCH — change a user's role (admin only) ----------- */
export const PATCH = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> => {
  const { response } = await authorizeApi(['admin']);
  if(response !== null) {
    return response;
  }
  const { id } = await params;
  if(!idSchema.safeParse(id).success) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch(error) {
    console.error('[api/admin/users PATCH] bad json:', error);
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  const parsed = updateRoleSchema.safeParse(body);
  if(!parsed.success) {
    return NextResponse.json({ error: 'invalid_request', issues: parsed.error.issues }, { status: 400 });
  }
  try {
    const result = await updateUserRole(id, parsed.data.role);
    if(!result.ok && result.reason === 'not_found') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    if(!result.ok && result.reason === 'last_admin') {
      return NextResponse.json({ error: 'conflict', message: LAST_ADMIN_MESSAGE }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  } catch(error) {
    console.error('[api/admin/users PATCH] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};

/* DELETE — delete a user (admin only) ----------------- */
export const DELETE = async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> => {
  const { response } = await authorizeApi(['admin']);
  if(response !== null) {
    return response;
  }
  const { id } = await params;
  if(!idSchema.safeParse(id).success) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  try {
    const result = await deleteUser(id);
    if(!result.ok && result.reason === 'not_found') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    if(!result.ok && result.reason === 'last_admin') {
      return NextResponse.json({ error: 'conflict', message: LAST_ADMIN_MESSAGE }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  } catch(error) {
    console.error('[api/admin/users DELETE] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
```

- [ ] **Step 2: Verify + commit**

```bash
pnpm tsc:ci && pnpm lint
git add "src/app/api/admin/users/[id]/route.ts"
git commit -m "Added PATCH/DELETE /api/admin/users/[id]"
```
Note: `z.string().uuid()` matches the editions `[id]` route. If `strict-boolean-expressions` complains about `!result.ok && result.reason === ...` (it shouldn't — `result.ok` is boolean), restructure as a `switch(result.reason)` after an `if(result.ok) { return ... }` early-return and report.

---

## Task 6: Combined route curl verification

**Files:** none (verification only)

- [ ] **Step 1: One dev-server spin covering all four routes**

```bash
( BETTER_AUTH_URL=http://localhost:3000 timeout 130 pnpm dev --port 3000 > /tmp/3d-routes.log 2>&1 & )
sleep 26
P=3000; JAR=/tmp/3d.txt; rm -f $JAR
EMAIL=$(grep -E '^ADMIN_EMAIL=' .env.local | cut -d= -f2-)
PASS=$(grep -E '^ADMIN_PASSWORD=' .env.local | cut -d= -f2-)
curl -s -m10 -c $JAR -o /dev/null -X POST "http://localhost:$P/api/auth/sign-in/email" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}"
echo -n "GET unauth -> "; curl -s -m10 -o /dev/null -w "%{http_code}\n" "http://localhost:$P/api/admin/users"
echo -n "GET authed initial count -> "; curl -s -m10 -b $JAR "http://localhost:$P/api/admin/users" | python3 -c "import sys,json;print(len(json.load(sys.stdin)['users']))"
TESTMAIL="t3d-$(date +%s)@example.com"
echo -n "POST create editor (no email) -> "; curl -s -m10 -b $JAR -H "Origin: http://localhost:$P" -X POST "http://localhost:$P/api/admin/users" -H "Content-Type: application/json" -d "{\"email\":\"$TESTMAIL\",\"firstName\":\"Test\",\"lastName\":\"Editor\",\"password\":\"longenoughpw123\",\"role\":\"editor\",\"sendResetEmail\":false}" -o /tmp/3d-c.json -w "%{http_code}\n"
NEWID=$(python3 -c "import json;print(json.load(open('/tmp/3d-c.json'))['user']['id'])")
echo "new id: $NEWID"
echo -n "POST duplicate email -> "; curl -s -m10 -b $JAR -H "Origin: http://localhost:$P" -X POST "http://localhost:$P/api/admin/users" -H "Content-Type: application/json" -d "{\"email\":\"$TESTMAIL\",\"firstName\":\"X\",\"lastName\":\"Y\",\"password\":\"longenoughpw123\",\"role\":\"viewer\",\"sendResetEmail\":false}" -o /dev/null -w "%{http_code}\n"
echo -n "POST short password -> "; curl -s -m10 -b $JAR -H "Origin: http://localhost:$P" -X POST "http://localhost:$P/api/admin/users" -H "Content-Type: application/json" -d "{\"email\":\"short-$TESTMAIL\",\"firstName\":\"X\",\"lastName\":\"Y\",\"password\":\"short\",\"role\":\"viewer\",\"sendResetEmail\":false}" -o /dev/null -w "%{http_code}\n"
echo -n "PATCH promote to viewer->admin -> "; curl -s -m10 -b $JAR -H "Origin: http://localhost:$P" -X PATCH "http://localhost:$P/api/admin/users/$NEWID" -H "Content-Type: application/json" -d '{"role":"viewer"}' -o /dev/null -w "%{http_code}\n"
echo -n "PATCH bad uuid -> "; curl -s -m10 -b $JAR -H "Origin: http://localhost:$P" -X PATCH "http://localhost:$P/api/admin/users/not-a-uuid" -H "Content-Type: application/json" -d '{"role":"viewer"}' -o /dev/null -w "%{http_code}\n"
echo -n "PATCH bad role -> "; curl -s -m10 -b $JAR -H "Origin: http://localhost:$P" -X PATCH "http://localhost:$P/api/admin/users/$NEWID" -H "Content-Type: application/json" -d '{"role":"superuser"}' -o /dev/null -w "%{http_code}\n"
ADMINID=$(curl -s -m10 -b $JAR "http://localhost:$P/api/admin/users" | python3 -c "import sys,json;print(next(u['id'] for u in json.load(sys.stdin)['users'] if u['email']=='$EMAIL'.lower()))")
echo -n "PATCH demote the only admin -> "; curl -s -m10 -b $JAR -H "Origin: http://localhost:$P" -X PATCH "http://localhost:$P/api/admin/users/$ADMINID" -H "Content-Type: application/json" -d '{"role":"editor"}' -o /tmp/3d-la.json -w "%{http_code}\n"; python3 -c "import json;print('  msg:',json.load(open('/tmp/3d-la.json')).get('message'))"
echo -n "DELETE the only admin -> "; curl -s -m10 -b $JAR -H "Origin: http://localhost:$P" -X DELETE "http://localhost:$P/api/admin/users/$ADMINID" -o /dev/null -w "%{http_code}\n"
echo -n "DELETE the test user -> "; curl -s -m10 -b $JAR -H "Origin: http://localhost:$P" -X DELETE "http://localhost:$P/api/admin/users/$NEWID" -o /dev/null -w "%{http_code}\n"
echo -n "DELETE again -> "; curl -s -m10 -b $JAR -H "Origin: http://localhost:$P" -X DELETE "http://localhost:$P/api/admin/users/$NEWID" -o /dev/null -w "%{http_code}\n"
echo -n "final count (expect initial) -> "; curl -s -m10 -b $JAR "http://localhost:$P/api/admin/users" | python3 -c "import sys,json;print(len(json.load(sys.stdin)['users']))"
sleep 12
```
Expected: GET unauth 401; create editor 201; duplicate 409; short password 400; promote/demote PATCH 200; bad uuid 400; bad role 400; demote-only-admin 409 (msg "Impossible de retirer le dernier administrateur."); delete-only-admin 409; delete test user 200; delete again 404; final count back to initial. Paste the full output. If the admin is NOT the only admin in your DB (extra admins from earlier work), the two last-admin cases may return 200 — in that case note it and confirm the guard logic by reading the mutation (do not leave the seeded admin demoted/deleted; restore with a PATCH back to admin / recreate if needed).

- [ ] **Step 2: No commit** (verification only). Confirm DB restored (only the seeded admin + any pre-existing users remain).

---

## Task 7: Admin users React Query hooks

**Files:** Create `src/hooks/admin/useAdminUsers.ts`

Fetchers surface the server `message` on failure (mirrors `useEditions`'s `postEdition`), so 409 messages reach the toast.

- [ ] **Step 1: Write `src/hooks/admin/useAdminUsers.ts`**

```ts
'use client';

/* Module imports -------------------------------------- */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/* Type imports ---------------------------------------- */
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import type { AdminUserDto } from 'db/queries/admin/listUsers';
import type { CreateUserInput, UpdateRoleInput } from 'validation/user';

/* Constants ------------------------------------------- */
const USERS_KEY = ['admin', 'users'] as const;

/* Fetchers -------------------------------------------- */
const readMessage = async (res: Response, fallback: string): Promise<string> => {
  const body = await res.json().catch(() => ({})) as { message?: string };
  return body.message ?? fallback;
};

const fetchUsers = async (): Promise<AdminUserDto[]> => {
  const res = await fetch('/api/admin/users', { cache: 'no-store' });
  if(!res.ok) {
    throw new Error(`Failed to load users: ${res.status}`);
  }
  const body = await res.json() as { users: AdminUserDto[] };
  return body.users;
};

const postUser = async (input: CreateUserInput): Promise<void> => {
  const res = await fetch('/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if(!res.ok) {
    throw new Error(await readMessage(res, `Création échouée (${res.status})`));
  }
};

const patchRole = async (vars: { id: string; input: UpdateRoleInput }): Promise<void> => {
  const res = await fetch(`/api/admin/users/${vars.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vars.input),
  });
  if(!res.ok) {
    throw new Error(await readMessage(res, `Mise à jour échouée (${res.status})`));
  }
};

const deleteUserRequest = async (id: string): Promise<void> => {
  const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
  if(!res.ok) {
    throw new Error(await readMessage(res, `Suppression échouée (${res.status})`));
  }
};

/* Hooks ----------------------------------------------- */
export const useUsersQuery = (): UseQueryResult<AdminUserDto[], Error> => {
  return useQuery({ queryKey: USERS_KEY, queryFn: fetchUsers });
};

export const useCreateUser = (): UseMutationResult<void, Error, CreateUserInput> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postUser,
    onSuccess: (): void => { void qc.invalidateQueries({ queryKey: USERS_KEY }); },
  });
};

export const useUpdateUserRole = (): UseMutationResult<void, Error, { id: string; input: UpdateRoleInput }> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: patchRole,
    onSuccess: (): void => { void qc.invalidateQueries({ queryKey: USERS_KEY }); },
  });
};

export const useDeleteUser = (): UseMutationResult<void, Error, string> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteUserRequest,
    onSuccess: (): void => { void qc.invalidateQueries({ queryKey: USERS_KEY }); },
  });
};
```

- [ ] **Step 2: Verify + commit**

```bash
pnpm tsc:ci && pnpm lint
git add src/hooks/admin/useAdminUsers.ts
git commit -m "Added TanStack Query hooks for admin users"
```

---

## Task 8: UserFormDialog (create)

**Files:** Create `src/app/admin/users/UserFormDialog.tsx`

Create-only dialog (no edit mode — editing names/emails is out of scope). On 409 the toast shows the server message.

- [ ] **Step 1: Write `src/app/admin/users/UserFormDialog.tsx`**

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

/* Component imports ----------------------------------- */
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from 'components/ui/dialog';
import { Button } from 'components/ui/button';
import { Input } from 'components/ui/input';
import { Label } from 'components/ui/label';
import { Switch } from 'components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'components/ui/select';

/* Module imports (project) ---------------------------- */
import { createUserSchema } from 'validation/user';
import { useCreateUser } from 'hooks/admin/useAdminUsers';

/* Type imports ---------------------------------------- */
import type { CreateUserInput } from 'validation/user';

/* UserFormDialog component prop types ----------------- */
interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/* UserFormDialog component ---------------------------- */
const DEFAULTS: CreateUserInput = {
  email: '',
  firstName: '',
  lastName: '',
  password: '',
  role: 'viewer',
  sendResetEmail: false,
};

const UserFormDialog: React.FC<UserFormDialogProps> = ({ open, onOpenChange }) => {
  const createMutation = useCreateUser();

  const form = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: DEFAULTS,
  });

  useEffect(
    () => {
      if(open) {
        form.reset(DEFAULTS);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open],
  );

  const onSubmit = (values: CreateUserInput): void => {
    createMutation.mutate(values, {
      onSuccess: (): void => { toast.success('Utilisateur créé.'); onOpenChange(false); },
      onError: (error): void => { toast.error(error.message); },
    });
  };

  const pending: boolean = createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvel utilisateur</DialogTitle>
          <DialogDescription>Crée un compte avec mot de passe initial.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e): void => { void form.handleSubmit(onSubmit)(e); }} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" {...form.register('email')} />
            {
              form.formState.errors.email !== undefined &&
                <p className="text-sm text-destructive">E-mail invalide.</p>
            }
          </div>
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1">
              <Label htmlFor="firstName">Prénom</Label>
              <Input id="firstName" {...form.register('firstName')} />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <Label htmlFor="lastName">Nom</Label>
              <Input id="lastName" {...form.register('lastName')} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="password">Mot de passe initial</Label>
            <Input id="password" type="text" {...form.register('password')} />
            {
              form.formState.errors.password !== undefined &&
                <p className="text-sm text-destructive">12 caractères minimum.</p>
            }
          </div>
          <div className="flex flex-col gap-1">
            <Label>Rôle</Label>
            <Controller
              control={form.control}
              name="role"
              render={({ field }): React.ReactElement => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrateur</SelectItem>
                    <SelectItem value="editor">Éditeur</SelectItem>
                    <SelectItem value="viewer">Lecteur</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="flex items-center gap-3">
            <Controller
              control={form.control}
              name="sendResetEmail"
              render={({ field }): React.ReactElement => (
                <Switch id="sendResetEmail" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label htmlFor="sendResetEmail">Envoyer un e-mail de réinitialisation</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={(): void => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Création…' : 'Créer'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

/* Export UserFormDialog component --------------------- */
export default UserFormDialog;
```

- [ ] **Step 2: Verify + commit**

```bash
pnpm tsc:ci && pnpm lint
git add src/app/admin/users/UserFormDialog.tsx
git commit -m "Added user create form dialog"
```
Notes: the password field is `type="text"` deliberately so the admin can read/copy the initial password they're setting. If `zodResolver(createUserSchema)` trips a resolver-typing error (the schema has no transforms, so it should infer cleanly to `CreateUserInput`), add `as never` like `AlertFormDialog` and report. Match the shadcn `Switch`/`Select` prop shapes used in `AlertFormDialog.tsx`.

---

## Task 9: UsersTable (inline role Select + delete)

**Files:** Create `src/app/admin/users/UsersTable.tsx`

A real HTML `<table>` is fine here (no drag-reorder). Inline role `<Select>` → instant PATCH; Supprimer → `ConfirmDialog`.

- [ ] **Step 1: Write `src/app/admin/users/UsersTable.tsx`**

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React, { useState } from 'react';
import { toast } from 'sonner';

/* Component imports ----------------------------------- */
import { Button } from 'components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'components/ui/select';
import ConfirmDialog from 'components/admin/ConfirmDialog';

/* Module imports (project) ---------------------------- */
import { useUsersQuery, useUpdateUserRole, useDeleteUser } from 'hooks/admin/useAdminUsers';

/* Type imports ---------------------------------------- */
import type { AdminUserDto } from 'db/queries/admin/listUsers';
import type { Role } from 'auth/roles';

/* Helpers --------------------------------------------- */
const formatDate = (iso: string): string => new Date(iso).toLocaleDateString('fr-FR');

/* UsersTable component -------------------------------- */
const UsersTable: React.FC = () => {
  const usersQuery = useUsersQuery();
  const updateRole = useUpdateUserRole();
  const deleteUser = useDeleteUser();

  const [deleting, setDeleting] = useState<AdminUserDto | undefined>(undefined);

  const onRoleChange = (userRow: AdminUserDto, role: Role): void => {
    if(role === userRow.role) {
      return;
    }
    updateRole.mutate(
      { id: userRow.id, input: { role } },
      {
        onSuccess: (): void => { toast.success('Rôle mis à jour.'); },
        onError: (error): void => { toast.error(error.message); },
      },
    );
  };

  const confirmDelete = (): void => {
    if(deleting === undefined) {
      return;
    }
    const target = deleting;
    deleteUser.mutate(target.id, {
      onSuccess: (): void => { toast.success('Utilisateur supprimé.'); setDeleting(undefined); },
      onError: (error): void => { toast.error(error.message); setDeleting(undefined); },
    });
  };

  if(usersQuery.isLoading) {
    return <p className="text-muted-foreground">Chargement…</p>;
  }
  if(usersQuery.isError) {
    return <p className="text-destructive">Impossible de charger les utilisateurs.</p>;
  }

  const users: AdminUserDto[] = usersQuery.data ?? [];
  if(users.length === 0) {
    return <p className="text-muted-foreground">Aucun utilisateur.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Nom</th>
              <th className="py-2 pr-3 font-medium">E-mail</th>
              <th className="py-2 pr-3 font-medium">Rôle</th>
              <th className="py-2 pr-3 font-medium">Créé le</th>
              <th className="py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border">
                <td className="py-2 pr-3">{`${u.firstName} ${u.lastName}`}</td>
                <td className="py-2 pr-3 text-muted-foreground">{u.email}</td>
                <td className="py-2 pr-3">
                  <Select value={u.role} onValueChange={(v): void => onRoleChange(u, v as Role)}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrateur</SelectItem>
                      <SelectItem value="editor">Éditeur</SelectItem>
                      <SelectItem value="viewer">Lecteur</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="py-2 pr-3 text-muted-foreground">{formatDate(u.createdAt)}</td>
                <td className="py-2 text-right">
                  <Button variant="destructive" size="sm" onClick={(): void => setDeleting(u)}>Supprimer</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={deleting !== undefined}
        onOpenChange={(o): void => { if(!o) { setDeleting(undefined); } }}
        title="Supprimer cet utilisateur ?"
        description={<span>Cette action est définitive et supprime ses sessions.</span>}
        confirmLabel="Supprimer"
        pending={deleteUser.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

/* Export UsersTable component ------------------------- */
export default UsersTable;
```

- [ ] **Step 2: Verify + commit**

```bash
pnpm tsc:ci && pnpm lint
git add src/app/admin/users/UsersTable.tsx
git commit -m "Added UsersTable (inline role select + delete)"
```
Notes: `v as Role` cast on `onValueChange` — shadcn `Select` types the value as `string`; the cast is required (the four `SelectItem` values are constrained to roles). If `no-unnecessary-type-assertion` flags it, the Select is generic-typed — keep the cast and report. Confirm `ConfirmDialog`'s prop names against `AlertsTable.tsx`'s usage; adapt if different.

---

## Task 10: UsersManager + page replacement + E2E build

**Files:** Create `src/app/admin/users/UsersManager.tsx`; Modify `src/app/admin/users/page.tsx`

- [ ] **Step 1: Write `src/app/admin/users/UsersManager.tsx`**

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React, { useState } from 'react';

/* Component imports ----------------------------------- */
import { Button } from 'components/ui/button';
import UsersTable from './UsersTable';
import UserFormDialog from './UserFormDialog';

/* UsersManager component ------------------------------ */
const UsersManager: React.FC = () => {
  const [createOpen, setCreateOpen] = useState<boolean>(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Utilisateurs</h1>
        <Button onClick={(): void => setCreateOpen(true)}>Nouvel utilisateur</Button>
      </div>

      <UsersTable />

      <UserFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
};

/* Export UsersManager component ----------------------- */
export default UsersManager;
```

- [ ] **Step 2: Replace `src/app/admin/users/page.tsx`** (the placeholder)

```tsx
/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import UsersManager from './UsersManager';

/* Module imports (project) ---------------------------- */
import { requireRole } from 'auth/helpers';

/* UsersPage component --------------------------------- */
const UsersPage = async (): Promise<React.ReactElement> => {
  await requireRole('admin');
  return <UsersManager />;
};

/* Export UsersPage component -------------------------- */
export default UsersPage;
```

- [ ] **Step 3: Verify typecheck/lint**

```bash
pnpm tsc:ci && pnpm lint
```
`requireRole('admin')` redirects non-admins to `/admin` and unauthenticated to `/login` (replaces the placeholder's manual `requireSession` + redirect). Confirm the import path `auth/helpers` and the signature `requireRole(...roles: Role[])` — both already exist.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/users/UsersManager.tsx src/app/admin/users/page.tsx
git commit -m "Added users list page (manager) replacing placeholder"
```

- [ ] **Step 5: Build + final tsc/lint**

```bash
pnpm build
pnpm tsc:ci && pnpm lint
```
Expected: build exit 0; routes include `/admin/users`, `/api/admin/users`, `/api/admin/users/[id]`. tsc/lint clean (1 pre-existing `<img>` warning OK).

- [ ] **Step 6: Browser walk-through (manual)**

```bash
( BETTER_AUTH_URL=http://localhost:3000 pnpm dev --port 3000 > /tmp/3d-browser.log 2>&1 & )
sleep 8
```
As admin at `http://localhost:3000`:
1. `/admin` → Utilisateurs → `/admin/users`; the seeded admin row is listed.
2. "Nouvel utilisateur" → create an `editor` (12+ char password), reset-email off → row appears.
3. Change that user's role inline (editor→viewer) → toast, persists on refresh.
4. Try to demote the sole admin's role to editor → error toast "Impossible de retirer le dernier administrateur.", Select snaps back.
5. Delete the test user (confirm dialog) → gone.
6. (Optional) Log out, log in as the new editor → reaches `/admin` but `/admin/users` redirects to `/admin`.

```bash
pkill -f "next dev --port 3000" 2>/dev/null || true
```

- [ ] **Step 7: No commit** (verification only). Ensure DB restored (test users deleted, seeded admin still admin).

---

## Final verification checklist

- [ ] `pnpm tsc:ci` clean; `pnpm lint` clean (1 pre-existing warning); `pnpm build` exit 0
- [ ] `/api/admin/users` GET 401 unauth / 200 admin / 403 non-admin; POST 201 / 409 duplicate / 400 invalid
- [ ] `/api/admin/users/[id]` PATCH 200 / 404 / 400 bad role / 409 last-admin; DELETE 200 / 404 / 409 last-admin
- [ ] Last-admin guard enforced in the mutation layer (transactional count), not just UI
- [ ] Browser: create / inline role change / blocked last-admin demote / delete; new editor can log in, cannot reach `/admin/users`
- [ ] DB restored (test users deleted) after verification

## Spec coverage map

- §1 scope (list/create/role/delete, admin-only) — Tasks 2,4 (list); 1,3,4,8 (create); 1,3,5,7,9 (role); 3,5,7,9 (delete)
- §2 reuse (createUserWithCredentials, roles, guard helpers) — Tasks 3,10
- §3 data layer (DTO, mutations, counts) — Tasks 2,3
- §4 last-admin guard (server, transactional) — Task 3 (mutation), Task 5 (route mapping), Task 6 (curl)
- §5 validation — Task 1
- §6 routes + reset-email trigger — Tasks 4,5
- §7 admin UI (manager/table/inline select/create dialog/confirm delete) — Tasks 7,8,9,10
- §8 verification — Tasks 6,10
- §9 rollout — Tasks 1–10
- §10 risks (lockout, internal-API coupling, PII, best-effort email) — Tasks 3,4,5
- §11 — out of scope (epic complete)
