/* Module imports -------------------------------------- */
import { z } from 'zod';

/* Role definitions ------------------------------------ */
/** Single source of truth for user roles. Mirrored by the DB CHECK on `user.role`. */
export const userRoles = ['admin', 'editor', 'viewer'] as const;

export type Role = typeof userRoles[number];

export const DEFAULT_ROLE: Role = 'viewer';

export const roleSchema = z.enum(userRoles);

/** Type guard for narrowing an arbitrary string to a Role. */
export const isRole = (value: string): value is Role =>
  (userRoles as readonly string[]).includes(value);
