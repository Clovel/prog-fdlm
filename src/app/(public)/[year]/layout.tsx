/* Framework imports ----------------------------------- */
import type React from 'react';

/* Module imports (project) ---------------------------- */
import { getEditionCardData } from 'db/queries/getEditionCardData';
import { OG_SITE } from 'lib/shareCard/ogBase';

/* Type imports ---------------------------------------- */
import type { Metadata } from 'next';

/* Metadata -------------------------------------------- */
export const generateMetadata = async(
  { params }: { params: Promise<{ year: string }> },
): Promise<Metadata> => {
  const { year } = await params;
  const yearNum = /^\d{4}$/.test(year) ? Number(year) : null;
  const data = yearNum !== null ? await getEditionCardData(yearNum) : null;

  const title = data !== null
    ? `Fête de la Musique ${data.year} à Bordeaux`
    : 'Fête de la Musique à Bordeaux';

  const desc = data?.description ?? null;
  const description = desc !== null && desc.length > 0
    ? desc
    : 'Le programme de la fête de la musique à Bordeaux.';

  return {
    title,
    description,
    openGraph: {
      ...OG_SITE,
      title,
      description,
    },
  };
};

/* EditionLayout component prop types ------------------ */
interface EditionLayoutProps {
  children: React.ReactNode;
}

/* EditionLayout component ----------------------------- */
// Exists only to host generateMetadata; it renders the page through untouched.
const EditionLayout: React.FC<EditionLayoutProps> = ({ children }) => {
  return children;
};

/* Export EditionLayout component ---------------------- */
export default EditionLayout;
