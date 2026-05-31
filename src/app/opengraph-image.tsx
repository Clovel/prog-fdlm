/* Module imports (project) ---------------------------- */
import { renderShareCard, size, contentType, alt } from 'lib/shareCard/shareCard';

/* Image route metadata -------------------------------- */
export { size, contentType, alt };

/* Image handler --------------------------------------- */
const Image = async(): Promise<Response> => {
  return renderShareCard(null);
};

export default Image;
