# Invite Users Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admins invite users by email + role; the invitee opens a 24h-expiring link, reads a short explanation, sets name + password, and is created with the invited role and logged in. Admins can list/revoke/resend pending invites. Coexists with the Spec 3d direct-create dialog.

**Architecture:** A new `invitation` table (token stored only as a SHA-256 hash; raw token lives only in the email link). Admin-only REST routes create/list/resend/revoke; two public token-gated routes validate and accept. Acceptance creates the user via the existing `createUserWithCredentials`, in a transaction that re-checks email uniqueness. Email is sent via Resend and is the deliverable (rolled back on send failure). Admin UI adds an invite dialog + pending-invitations table on `/admin/users`; the public accept page lives in the `(auth)` route group.

**Tech Stack:** Next.js 16 (App Router), React 19, TS 6, Drizzle + Supabase Postgres, BetterAuth 1.6.x, Resend, @tanstack/react-query, react-hook-form, zod v4, shadcn/ui, sonner, Node `crypto`, pnpm.

**Spec source:** `docs/superpowers/specs/2026-05-31-invite-users-design.md`. Read it once before Task 1.

**Verification note:** No test framework (`CLAUDE.md`). "Verify" = `pnpm tsc:ci`, `pnpm lint`, `pnpm build`, `curl` with an admin cookie jar, browser. DB is Supabase; the dev server runs with `BETTER_AUTH_URL=http://localhost:3000` on port 3000. Admin creds are in `.env.local` (`ADMIN_EMAIL`/`ADMIN_PASSWORD`) — read at runtime, never hardcode.

**Conventions** (`CLAUDE.md`): 2-space indent, single quotes TS / double quotes JSX, semicolons, always-multiline trailing commas, **no space after `if`/`for`/`while`/`catch`** (`if(x)`), `strict-boolean-expressions` (write `x !== undefined && x.length > 0`), `explicit-function-return-type`, comment-banner layout, `import type`, `React.FC<Props>` default-exported, react-hooks v7 (`exhaustive-deps`/`set-state-in-effect` need an eslint-disable on the single line), `toast.*` returns a value → call inside a block-body `(): void => { ... }`. Path alias `*` → `./src/*`. Run `pnpm lint-fix` after edits.

**Reuse map:** `createUserWithCredentials` (`auth/createUser`); `roleSchema`/`Role` (`auth/roles`); `authorizeApi(['admin'])` (`auth/apiGuard`); `sendResetPasswordEmail` pattern (`auth/email`); `authClient.signIn.email` (`auth/client`); 3d `useAdminUsers`/`UsersManager`/`UsersTable`/`ConfirmDialog`; the reset-password page (`(auth)/reset-password/page.tsx`) as the set-password client template; `generalAlerts.ts` as the schema `check`+`uniqueIndex` template. The `(auth)/layout.tsx` centers a `max-w-sm` card.

---

## Task 1: `invitation` schema + migration

**Files:** Create `src/db/schema/invitations.ts`; Modify `src/db/schema/index.ts`; generate + apply migration.

- [ ] **Step 1: Write `src/db/schema/invitations.ts`**

```ts
/* Module imports -------------------------------------- */
import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  timestamp,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';

/* Module imports (project) ---------------------------- */
import { user } from './auth';

/* Table definition ------------------------------------ */
export const invitations = pgTable(
  'invitation',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    role: text('role').notNull(),
    firstName: text('first_name'),
    lastName: text('last_name'),
    tokenHash: text('token_hash').notNull(),
    status: text('status').notNull().default('pending'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    invitedByUserId: uuid('invited_by_user_id').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tokenHashUq: uniqueIndex('invitation_token_hash_uq').on(table.tokenHash),
    pendingEmailUq: uniqueIndex('invitation_pending_email_uq')
      .on(table.email)
      .where(sql`status = 'pending'`),
    createdAtIdx: index('invitation_created_at_idx').on(table.createdAt),
    roleCheck: check('invitation_role_check', sql`${table.role} IN ('admin', 'editor', 'viewer')`),
    statusCheck: check('invitation_status_check', sql`${table.status} IN ('pending', 'accepted', 'revoked')`),
  }),
);

export type InvitationRow = typeof invitations.$inferSelect;
export type InvitationInsert = typeof invitations.$inferInsert;
```

- [ ] **Step 2: Export from `src/db/schema/index.ts`**

Add after the `generalAlerts` export line:
```ts
export * from './invitations';
```

- [ ] **Step 3: Generate + apply the migration**

```bash
pnpm db:generate
pnpm db:migrate
```
Expected: a new `src/db/migrations/0005_*.sql` creating the `invitation` table + indexes; `db:migrate` applies it to Supabase (additive `CREATE TABLE`, safe). Confirm the generated SQL contains the partial unique index `... WHERE status = 'pending'`. If drizzle-kit emits the partial index without the `WHERE` clause, hand-edit the generated `.sql` to add `WHERE status = 'pending'` and re-run `db:migrate` (report this).

- [ ] **Step 4: Verify + commit**

```bash
pnpm tsc:ci && pnpm lint
git add src/db/schema/invitations.ts src/db/schema/index.ts src/db/migrations
git commit -m "Added invitation table + migration"
```
No `--no-verify`. Both clean (pre-existing DescriptionRender `<img>` warning OK).

---

## Task 2: Validation schemas

**Files:** Create `src/validation/invitation.ts`

- [ ] **Step 1: Write `src/validation/invitation.ts`**

```ts
/* Module imports -------------------------------------- */
import { z } from 'zod';

/* Module imports (project) ---------------------------- */
import { roleSchema } from 'auth/roles';

/* Schemas --------------------------------------------- */
export const createInvitationSchema = z.object({
  email: z.email(),
  role: roleSchema,
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(1),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  password: z.string().min(12, '12 caractères minimum'),
});

/* Inferred types -------------------------------------- */
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
```

- [ ] **Step 2: Verify + commit**

```bash
pnpm tsc:ci && pnpm lint
git add src/validation/invitation.ts
git commit -m "Added invitation validation schemas"
```

---

## Task 3: Invite-token helper

**Files:** Create `src/auth/inviteToken.ts`

- [ ] **Step 1: Write `src/auth/inviteToken.ts`**

```ts
/* Module imports -------------------------------------- */
import { randomBytes, createHash } from 'crypto';

/* Helpers --------------------------------------------- */
/** Generates a high-entropy URL-safe token and its SHA-256 hex hash. Only the
 *  hash is persisted; the raw token travels solely in the invitation email. */
export const generateInviteToken = (): { raw: string; hash: string } => {
  const raw: string = randomBytes(32).toString('base64url');
  const hash: string = hashInviteToken(raw);
  return { raw, hash };
};

/** SHA-256 hex of a raw token, for storage and lookup. */
export const hashInviteToken = (raw: string): string => {
  return createHash('sha256').update(raw).digest('hex');
};
```

