/* Framework imports ----------------------------------- */
import type { MetadataRoute } from 'next';

/* Module imports (project) ---------------------------- */
import { getRequestBaseUrl } from 'lib/baseUrl';

/* robots.txt (absolute sitemap URL per the sitemaps protocol) */
const robots = async (): Promise<MetadataRoute.Robots> => {
  const base = await getRequestBaseUrl();
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
