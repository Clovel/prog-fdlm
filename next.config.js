/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /* better-auth and its internal kysely query builder are server-only and must
   * not be bundled by Turbopack/webpack — bundling kysely's barrel breaks its
   * migrator re-exports. Mark them external so they're required at runtime. */
  serverExternalPackages: ['better-auth', 'kysely'],
};

module.exports = nextConfig;
