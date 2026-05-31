/* Framework imports ----------------------------------- */
import type { MetadataRoute } from 'next';

/* robots.txt (absolute sitemap URL per the sitemaps protocol) */
const robots = (): MetadataRoute.Robots => {
  const base = process.env.BETTER_AUTH_URL ?? 'https://prog-fdlm.vercel.app';
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/admin', '/api/mcp/admin'],
    },
    sitemap: `${base}/sitemap.xml`,
  };
};

export default robots;