- [ ] **Step 2: Verify + commit**

```bash
pnpm tsc:ci && pnpm lint
git add src/auth/inviteToken.ts
git commit -m "Added invite-token generate/hash helper"
```
Note: `crypto` is a Node builtin (confirmed available on Node 24). These routes run on the Node.js runtime (default for App Router route handlers), so `crypto` is fine.

---

## Task 4: Invitation queries (validate + admin list)

**Files:** Create `src/db/queries/validateInvitation.ts`; Create `src/db/queries/admin/listInvitations.ts`

`validateInvitation` is imported BOTH by the public validate route AND the accept-page server component (no HTTP hop).

- [ ] **Step 1: Write `src/db/queries/validateInvitation.ts`**

```ts
/* Module imports -------------------------------------- */
import { eq } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../index';
import { invitations } from '../schema';
import { hashInviteToken } from '../../auth/inviteToken';

/* Type imports ---------------------------------------- */
import type { Role } from '../../auth/roles';

/* Types ----------------------------------------------- */
export type InvitationValidation =
  | { valid: true; email: string; role: Role; firstName: string | null; lastName: string | null }
  | { valid: false; reason: 'invalid' | 'expired' | 'used' | 'revoked' };

/* Query ----------------------------------------------- */
export const validateInvitation = async (rawToken: string): Promise<InvitationValidation> => {
  if(rawToken.length === 0) {
    return { valid: false, reason: 'invalid' };
  }
  const hash: string = hashInviteToken(rawToken);
  const rows = await db
    .select({
      email: invitations.email,
      role: invitations.role,
      firstName: invitations.firstName,
      lastName: invitations.lastName,
      status: invitations.status,
      expiresAt: invitations.expiresAt,
    })
    .from(invitations)
    .where(eq(invitations.tokenHash, hash))
    .limit(1);

  const row = rows[0];
  if(row === undefined) {
    return { valid: false, reason: 'invalid' };
  }
  if(row.status === 'accepted') {
    return { valid: false, reason: 'used' };
  }
  if(row.status === 'revoked') {
    return { valid: false, reason: 'revoked' };
  }
  if(row.expiresAt.getTime() <= Date.now()) {
    return { valid: false, reason: 'expired' };
  }
  return {
    valid: true,
    email: row.email,
    role: row.role as Role,
    firstName: row.firstName,
    lastName: row.lastName,
  };
};
```

- [ ] **Step 2: Write `src/db/queries/admin/listInvitations.ts`**

```ts
/* Module imports -------------------------------------- */
import { desc, ne, eq } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../../index';
import { invitations, user } from '../../schema';

/* Type imports ---------------------------------------- */
import type { Role } from '../../../auth/roles';

/* Types ----------------------------------------------- */
export interface AdminInvitationDto {
  id: string;
  email: string;
  role: Role;
  firstName: string | null;
  lastName: string | null;
  status: 'pending' | 'accepted' | 'revoked';
  expiresAt: string;
  isExpired: boolean;
  invitedByEmail: string | null;
  createdAt: string;
}

/* Query ----------------------------------------------- */
export const listInvitations = async (): Promise<AdminInvitationDto[]> => {
  const rows = await db
    .select({
      id: invitations.id,
      email: invitations.email,
      role: invitations.role,
      firstName: invitations.firstName,
      lastName: invitations.lastName,
      status: invitations.status,
      expiresAt: invitations.expiresAt,
      createdAt: invitations.createdAt,
      invitedByEmail: user.email,
    })
    .from(invitations)
    .leftJoin(user, eq(invitations.invitedByUserId, user.id))
    .where(ne(invitations.status, 'accepted'))
    .orderBy(desc(invitations.createdAt));

  const now: number = Date.now();
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    role: r.role as Role,
    firstName: r.firstName,
    lastName: r.lastName,
    status: r.status as AdminInvitationDto['status'],
    expiresAt: r.expiresAt.toISOString(),
    isExpired: r.status === 'pending' && r.expiresAt.getTime() <= now,
    invitedByEmail: r.invitedByEmail,
    createdAt: r.createdAt.toISOString(),
  }));
};
```

- [ ] **Step 3: Verify + commit**

```bash
pnpm tsc:ci && pnpm lint
git add src/db/queries/validateInvitation.ts src/db/queries/admin/listInvitations.ts
git commit -m "Added invitation validate + admin list queries"
```
Note: `user.role`/`invitations.role`/`status` are `text` columns selecting as `string`; the `as Role` / `as ...['status']` narrowing casts are required and not flagged by `no-unnecessary-type-assertion`. If lint flags them, report.

---

## Task 5: Invitation mutations (create/resend/revoke/accept)

**Files:** Create `src/db/mutations/invitations.ts`

- [ ] **Step 1: Write `src/db/mutations/invitations.ts`**

