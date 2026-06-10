/* Framework imports ----------------------------------- */
import type { MetadataRoute } from 'next';

/* Module imports (project) ---------------------------- */
import { listEditions } from 'db/queries/listEditions';
import { getRequestBaseUrl } from 'lib/baseUrl';

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const editions = await listEditions();
  const base = await getRequestBaseUrl();
  return editions.map((e) => ({
    url: `${base}/${String(e.year)}`,
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));
};

export default sitemap;
