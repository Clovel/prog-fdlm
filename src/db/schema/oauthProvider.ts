/**
 * BetterAuth OIDC/MCP provider tables (model names oauthApplication /
 * oauthAccessToken / oauthConsent). Hand-authored to match the schema declared
 * by better-auth's `mcp()` plugin (which wraps `oidcProvider`), with the same
 * two project conventions as auth.ts:
 *   1. UUID id/FK columns (BetterAuth passes UUID strings via generateId:'uuid').
 *   2. snake_case SQL column names; the Drizzle JS keys mirror BetterAuth's
 *      field names so the drizzle adapter maps field -> column correctly.
 *
 * The drizzle export key (e.g. `oauthApplication`) MUST equal the BetterAuth
 * model name — that is how the drizzle adapter resolves the table. If
 * regenerating after a BetterAuth upgrade, keep the uuid edit and the key names.
 */

/* Module imports -------------------------------------- */
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

/* Module imports (project) ---------------------------- */
import { user } from './auth';

/* oauthApplication ------------------------------------ */
export const oauthApplication = pgTable(
  'oauth_application',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    icon: text('icon'),
    metadata: text('metadata'),
    clientId: text('client_id').notNull().unique(),
    clientSecret: text('client_secret'),
    redirectUrls: text('redirect_urls').notNull(),
    type: text('type').notNull(),
    disabled: boolean('disabled').notNull().default(false),
    userId: uuid('user_id').references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('oauth_application_user_id_idx').on(table.userId)],
);

/* oauthAccessToken ------------------------------------ */
export const oauthAccessToken = pgTable(
  'oauth_access_token',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accessToken: text('access_token').notNull().unique(),
    refreshToken: text('refresh_token').notNull().unique(),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }).notNull(),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }).notNull(),
    clientId: text('client_id').notNull().references(() => oauthApplication.clientId, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => user.id, { onDelete: 'cascade' }),
    scopes: text('scopes').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('oauth_access_token_client_id_idx').on(table.clientId),
    index('oauth_access_token_user_id_idx').on(table.userId),
  ],
);

/* oauthConsent ---------------------------------------- */
export const oauthConsent = pgTable(
  'oauth_consent',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clientId: text('client_id').notNull().references(() => oauthApplication.clientId, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    scopes: text('scopes').notNull(),
    consentGiven: boolean('consent_given').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('oauth_consent_client_id_idx').on(table.clientId),
    index('oauth_consent_user_id_idx').on(table.userId),
  ],
);

/* Inferred types -------------------------------------- */
export type OAuthApplicationRow = typeof oauthApplication.$inferSelect;
export type OAuthAccessTokenRow = typeof oauthAccessToken.$inferSelect;
export type OAuthConsentRow = typeof oauthConsent.$inferSelect;