```ts
/* Module imports -------------------------------------- */
import { and, eq, sql } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../index';
import { invitations, user } from '../schema';
import { createUserWithCredentials } from '../../auth/createUser';
import { generateInviteToken, hashInviteToken } from '../../auth/inviteToken';

/* Type imports ---------------------------------------- */
import type { Role } from '../../auth/roles';
import type { CreateInvitationInput, AcceptInvitationInput } from 'validation/invitation';

/* Constants ------------------------------------------- */
const EXPIRY_MS: number = 24 * 60 * 60 * 1000;

/* Result types ---------------------------------------- */
export type CreateInvitationResult =
  | { ok: true; id: string; rawToken: string; email: string; role: Role }
  | { ok: false; reason: 'user_exists' | 'already_invited' };

export type ResendResult =
  | { ok: true; rawToken: string; email: string; role: Role }
  | { ok: false; reason: 'not_found' };

export type AcceptResult =
  | { ok: true; email: string }
  | { ok: false; reason: 'invalid' | 'expired' | 'used' | 'revoked' | 'email_taken' };

/* Helpers --------------------------------------------- */
const expiry = (): Date => new Date(Date.now() + EXPIRY_MS);

/* Mutations ------------------------------------------- */
/**
 * Inserts a pending invitation and returns its raw token. Rejects if a user
 * already exists with that email, or a pending invitation already exists.
 * The caller sends the email and deletes the row (deleteInvitationHard) if the
 * send fails — network I/O is kept out of the DB transaction.
 */
export const createInvitation = async (
  input: CreateInvitationInput,
  invitedByUserId: string,
): Promise<CreateInvitationResult> => {
  const email: string = input.email.toLowerCase();
  return db.transaction(async (tx): Promise<CreateInvitationResult> => {
    const existingUser = await tx.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
    if(existingUser.length > 0) {
      return { ok: false, reason: 'user_exists' };
    }
    const pending = await tx
      .select({ id: invitations.id })
      .from(invitations)
      .where(and(eq(invitations.email, email), eq(invitations.status, 'pending')))
      .limit(1);
    if(pending.length > 0) {
      return { ok: false, reason: 'already_invited' };
    }
    const { raw, hash } = generateInviteToken();
    const rows = await tx
      .insert(invitations)
      .values({
        email,
        role: input.role,
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        tokenHash: hash,
        status: 'pending',
        expiresAt: expiry(),
        invitedByUserId,
      })
      .returning({ id: invitations.id });
    const row = rows[0];
    if(row === undefined) {
      throw new Error('createInvitation: insert returned no row');
    }
    return { ok: true, id: row.id, rawToken: raw, email, role: input.role };
  });
};

/** Hard-deletes an invitation (used to roll back when the email send fails). */
export const deleteInvitationHard = async (id: string): Promise<void> => {
  await db.delete(invitations).where(eq(invitations.id, id));
};

/**
 * Regenerates the token + expiry for a pending invitation and returns the new
 * raw token. Returns not_found if the invitation is missing or not pending.
 */
export const resendInvitation = async (id: string): Promise<ResendResult> => {
  return db.transaction(async (tx): Promise<ResendResult> => {
    const rows = await tx
      .select({ email: invitations.email, role: invitations.role, status: invitations.status })
      .from(invitations)
      .where(eq(invitations.id, id))
      .limit(1);
    const row = rows[0];
    if(row === undefined || row.status !== 'pending') {
      return { ok: false, reason: 'not_found' };
    }
    const { raw, hash } = generateInviteToken();
    await tx
      .update(invitations)
      .set({ tokenHash: hash, expiresAt: expiry(), updatedAt: sql`NOW()` })
      .where(eq(invitations.id, id));
    return { ok: true, rawToken: raw, email: row.email, role: row.role as Role };
  });
};

/** Revokes a pending invitation. Returns false if not found. */
export const revokeInvitation = async (id: string): Promise<boolean> => {
  const rows = await db
    .update(invitations)
    .set({ status: 'revoked', updatedAt: sql`NOW()` })
    .where(eq(invitations.id, id))
    .returning({ id: invitations.id });
  return rows.length > 0;
};

/**
 * Accepts an invitation: re-validates the token, ensures the email is still
 * free, creates the user with the invited role, and marks the invitation
 * accepted — all in one transaction so a double-submit cannot create two users.
 */
export const acceptInvitation = async (input: AcceptInvitationInput): Promise<AcceptResult> => {
  const hash: string = hashInviteToken(input.token);
  return db.transaction(async (tx): Promise<AcceptResult> => {
    const rows = await tx
      .select({
        id: invitations.id,
        email: invitations.email,
        role: invitations.role,
        status: invitations.status,
        expiresAt: invitations.expiresAt,
      })
      .from(invitations)
      .where(eq(invitations.tokenHash, hash))
      .limit(1);
    const row = rows[0];
    if(row === undefined) {
      return { ok: false, reason: 'invalid' };
    }
    if(row.status === 'accepted') {
      return { ok: false, reason: 'used' };
    }
    if(row.status === 'revoked') {
      return { ok: false, reason: 'revoked' };
    }
    if(row.expiresAt.getTime() <= Date.now()) {
      return { ok: false, reason: 'expired' };
    }
    const taken = await tx.select({ id: user.id }).from(user).where(eq(user.email, row.email)).limit(1);
    if(taken.length > 0) {
      return { ok: false, reason: 'email_taken' };
    }
    await createUserWithCredentials({
      email: row.email,
      firstName: input.firstName,
      lastName: input.lastName,
      password: input.password,
      role: row.role as Role,
    });
    await tx.update(invitations).set({ status: 'accepted', updatedAt: sql`NOW()` }).where(eq(invitations.id, row.id));
    return { ok: true, email: row.email };
  });
};
```

- [ ] **Step 2: Verify + commit**

```bash
pnpm tsc:ci && pnpm lint
git add src/db/mutations/invitations.ts
git commit -m "Added invitation mutations (create/resend/revoke/accept)"
```
Notes: `createUserWithCredentials` performs its own BetterAuth writes (not via `tx`); this is acceptable — the surrounding `tx` guards the invitation-row state and the email-uniqueness check, and `user.email` UNIQUE backstops a true race (a duplicate insert throws and rolls back the tx). If the transactional `createUserWithCredentials` call causes connection issues, report; the fallback is to call it outside the tx after the status flip, but the in-tx form is preferred for atomicity. `input.firstName ?? null` — `firstName` is `string | undefined` from the schema.

---

## Task 6: Invitation email

**Files:** Modify `src/auth/email.ts`

- [ ] **Step 1: Add `sendInvitationEmail` to `src/auth/email.ts`** (append after `sendResetPasswordEmail`, reusing the same guard pattern)

```ts
/* Maps a role to its French label for the invitation email. */
const roleLabelFr = (role: string): string => {
  if(role === 'admin') { return 'Administrateur'; }
  if(role === 'editor') { return 'Éditeur'; }
  return 'Lecteur';
};

/**
 * Sends the invitation email via Resend. Reads RESEND_API_KEY / EMAIL_FROM at
 * call time (throws if missing). Awaited by the create/resend routes; a thrown
 * error there triggers a rollback of the invitation row.
 */
export const sendInvitationEmail = async(to: string, url: string, role: string): Promise<void> => {
  const apiKey: string | undefined = process.env.RESEND_API_KEY;
  const from: string | undefined = process.env.EMAIL_FROM;

  if(apiKey === undefined || apiKey.length === 0) {
    throw new Error('RESEND_API_KEY is not set.');
  }
  if(from === undefined || from.length === 0) {
    throw new Error('EMAIL_FROM is not set.');
  }

  const resend: Resend = new Resend(apiKey);
  const safeUrl: string = url.replace(/"/g, '%22');

  const { error } = await resend.emails.send({
    from,
    to,
    subject: 'Invitation à gérer le site de la Fête de la Musique',
    html: `
      <p>Bonjour,</p>
      <p>Vous avez été invité·e à rejoindre l'espace de gestion du site de la Fête de la Musique à Bordeaux, en tant que <strong>${roleLabelFr(role)}</strong>.</p>
      <p><a href="${safeUrl}">Cliquez ici pour créer votre compte</a>.</p>
      <p>Ce lien expire dans 24 heures. Si vous n'attendiez pas cette invitation, ignorez cet email.</p>
    `,
  });

  if(error !== null) {
    throw new Error(`Resend failed to send invitation email: ${error.message}`);
  }
};
```

- [ ] **Step 2: Verify + commit**

