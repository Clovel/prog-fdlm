/* Module imports (project) ---------------------------- */
import { getEventShareData } from 'db/queries/getEventShareData';
import { renderEventShareCard } from 'lib/shareCard/eventShareCard';

/* Route handler --------------------------------------- */
export const GET = async(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
): Promise<Response> => {
  const { eventId } = await params;
  const data = await getEventShareData(eventId);
  if(data === null) {
    return new Response('Not found', { status: 404 });
  }
  return renderEventShareCard(data);
};
