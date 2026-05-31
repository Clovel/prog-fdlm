/* Framework imports ----------------------------------- */
import { ApiReference } from '@scalar/nextjs-api-reference';

/* GET — Scalar interactive API reference (Swagger UI) -- */
export const GET = ApiReference({
  url: '/api/openapi.json',
  metaData: {
    title: 'Fête de la Musique Bordeaux — API reference',
  },
});
