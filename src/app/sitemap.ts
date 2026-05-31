/* Framework imports ----------------------------------- */
import type { MetadataRoute } from 'next';

/* Module imports (project) ---------------------------- */
import { listEditions } from 'db/queries/listEditions';

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const editions = await listEditions();
  const base = process.env.BETTER_AUTH_URL ?? 'https://prog-fdlm.vercel.app';
  return editions.map((e) => ({
    url: `${base}/${String(e.year)}`,
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));
};

export default sitemap;
