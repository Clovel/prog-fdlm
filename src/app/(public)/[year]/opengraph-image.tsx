/* Module imports (project) ---------------------------- */
import { renderShareCard, size, contentType, alt } from 'lib/shareCard/shareCard';

/* Image route metadata -------------------------------- */
export { size, contentType, alt };

/* Image handler --------------------------------------- */
const Image = async({ params }: { params: Promise<{ year: string }> }): Promise<Response> => {
  const { year } = await params;
  return renderShareCard(year);
};

export default Image;