```bash
pnpm tsc:ci && pnpm lint
git add src/auth/email.ts
git commit -m "Added invitation email sender"
```
Note: `Resend` is already imported at the top of `email.ts`; reuse the existing import (don't duplicate it).

---

## Task 7: Admin invitation routes

**Files:** Create `src/app/api/admin/invitations/route.ts`; Create `src/app/api/admin/invitations/[id]/route.ts`; Create `src/app/api/admin/invitations/[id]/resend/route.ts`

The create/resend routes build the link from the request origin (mirroring 3d's reset email) and send the email; on send failure they roll back (create) or report (resend).

- [ ] **Step 1: Write `src/app/api/admin/invitations/route.ts`**

```ts
/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';

/* Module imports (project) ---------------------------- */
import { authorizeApi } from 'auth/apiGuard';
import { listInvitations } from 'db/queries/admin/listInvitations';
import { createInvitation, deleteInvitationHard } from 'db/mutations/invitations';
import { sendInvitationEmail } from 'auth/email';
import { createInvitationSchema } from 'validation/invitation';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* GET — list non-accepted invitations (admin only) ---- */
export const GET = async (): Promise<NextResponse> => {
  const { response } = await authorizeApi(['admin']);
  if(response !== null) {
    return response;
  }
  try {
    const invitationsList = await listInvitations();
    return NextResponse.json({ invitations: invitationsList });
  } catch(error) {
    console.error('[api/admin/invitations GET] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};

/* POST — create an invitation + send email (admin only) */
export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const { session, response } = await authorizeApi(['admin']);
  if(response !== null || session === null) {
    return response ?? NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch(error) {
    console.error('[api/admin/invitations POST] bad json:', error);
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  const parsed = createInvitationSchema.safeParse(body);
  if(!parsed.success) {
    return NextResponse.json({ error: 'invalid_request', issues: parsed.error.issues }, { status: 400 });
  }
  try {
    const result = await createInvitation(parsed.data, session.user.id);
    if(!result.ok && result.reason === 'user_exists') {
      return NextResponse.json({ error: 'conflict', message: 'Un utilisateur avec cet e-mail existe déjà.' }, { status: 409 });
    }
    if(!result.ok && result.reason === 'already_invited') {
      return NextResponse.json({ error: 'conflict', message: 'Une invitation est déjà en attente pour cet e-mail.' }, { status: 409 });
    }
    const origin: string = new URL(request.url).origin;
    try {
      await sendInvitationEmail(result.email, `${origin}/invite/${result.rawToken}`, result.role);
    } catch(mailError) {
      console.error('[api/admin/invitations POST] email failed, rolling back:', mailError);
      await deleteInvitationHard(result.id);
      return NextResponse.json({ error: 'email_failed', message: "L'e-mail d'invitation n'a pas pu être envoyé." }, { status: 502 });
    }
    return NextResponse.json({ invitation: { id: result.id } }, { status: 201 });
  } catch(error) {
    console.error('[api/admin/invitations POST] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
```

- [ ] **Step 2: Write `src/app/api/admin/invitations/[id]/route.ts`** (revoke)

```ts
/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';
import { z } from 'zod';

/* Module imports (project) ---------------------------- */
import { authorizeApi } from 'auth/apiGuard';
import { revokeInvitation } from 'db/mutations/invitations';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* Schema ---------------------------------------------- */
const idSchema = z.string().uuid();

/* DELETE — revoke an invitation (admin only) ---------- */
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
    const revoked = await revokeInvitation(id);
    if(!revoked) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch(error) {
    console.error('[api/admin/invitations DELETE] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
```

- [ ] **Step 3: Write `src/app/api/admin/invitations/[id]/resend/route.ts`**

```ts
/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';
import { z } from 'zod';

/* Module imports (project) ---------------------------- */
import { authorizeApi } from 'auth/apiGuard';
import { resendInvitation } from 'db/mutations/invitations';
import { sendInvitationEmail } from 'auth/email';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* Schema ---------------------------------------------- */
const idSchema = z.string().uuid();

/* POST — regenerate token + resend email (admin only) - */
export const POST = async (
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
  try {
    const result = await resendInvitation(id);
    if(!result.ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    const origin: string = new URL(request.url).origin;
    try {
      await sendInvitationEmail(result.email, `${origin}/invite/${result.rawToken}`, result.role);
    } catch(mailError) {
      console.error('[api/admin/invitations resend] email failed:', mailError);
      return NextResponse.json({ error: 'email_failed', message: "L'e-mail n'a pas pu être renvoyé." }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch(error) {
    console.error('[api/admin/invitations resend] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
```

- [ ] **Step 4: Verify + commit**

```bash
pnpm tsc:ci && pnpm lint
git add src/app/api/admin/invitations
git commit -m "Added admin invitation routes (create/list/revoke/resend)"
```
Note: confirm `session.user.id` is typed (it is — `AuthSession` from BetterAuth). If `authorizeApi` returns `session` typed without `.user.id`, read `src/auth/apiGuard.ts`/`helpers.ts` and use the correct accessor; report.

---

## Task 8: Public validate + accept routes

**Files:** Create `src/app/api/invitations/validate/route.ts`; Create `src/app/api/invitations/accept/route.ts`

- [ ] **Step 1: Write `src/app/api/invitations/validate/route.ts`**

```ts
/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';

/* Module imports (project) ---------------------------- */
import { validateInvitation } from 'db/queries/validateInvitation';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* GET — validate an invitation token (public) --------- */
export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const token = new URL(request.url).searchParams.get('token');
  if(token === null || token.length === 0) {
    return NextResponse.json({ valid: false, reason: 'invalid' });
  }
  try {
    const result = await validateInvitation(token);
    return NextResponse.json(result);
  } catch(error) {
    console.error('[api/invitations/validate] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
```

- [ ] **Step 2: Write `src/app/api/invitations/accept/route.ts`**

```ts
/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';

/* Module imports (project) ---------------------------- */
import { acceptInvitation } from 'db/mutations/invitations';
import { acceptInvitationSchema } from 'validation/invitation';

/* Type imports ---------------------------------------- */
import type { NextRequest } from 'next/server';

/* POST — accept an invitation, create the user (public) */
export const POST = async (request: NextRequest): Promise<NextResponse> => {
  let body: unknown;
  try {
    body = await request.json();
  } catch(error) {
    console.error('[api/invitations/accept] bad json:', error);
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  const parsed = acceptInvitationSchema.safeParse(body);
  if(!parsed.success) {
    return NextResponse.json({ error: 'invalid_request', issues: parsed.error.issues }, { status: 400 });
  }
  try {
    const result = await acceptInvitation(parsed.data);
    if(!result.ok && result.reason === 'email_taken') {
      return NextResponse.json({ error: 'conflict', message: 'Un compte existe déjà pour cet e-mail.' }, { status: 409 });
    }
    if(!result.ok) {
      return NextResponse.json({ error: 'invalid_invitation', reason: result.reason, message: 'Cette invitation est invalide ou expirée.' }, { status: 400 });
    }
    return NextResponse.json({ ok: true, email: result.email });
  } catch(error) {
    console.error('[api/invitations/accept] internal error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
};
```

- [ ] **Step 3: Verify + commit**

```bash
pnpm tsc:ci && pnpm lint
git add src/app/api/invitations
git commit -m "Added public invitation validate + accept routes"
```

---

## Task 9: Combined route curl verification

**Files:** none (verification only)

- [ ] **Step 1: One dev-server spin covering all routes + full lifecycle**

```bash
( BETTER_AUTH_URL=http://localhost:3000 timeout 150 pnpm dev --port 3000 > /tmp/inv-routes.log 2>&1 & )
sleep 26
P=3000; JAR=/tmp/inv.txt; rm -f $JAR
EMAIL=$(grep -E '^ADMIN_EMAIL=' .env.local | cut -d= -f2-)
PASS=$(grep -E '^ADMIN_PASSWORD=' .env.local | cut -d= -f2-)
curl -s -m10 -c $JAR -o /dev/null -X POST "http://localhost:$P/api/auth/sign-in/email" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}"
INVMAIL="invitee-$(date +%s)@example.com"
echo -n "GET unauth -> "; curl -s -m10 -o /dev/null -w "%{http_code}\n" "http://localhost:$P/api/admin/invitations"
echo -n "POST create (editor) -> "; curl -s -m10 -b $JAR -H "Origin: http://localhost:$P" -X POST "http://localhost:$P/api/admin/invitations" -H "Content-Type: application/json" -d "{\"email\":\"$INVMAIL\",\"role\":\"editor\"}" -o /tmp/inv-c.json -w "%{http_code}\n"; cat /tmp/inv-c.json
echo; echo -n "POST duplicate-pending (expect 409) -> "; curl -s -m10 -b $JAR -H "Origin: http://localhost:$P" -X POST "http://localhost:$P/api/admin/invitations" -H "Content-Type: application/json" -d "{\"email\":\"$INVMAIL\",\"role\":\"viewer\"}" -o /dev/null -w "%{http_code}\n"
echo -n "POST existing-user email (expect 409) -> "; curl -s -m10 -b $JAR -H "Origin: http://localhost:$P" -X POST "http://localhost:$P/api/admin/invitations" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"role\":\"viewer\"}" -o /dev/null -w "%{http_code}\n"
echo -n "POST invalid email (expect 400) -> "; curl -s -m10 -b $JAR -H "Origin: http://localhost:$P" -X POST "http://localhost:$P/api/admin/invitations" -H "Content-Type: application/json" -d "{\"email\":\"nope\",\"role\":\"viewer\"}" -o /dev/null -w "%{http_code}\n"
INVID=$(curl -s -m10 -b $JAR "http://localhost:$P/api/admin/invitations" | python3 -c "import sys,json;print(next(i['id'] for i in json.load(sys.stdin)['invitations'] if i['email']=='$INVMAIL'))")
echo "invitation id: $INVID"
echo -n "resend (expect 200) -> "; curl -s -m10 -b $JAR -H "Origin: http://localhost:$P" -X POST "http://localhost:$P/api/admin/invitations/$INVID/resend" -o /dev/null -w "%{http_code}\n"
echo -n "revoke (expect 200) -> "; curl -s -m10 -b $JAR -H "Origin: http://localhost:$P" -X DELETE "http://localhost:$P/api/admin/invitations/$INVID" -o /dev/null -w "%{http_code}\n"
echo -n "validate after revoke (expect valid:false revoked) -> "; curl -s -m10 "http://localhost:$P/api/invitations/validate?token=anything" | python3 -c "import sys,json;print(json.load(sys.stdin))"
sleep 12
```
Expected: GET unauth 401; create 201; duplicate-pending 409; existing-user 409; invalid email 400; resend 200; revoke 200; validate(bogus token) → `{'valid': False, 'reason': 'invalid'}`.

- [ ] **Step 2: Real-token lifecycle (seed a known token via tsx, then validate→accept→re-validate)**

Because only the token *hash* is stored, seed an invitation with a known raw token using the project's own helper, then exercise the public flow:

```bash
ACCEPTMAIL="accept-$(date +%s)@example.com"
RAW="testtoken-$(date +%s)-abcdefghijklmnop"
cat > /tmp/seed-inv.ts <<EOF
import { db } from 'db/index';
import { invitations } from 'db/schema';
import { hashInviteToken } from 'auth/inviteToken';
const main = async (): Promise<void> => {
  await db.insert(invitations).values({
    email: '${ACCEPTMAIL}', role: 'viewer', tokenHash: hashInviteToken('${RAW}'),
    status: 'pending', expiresAt: new Date(Date.now() + 3600_000),
  });
  console.log('seeded');
};
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
EOF
pnpm tsx --env-file=.env.local --tsconfig tsconfig.json /tmp/seed-inv.ts 2>&1 | tail -3
P=3000
echo -n "validate (valid) -> "; curl -s -m10 "http://localhost:$P/api/invitations/validate?token=$RAW" | python3 -c "import sys,json;print(json.load(sys.stdin))"
echo -n "accept (expect 200) -> "; curl -s -m10 -H "Origin: http://localhost:$P" -X POST "http://localhost:$P/api/invitations/accept" -H "Content-Type: application/json" -d "{\"token\":\"$RAW\",\"firstName\":\"Test\",\"lastName\":\"Invitee\",\"password\":\"longenoughpw123\"}" -o /dev/null -w "%{http_code}\n"
echo -n "login as the new user (expect 200) -> "; curl -s -m10 -o /dev/null -w "%{http_code}\n" -X POST "http://localhost:$P/api/auth/sign-in/email" -H "Content-Type: application/json" -d "{\"email\":\"$ACCEPTMAIL\",\"password\":\"longenoughpw123\"}"
echo -n "re-validate after accept (expect used) -> "; curl -s -m10 "http://localhost:$P/api/invitations/validate?token=$RAW" | python3 -c "import sys,json;print(json.load(sys.stdin))"
echo -n "accept again (expect 400 used) -> "; curl -s -m10 -H "Origin: http://localhost:$P" -X POST "http://localhost:$P/api/invitations/accept" -H "Content-Type: application/json" -d "{\"token\":\"$RAW\",\"firstName\":\"X\",\"lastName\":\"Y\",\"password\":\"longenoughpw123\"}" -o /dev/null -w "%{http_code}\n"
rm -f /tmp/seed-inv.ts
```
Expected: validate → `{'valid': True, 'email': '...', 'role': 'viewer', ...}`; accept 200; login 200 (the new user can authenticate → proves user+credential created); re-validate → `{'valid': False, 'reason': 'used'}`; accept-again 400. If `pnpm tsx` isn't a script, invoke the local binary (`pnpm exec tsx ...`). Paste outputs.

- [ ] **Step 3: Clean up the test users/invites** (so the DB is restored)

```bash
cat > /tmp/clean-inv.ts <<'EOF'
import { db } from 'db/index';
import { invitations, user } from 'db/schema';
import { like } from 'drizzle-orm';
const main = async (): Promise<void> => {
  await db.delete(user).where(like(user.email, 'accept-%@example.com'));
  await db.delete(invitations).where(like(invitations.email, 'invitee-%@example.com'));
  await db.delete(invitations).where(like(invitations.email, 'accept-%@example.com'));
  console.log('cleaned');
};
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
EOF
pnpm exec tsx --env-file=.env.local /tmp/clean-inv.ts 2>&1 | tail -3; rm -f /tmp/clean-inv.ts
```

- [ ] **Step 4: No commit** (verification only). Confirm only the seeded admin + any pre-existing users remain.

---

## Task 10: Admin invitation React Query hooks

**Files:** Create `src/hooks/admin/useAdminInvitations.ts`

- [ ] **Step 1: Write `src/hooks/admin/useAdminInvitations.ts`**

```ts
'use client';

/* Module imports -------------------------------------- */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/* Type imports ---------------------------------------- */
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import type { AdminInvitationDto } from 'db/queries/admin/listInvitations';
import type { CreateInvitationInput } from 'validation/invitation';

/* Constants ------------------------------------------- */
const INVITATIONS_KEY = ['admin', 'invitations'] as const;

/* Fetchers -------------------------------------------- */
const readMessage = async (res: Response, fallback: string): Promise<string> => {
  const body = await res.json().catch(() => ({})) as { message?: string };
  return body.message ?? fallback;
};

const fetchInvitations = async (): Promise<AdminInvitationDto[]> => {
  const res = await fetch('/api/admin/invitations', { cache: 'no-store' });
  if(!res.ok) {
    throw new Error(`Failed to load invitations: ${res.status}`);
  }
  const body = await res.json() as { invitations: AdminInvitationDto[] };
  return body.invitations;
};

const postInvitation = async (input: CreateInvitationInput): Promise<void> => {
  const res = await fetch('/api/admin/invitations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if(!res.ok) {
    throw new Error(await readMessage(res, `Invitation échouée (${res.status})`));
  }
};

const resendInvitationRequest = async (id: string): Promise<void> => {
  const res = await fetch(`/api/admin/invitations/${id}/resend`, { method: 'POST' });
  if(!res.ok) {
    throw new Error(await readMessage(res, `Renvoi échoué (${res.status})`));
  }
};

const revokeInvitationRequest = async (id: string): Promise<void> => {
  const res = await fetch(`/api/admin/invitations/${id}`, { method: 'DELETE' });
  if(!res.ok) {
    throw new Error(await readMessage(res, `Révocation échouée (${res.status})`));
  }
};

/* Hooks ----------------------------------------------- */
export const useInvitationsQuery = (): UseQueryResult<AdminInvitationDto[], Error> => {
  return useQuery({ queryKey: INVITATIONS_KEY, queryFn: fetchInvitations });
};

export const useCreateInvitation = (): UseMutationResult<void, Error, CreateInvitationInput> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postInvitation,
    onSuccess: (): void => { void qc.invalidateQueries({ queryKey: INVITATIONS_KEY }); },
  });
};

export const useResendInvitation = (): UseMutationResult<void, Error, string> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: resendInvitationRequest,
    onSuccess: (): void => { void qc.invalidateQueries({ queryKey: INVITATIONS_KEY }); },
  });
};

export const useRevokeInvitation = (): UseMutationResult<void, Error, string> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: revokeInvitationRequest,
    onSuccess: (): void => { void qc.invalidateQueries({ queryKey: INVITATIONS_KEY }); },
  });
};
```

- [ ] **Step 2: Verify + commit**

```bash
pnpm tsc:ci && pnpm lint
git add src/hooks/admin/useAdminInvitations.ts
git commit -m "Added TanStack Query hooks for admin invitations"
```

---

## Task 11: Invite dialog + pending-invitations table + wire into UsersManager

**Files:** Create `src/app/admin/users/InviteUserDialog.tsx`; Create `src/app/admin/users/InvitationsTable.tsx`; Modify `src/app/admin/users/UsersManager.tsx`

- [ ] **Step 1: Write `src/app/admin/users/InviteUserDialog.tsx`**

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'components/ui/select';

/* Module imports (project) ---------------------------- */
import { createInvitationSchema } from 'validation/invitation';
import { useCreateInvitation } from 'hooks/admin/useAdminInvitations';

/* Type imports ---------------------------------------- */
import type { CreateInvitationInput } from 'validation/invitation';

/* InviteUserDialog component prop types --------------- */
interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/* InviteUserDialog component -------------------------- */
const DEFAULTS: CreateInvitationInput = {
  email: '',
  role: 'viewer',
  firstName: undefined,
  lastName: undefined,
};

const InviteUserDialog: React.FC<InviteUserDialogProps> = ({ open, onOpenChange }) => {
  const createMutation = useCreateInvitation();

  const form = useForm<CreateInvitationInput>({
    resolver: zodResolver(createInvitationSchema) as never,
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

  const onSubmit = (values: CreateInvitationInput): void => {
    const input: CreateInvitationInput = {
      email: values.email,
      role: values.role,
      firstName: values.firstName !== undefined && values.firstName.length > 0 ? values.firstName : undefined,
      lastName: values.lastName !== undefined && values.lastName.length > 0 ? values.lastName : undefined,
    };
    createMutation.mutate(input, {
      onSuccess: (): void => { toast.success('Invitation envoyée.'); onOpenChange(false); },
      onError: (error): void => { toast.error(error.message); },
    });
  };

  const pending: boolean = createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inviter un utilisateur</DialogTitle>
          <DialogDescription>Un e-mail avec un lien valable 24 heures sera envoyé.</DialogDescription>
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
              <Label htmlFor="firstName">Prénom (optionnel)</Label>
              <Input id="firstName" {...form.register('firstName')} />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <Label htmlFor="lastName">Nom (optionnel)</Label>
              <Input id="lastName" {...form.register('lastName')} />
            </div>
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={(): void => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Envoi…' : 'Inviter'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

/* Export InviteUserDialog component ------------------- */
export default InviteUserDialog;
```
Note: `zodResolver(...) as never` mirrors `UserFormDialog`/`AlertFormDialog` (the optional fields make the resolver typing diverge from the form value type). Keep it.

- [ ] **Step 2: Write `src/app/admin/users/InvitationsTable.tsx`**

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React, { useState } from 'react';
import { toast } from 'sonner';

/* Component imports ----------------------------------- */
import { Badge } from 'components/ui/badge';
import { Button } from 'components/ui/button';
import ConfirmDialog from 'components/admin/ConfirmDialog';

/* Module imports (project) ---------------------------- */
import { useInvitationsQuery, useResendInvitation, useRevokeInvitation } from 'hooks/admin/useAdminInvitations';

/* Type imports ---------------------------------------- */
import type { AdminInvitationDto } from 'db/queries/admin/listInvitations';

/* Helpers --------------------------------------------- */
const formatDate = (iso: string): string => new Date(iso).toLocaleDateString('fr-FR');

const roleLabel = (role: AdminInvitationDto['role']): string => {
  if(role === 'admin') { return 'Administrateur'; }
  if(role === 'editor') { return 'Éditeur'; }
  return 'Lecteur';
};

const statusBadge = (inv: AdminInvitationDto): React.ReactNode => {
  if(inv.status === 'revoked') {
    return <Badge variant="secondary">Révoquée</Badge>;
  }
  if(inv.isExpired) {
    return <Badge variant="secondary">Expirée</Badge>;
  }
  return <Badge variant="default">En attente</Badge>;
};

/* InvitationsTable component -------------------------- */
const InvitationsTable: React.FC = () => {
  const invitationsQuery = useInvitationsQuery();
  const resend = useResendInvitation();
  const revoke = useRevokeInvitation();

  const [revoking, setRevoking] = useState<AdminInvitationDto | undefined>(undefined);

  const onResend = (inv: AdminInvitationDto): void => {
    resend.mutate(inv.id, {
      onSuccess: (): void => { toast.success('Invitation renvoyée.'); },
      onError: (error): void => { toast.error(error.message); },
    });
  };

  const confirmRevoke = (): void => {
    if(revoking === undefined) {
      return;
    }
    const target = revoking;
    revoke.mutate(target.id, {
      onSuccess: (): void => { toast.success('Invitation révoquée.'); setRevoking(undefined); },
      onError: (error): void => { toast.error(error.message); setRevoking(undefined); },
    });
  };

  if(invitationsQuery.isLoading) {
    return <p className="text-muted-foreground">Chargement…</p>;
  }
  if(invitationsQuery.isError) {
    return <p className="text-destructive">Impossible de charger les invitations.</p>;
  }

  const invitations: AdminInvitationDto[] = invitationsQuery.data ?? [];
  if(invitations.length === 0) {
    return <p className="text-muted-foreground">Aucune invitation en attente.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 pr-3 font-medium">E-mail</th>
              <th className="py-2 pr-3 font-medium">Rôle</th>
              <th className="py-2 pr-3 font-medium">Statut</th>
              <th className="py-2 pr-3 font-medium">Expire le</th>
              <th className="py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {invitations.map((inv) => {
              const actionable: boolean = inv.status === 'pending';
              return (
                <tr key={inv.id} className="border-b border-border">
                  <td className="py-2 pr-3">{inv.email}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{roleLabel(inv.role)}</td>
                  <td className="py-2 pr-3">{statusBadge(inv)}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{formatDate(inv.expiresAt)}</td>
                  <td className="py-2 text-right">
                    {
                      actionable &&
                        <span className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" disabled={resend.isPending} onClick={(): void => onResend(inv)}>
                            Renvoyer
                          </Button>
                          <Button variant="destructive" size="sm" onClick={(): void => setRevoking(inv)}>
                            Révoquer
                          </Button>
                        </span>
                    }
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={revoking !== undefined}
        onOpenChange={(o): void => { if(!o) { setRevoking(undefined); } }}
        title="Révoquer cette invitation ?"
        description={<span>Le lien d'invitation cessera de fonctionner.</span>}
        confirmLabel="Révoquer"
        pending={revoke.isPending}
        onConfirm={confirmRevoke}
      />
    </div>
  );
};

/* Export InvitationsTable component ------------------- */
export default InvitationsTable;
```
Confirm `ConfirmDialog` props against `UsersTable.tsx`'s usage; adapt if different. Confirm `Badge` supports `variant="default"|"secondary"` (it does — used in AlertsTable).

- [ ] **Step 3: Wire into `src/app/admin/users/UsersManager.tsx`**

Replace the file with (adds the invite button + invitations section alongside the existing users table + create dialog):
```tsx
'use client';

/* Framework imports ----------------------------------- */
import React, { useState } from 'react';

/* Component imports ----------------------------------- */
import { Button } from 'components/ui/button';
import UsersTable from './UsersTable';
import UserFormDialog from './UserFormDialog';
import InviteUserDialog from './InviteUserDialog';
import InvitationsTable from './InvitationsTable';

/* UsersManager component ------------------------------ */
const UsersManager: React.FC = () => {
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [inviteOpen, setInviteOpen] = useState<boolean>(false);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Utilisateurs</h1>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={(): void => setInviteOpen(true)}>Inviter un utilisateur</Button>
            <Button onClick={(): void => setCreateOpen(true)}>Nouvel utilisateur</Button>
          </div>
        </div>
        <UsersTable />
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Invitations en attente</h2>
        <InvitationsTable />
      </div>

      <UserFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <InviteUserDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
};

/* Export UsersManager component ----------------------- */
export default UsersManager;
```

- [ ] **Step 4: Verify + commit**

```bash
pnpm lint-fix
pnpm tsc:ci && pnpm lint
git add src/app/admin/users/InviteUserDialog.tsx src/app/admin/users/InvitationsTable.tsx src/app/admin/users/UsersManager.tsx
git commit -m "Added invite dialog + pending-invitations table to /admin/users"
```

---

## Task 12: Public accept page + form

**Files:** Create `src/app/(auth)/invite/[token]/page.tsx`; Create `src/app/(auth)/invite/[token]/AcceptInviteForm.tsx`

Lives in the `(auth)` route group (centered `max-w-sm` card; URL is `/invite/<token>`). The page validates server-side (direct call, no HTTP).

- [ ] **Step 1: Write `src/app/(auth)/invite/[token]/page.tsx`**

```tsx
/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import AcceptInviteForm from './AcceptInviteForm';

/* Module imports (project) ---------------------------- */
import { validateInvitation } from 'db/queries/validateInvitation';

/* InvitePage component -------------------------------- */
const InvitePage = async (
  { params }: { params: Promise<{ token: string }> },
): Promise<React.ReactElement> => {
  const { token } = await params;
  const result = await validateInvitation(token);

  if(!result.valid) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6">
        <h1 className="text-xl font-semibold">Invitation invalide</h1>
        <p className="text-sm text-muted-foreground">
          Ce lien d'invitation est invalide, a expiré ou a déjà été utilisé. Demandez à un administrateur de vous en renvoyer un.
        </p>
      </div>
    );
  }

  return (
    <AcceptInviteForm
      token={token}
      email={result.email}
      role={result.role}
      initialFirstName={result.firstName ?? ''}
      initialLastName={result.lastName ?? ''}
    />
  );
};

/* Export InvitePage component ------------------------- */
export default InvitePage;
```

- [ ] **Step 2: Write `src/app/(auth)/invite/[token]/AcceptInviteForm.tsx`**

```tsx
'use client';

/* Framework imports ----------------------------------- */
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

/* Component imports ----------------------------------- */
import { Button } from 'components/ui/button';
import { Input } from 'components/ui/input';
import { Label } from 'components/ui/label';

/* Module imports (project) ---------------------------- */
import { authClient } from 'auth/client';

/* Type imports ---------------------------------------- */
import type { Role } from 'auth/roles';

/* AcceptInviteForm component prop types --------------- */
interface AcceptInviteFormProps {
  token: string;
  email: string;
  role: Role;
  initialFirstName: string;
  initialLastName: string;
}

/* Helpers --------------------------------------------- */
const roleLabel = (role: Role): string => {
  if(role === 'admin') { return 'Administrateur'; }
  if(role === 'editor') { return 'Éditeur'; }
  return 'Lecteur';
};

/* AcceptInviteForm component -------------------------- */
const AcceptInviteForm: React.FC<AcceptInviteFormProps> = (
  { token, email, role, initialFirstName, initialLastName },
) => {
  const router = useRouter();
  const [firstName, setFirstName] = useState<string>(initialFirstName);
  const [lastName, setLastName] = useState<string>(initialLastName);
  const [password, setPassword] = useState<string>('');
  const [confirm, setConfirm] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    if(firstName.trim().length === 0 || lastName.trim().length === 0) {
      setError('Veuillez renseigner votre prénom et votre nom.');
      return;
    }
    if(password.length < 12) {
      setError('Le mot de passe doit contenir au moins 12 caractères.');
      return;
    }
    if(password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setSubmitting(true);
    const res = await fetch('/api/invitations/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, firstName: firstName.trim(), lastName: lastName.trim(), password }),
    });
    if(!res.ok) {
      const body = await res.json().catch(() => ({})) as { message?: string };
      setError(body.message ?? 'Impossible de créer le compte. Le lien a peut-être expiré.');
      setSubmitting(false);
      return;
    }
    const { error: signInError } = await authClient.signIn.email({ email, password });
    if(signInError !== null && signInError !== undefined) {
      router.push('/login?created=1');
      return;
    }
    router.push('/admin');
  };

  return (
    <form
      onSubmit={(e): void => { void handleSubmit(e); }}
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6"
    >
      <h1 className="text-xl font-semibold">Rejoindre la Fête de la Musique</h1>
      <p className="text-sm text-muted-foreground">
        Ce site recense les concerts et événements de la Fête de la Musique à Bordeaux. Vous avez été invité·e
        à participer à sa gestion en tant que <strong>{roleLabel(role)}</strong>. Créez votre compte pour commencer.
      </p>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" value={email} readOnly disabled />
      </div>
      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="firstName">Prénom</Label>
          <Input id="firstName" required value={firstName} onChange={(e): void => setFirstName(e.target.value)} />
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="lastName">Nom</Label>
          <Input id="lastName" required value={lastName} onChange={(e): void => setLastName(e.target.value)} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e): void => setPassword(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirm">Confirmer le mot de passe</Label>
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e): void => setConfirm(e.target.value)}
        />
      </div>

      {
        error !== null &&
          <p className="text-sm text-destructive">{error}</p>
      }

      <Button type="submit" disabled={submitting}>{submitting ? 'Création…' : 'Créer mon compte'}</Button>
    </form>
  );
};

/* Export AcceptInviteForm component ------------------- */
export default AcceptInviteForm;
```

- [ ] **Step 3: Verify + commit**

```bash
pnpm tsc:ci && pnpm lint
git add "src/app/(auth)/invite"
git commit -m "Added public invite accept page + form"
```
Note: confirm `authClient.signIn.email` exists (it does — `auth/client.ts` exports the BetterAuth react client; sign-in is its default surface). If the return shape differs from `{ error }`, mirror the login page's call in `(auth)/login/`.

---

## Task 13: End-to-end verification + build

**Files:** none

- [ ] **Step 1: Build**

```bash
pnpm build
```
Expected exit 0; routes include `/admin/users`, `/api/admin/invitations`, `/api/admin/invitations/[id]`, `/api/admin/invitations/[id]/resend`, `/api/invitations/validate`, `/api/invitations/accept`, and `/invite/[token]`.

- [ ] **Step 2: Re-run the Task 9 curl lifecycle** (admin routes + seeded-token validate→accept→login→re-validate→cleanup) against the built/dev server; confirm all expected codes. Paste outputs.

- [ ] **Step 3: Browser walk-through (manual)**

```bash
( BETTER_AUTH_URL=http://localhost:3000 pnpm dev --port 3000 > /tmp/inv-browser.log 2>&1 & )
sleep 8
```
As admin at `http://localhost:3000`: `/admin/users` → "Inviter un utilisateur" → invite a real address you control with role Éditeur → an email arrives with a link → open it → see the explanation + pre-filled/editable name + password fields → submit → land logged-in on `/admin`. Back in `/admin/users`, the "Invitations en attente" row shows the invite as accepted-gone (it leaves the non-accepted list) and the new user appears in the users table. Also: revoke a fresh invite and confirm its link shows "Invitation invalide"; resend one and confirm a new email arrives.
```bash
pkill -f "next dev --port 3000" 2>/dev/null || true
```

- [ ] **Step 4: Final tsc/lint**

```bash
pnpm tsc:ci && pnpm lint
```
Expected 0 errors (1 pre-existing `<img>` warning OK).

- [ ] **Step 5: No commit** (verification only).

---

## Final verification checklist

- [ ] `pnpm tsc:ci` clean; `pnpm lint` clean (1 pre-existing warning); `pnpm build` exit 0
- [ ] Admin routes: create 201 / dup-pending 409 / existing-user 409 / invalid 400; list 200; resend 200/404; revoke 200/404; all 401 unauth / 403 non-admin
- [ ] Public: validate (valid/expired/used/revoked/invalid); accept 200 → user created + login works; accept again 400; accept revoked/expired 400; email-taken 409
- [ ] Email rolls back the invitation on send failure (create); token only stored hashed; single-use; 24h expiry
- [ ] Browser: invite → email → accept page (explanation + name + password) → logged-in on `/admin`; revoke/resend work
- [ ] `disableSignUp` unchanged; no self-serve account creation introduced
- [ ] DB restored (test invites/users removed) after verification

## Spec coverage map

- §1 goal/scope (invite by email+role, 24h, explanation page, set password → created+logged in, list/revoke/resend, coexist) — Tasks 5,7,8,11,12
- §2 reuse (createUserWithCredentials, roles, email, signIn) — Tasks 5,6,12
- §3 data model (invitation table, partial unique, nullable invitedBy) — Task 1
- §4 token model (sha256 hash, raw only in link, single-use) — Tasks 3,5
- §5 validation — Task 2
- §6 server rules (create/validate/accept/resend/revoke, email rollback, race re-check) — Tasks 5,7,8
- §7 API routes — Tasks 7,8
- §8 email — Task 6
- §9 public accept page (server validate + client form + signIn) — Task 12
- §10 admin UI (invite dialog + pending table) — Task 11
- §11 verification — Tasks 9,13
- §13 risks (email-as-deliverable rollback, token security, accept race, public endpoints, no signup regression) — Tasks 5,7,8