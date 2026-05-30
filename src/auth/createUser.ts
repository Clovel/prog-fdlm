/* Module imports (project) ---------------------------- */
import { auth } from './config';

/* Type imports ---------------------------------------- */
import type { Role } from './roles';

/* CreateUserInput interface --------------------------- */
export interface CreateUserInput {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: Role;
}

/**
 * Creates a user + credential account via BetterAuth's internal context,
 * bypassing the disabled public sign-up. Used by the admin seed now and by
 * Spec 3's admin "create user" endpoint later. Returns the new user id.
 *
 * Internal API confirmed against better-auth 1.6.12 (see plan Task 10 spike):
 * additional fields are flat-spread into createUser; the credential account is
 * created with linkAccount, accountId === user.id, password = hash.
 */
export const createUserWithCredentials = async(input: CreateUserInput): Promise<string> => {
  const ctx = await auth.$context;
  const hashedPassword: string = await ctx.password.hash(input.password);

  /*
   * Cast rationale: ctx.internalAdapter.createUser is typed for core user
   * fields only; the additional fields (firstName, lastName, role) defined in
   * config are not reflected in the inferred parameter type. We build the full
   * data object as a typed const and cast it once to satisfy the adapter.
   * Using `as Parameters<typeof ctx.internalAdapter.createUser>[0]` keeps the
   * cast minimal — no `any` involved.
   */
  const userData = {
    email: input.email.toLowerCase(),
    name: `${input.firstName} ${input.lastName}`,
    emailVerified: true,
    image: null,
    firstName: input.firstName,
    lastName: input.lastName,
    role: input.role,
  } as Parameters<typeof ctx.internalAdapter.createUser>[0];

  const created = await ctx.internalAdapter.createUser(userData);

  if(created === null || created === undefined) {
    throw new Error(`Failed to create user: ${input.email}`);
  }

  /*
   * Cast rationale: internalAdapter.createUser return type may be inferred as
   * the core User shape without the `id` field guaranteed as string. We cast
   * `created` to `{ id: string }` minimally to access `id` safely.
   */
  const { id } = created as { id: string };

  await ctx.internalAdapter.linkAccount({
    userId: id,
    providerId: 'credential',
    accountId: id,
    password: hashedPassword,
  });

  return id;
};
