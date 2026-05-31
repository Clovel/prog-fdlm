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
