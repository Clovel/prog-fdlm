/**
 * Seeds the first admin from ADMIN_EMAIL / ADMIN_PASSWORD (+ optional
 * ADMIN_FIRST_NAME / ADMIN_LAST_NAME). Idempotent: if the user exists, ensures
 * role='admin' without touching the password; otherwise creates an admin.
 * Run once after deploy: pnpm db:seed:admin
 */

/* Module imports -------------------------------------- */
import { eq } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from '../index';
import { user } from '../schema';
import { createUserWithCredentials } from '../../auth/createUser';

/* Main ------------------------------------------------ */
const main = async(): Promise<void> => {
  const email: string | undefined = process.env.ADMIN_EMAIL;
  const password: string | undefined = process.env.ADMIN_PASSWORD;
  const firstName: string = process.env.ADMIN_FIRST_NAME ?? 'Admin';
  const lastName: string = process.env.ADMIN_LAST_NAME ?? 'FDLM';

  if(email === undefined || email.length === 0) {
    throw new Error('ADMIN_EMAIL is required.');
  }
  if(password === undefined || password.length === 0) {
    throw new Error('ADMIN_PASSWORD is required.');
  }

  const existing = await db
    .select({ id: user.id, role: user.role })
    .from(user)
    .where(eq(user.email, email.toLowerCase()))
    .limit(1);

  const found = existing[0];
  if(found !== undefined) {
    if(found.role !== 'admin') {
      await db.update(user).set({ role: 'admin' }).where(eq(user.id, found.id));
      console.log(`[seed:admin] Existing user ${email} promoted to admin.`);
    } else {
      console.log(`[seed:admin] Admin ${email} already exists. No change.`);
    }
  } else {
    const id: string = await createUserWithCredentials({
      email,
      firstName,
      lastName,
      password,
      role: 'admin',
    });
    console.log(`[seed:admin] Created admin ${email} (id ${id}).`);
  }
};

main()
  .catch((error) => {
    console.error('[seed:admin] Failed:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
