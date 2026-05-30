'use client';

/* Framework imports ----------------------------------- */
import React, { useMemo, useState } from 'react';

/* Component imports ----------------------------------- */
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from 'components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from 'components/ui/collapsible';
import EventTime from './EventTime';
import EventTitleBlock from 'components/EventTitleBlock/EventTitleBlock';
import EventRender from 'components/EventRender/EventRender';

/* Type imports ---------------------------------------- */
import type {
  Event,
  EventAlert,
  EventEmbedLink,
  EventLink,
} from 'types/Event';

/* EventListItem component prop types ------------------ */
interface EventListItemProps {
  event: Event;
  feteDeLaMusiqueDay: Date;
}

interface DetailPayload {
  event: {
    id: string;
    editionId: string;
    description: string | null;
    links: Array<{ url: string; label: string }>;
    embedLinks: Array<{ platform: 'instagram' | 'facebook'; url: string }>;
    alerts: Array<{ variant: NonNullable<EventAlert['type']>; title: string | null; content: string }>;
  };
}

/* Helpers --------------------------------------------- */
const summaryHasContent = (event: Event): boolean => {
  if(event.description !== undefined && event.description.length > 0) return true;
  if(event.links !== undefined && event.links.length > 0) return true;
  if(event.embedLinks !== undefined && event.embedLinks.length > 0) return true;
  if(event.alerts !== undefined && event.alerts.length > 0) return true;
  if(event.hasDescription === true) return true;
  if(event.linkCount !== undefined && event.linkCount > 0) return true;
  if(event.embedCount !== undefined && event.embedCount > 0) return true;
  if(event.alertCount !== undefined && event.alertCount > 0) return true;
  return false;
};

/* EventListItem component ----------------------------- */
const EventListItem: React.FC<EventListItemProps> = (
  {
    event,
    feteDeLaMusiqueDay,
  },
) => {
  const [open, setOpen] = useState<boolean>(false);
  const [detailLoaded, setDetailLoaded] = useState<boolean>(false);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [enrichedEvent, setEnrichedEvent] = useState<Event>(event);

  const collapsiblePresent: boolean = useMemo<boolean>(
    () => summaryHasContent(event),
    [event],
  );

  const handleOpenChange = (next: boolean): void => {
    setOpen(next);
    if(next && !detailLoaded && !detailLoading) {
      setDetailLoading(true);
      setDetailError(null);
      fetch(`/api/events/${event.id}`)
        .then(
          async (response): Promise<void> => {
            if(!response.ok) {
              throw new Error(`Detail fetch failed: ${response.status}`);
            }
            const body = await response.json() as DetailPayload;
            const links: EventLink[] = body.event.links.map(({ url, label }) => ({ url, label }));
            const embedLinks: EventEmbedLink[] = body.event.embedLinks.map(
              ({ platform, url }) => ({ type: platform, url }),
            );
            const alerts: EventAlert[] = body.event.alerts.map(
              ({ variant, title, content }) => ({
                type: variant,
                title: title ?? undefined,
                content,
              }),
            );
            setEnrichedEvent(
              {
                ...event,
                description: body.event.description ?? undefined,
                links,
                embedLinks,
                alerts,
              },
            );
            setDetailLoaded(true);
          },
        )
        .catch(
          (error: unknown): void => {
            console.error('[EventListItem] detail fetch failed:', error);
            setDetailError('Impossible de charger les détails.');
          },
        )
        .finally(
          (): void => {
            setDetailLoading(false);
          },
        );
    }
  };

  return (
    <li className="py-2">
      <Collapsible
        open={open}
        onOpenChange={handleOpenChange}
        disabled={!collapsiblePresent}
      >
        <CollapsibleTrigger asChild disabled={!collapsiblePresent}>
          <div className="flex items-center justify-between gap-2 px-4 cursor-pointer rounded-md hover:bg-accent">
            <div className="flex-1 min-w-0 -mx-2 px-2 py-1">
              <EventTitleBlock event={event} />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <EventTime
                startTime={event.startTime}
                endTime={event.endTime}
                feteDeLaMusiqueDay={feteDeLaMusiqueDay}
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label={open ? 'Replier' : 'Déplier'}
              >
                {
                  open ?
                    <ChevronUp className="h-5 w-5" /> :
                    <ChevronDown className="h-5 w-5" />
                }
              </Button>
            </div>
          </div>
        </CollapsibleTrigger>
        {
          collapsiblePresent &&
            <CollapsibleContent>
              {
                detailLoading && !detailLoaded &&
                  <p className="px-4 py-2 text-sm text-muted-foreground">
                    Chargement des détails...
                  </p>
              }
              {
                detailError !== null &&
                  <p className="px-4 py-2 text-sm text-destructive">
                    {detailError}
                  </p>
              }
              {
                detailLoaded &&
                  <EventRender event={enrichedEvent} />
              }
            </CollapsibleContent>
        }
      </Collapsible>
    </li>
  );
};

/* Export EventListItem component ---------------------- */
export default EventListItem;
