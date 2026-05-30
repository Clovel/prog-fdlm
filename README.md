This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

## Database

The site reads events from a PostgreSQL database via Drizzle. You'll need a Postgres reachable via `DATABASE_URL` (set in `.env.local`, gitignored). Two common setups:

### Option A — Supabase (used in this project)

Create a project at supabase.com, copy the connection string from `Project Settings → Database → Connection string`, and put it in `.env.local`:

```
DATABASE_URL=postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres
```

For best results on Vercel use the **session pooler** URL (port 5432 on the pooler) or the direct URL. The app's postgres-js client is configured with `prepare: false`, which is required if you point it at the transaction-mode pooler (port 6543).

### Option B — Local Postgres via Docker

```bash
docker run --name fdlm-pg \
  -e POSTGRES_PASSWORD=devpass \
  -e POSTGRES_DB=fdlm_dev \
  -p 5432:5432 \
  -d postgres:16
```

Then in `.env.local`:

```
DATABASE_URL=postgres://postgres:devpass@localhost:5432/fdlm_dev
```

(Pick a different host port if 5432 is taken.)

### Apply migrations and seed

```bash
pnpm db:migrate
pnpm db:seed
```

`pnpm db:seed` is idempotent — re-running it preserves child-row UUIDs but overwrites event-row content. For a full reset during local development: drop the DB (or the relevant schema), recreate it, and re-run `db:migrate` followed by `db:seed`.

### Useful commands

- `pnpm db:generate` — regenerate migrations after editing `src/db/schema/*`.
- `pnpm db:studio` — open Drizzle Studio in the browser to inspect data.

## Authentication (BetterAuth)

Email + password auth via BetterAuth. There is no public sign-up — the first admin is seeded and further users are created by admins (Spec 3). Set these in `.env.local` (see `.env.example`): `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, and the `ADMIN_*` seed vars.

Seed the first admin (idempotent — ensures role `admin`, never clobbers an existing password):

```bash
pnpm db:seed:admin
```

Then sign in at `/login`. `/admin/*` is guarded (middleware + an authoritative server layout). Password reset (`/forgot-password` → email → `/reset-password`) sends via Resend.

**Local dev gotcha:** BetterAuth validates the password-reset `redirectTo` against `BETTER_AUTH_URL`. Run the dev server on the port in `BETTER_AUTH_URL` (default `http://localhost:3000`), or update `BETTER_AUTH_URL` to match your dev port — otherwise reset requests fail with `INVALID_REDIRECT_URL`. In production, set `BETTER_AUTH_URL` to the deployed origin.
