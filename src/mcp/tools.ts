/* Module imports -------------------------------------- */
import { z } from 'zod';

/* Module imports (project) ---------------------------- */
import { listEditions } from 'db/queries/listEditions';
import { getEdition } from 'db/queries/getEdition';
import { listEditionEvents } from 'db/queries/listEditionEvents';
import { getEventDetail } from 'db/queries/getEventDetail';
import { createEventsBatch, createEventWithChildren, updateEventWithChildren, deleteEvent } from 'db/mutations/events';
import { createEventObject, updateEventObject, createEventSchema, updateEventSchema, createEventsBatchSchema } from 'validation/event';

/* Type imports ---------------------------------------- */
import type { EventCategory } from 'types/eventCategories';
import type { EventStatus } from 'db/queries/types';

/* Types ----------------------------------------------- */
interface ToolResult { content: Array<{ type: 'text'; text: string }>; isError?: boolean; }
interface McpServer {
  tool: (
    name: string,
    description: string,
    schema: Record<string, z.ZodTypeAny>,
    handler: (args: Record<string, unknown>) => Promise<ToolResult>,
  ) => void;
}

/* Helpers --------------------------------------------- */
const ok = (data: unknown): ToolResult => ({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] });
const fail = (message: string): ToolResult => ({ content: [{ type: 'text', text: message }], isError: true });

/* Read tools (public, published-only) ----------------- */
export const registerReadTools = (server: McpServer): void => {
  server.tool('list_editions', 'List all published festival editions (years).', {}, async (): Promise<ToolResult> => {
    return ok(await listEditions());
  });

  server.tool(
    'get_edition',
    'Get one published edition by year, including its published general alerts.',
    { year: z.number().int() },
    async (args): Promise<ToolResult> => {
      const result = await getEdition(args.year as number);
      return result === null ? fail(`No published edition for year ${String(args.year)}`) : ok(result);
    },
  );

  server.tool(
    'list_events',
    'List events for a published edition. Supports filters and cursor pagination. Returns { events, nextCursor }.',
    {
      year: z.number().int(),
      category: z.string().optional(),
      q: z.string().optional(),
      genre: z.string().optional(),
      status: z.enum(['canceled', 'postponed', 'rescheduled']).optional(),
      cursor: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional(),
    },
    async (args): Promise<ToolResult> => {
      const result = await listEditionEvents({
        year: args.year as number,
        category: args.category as EventCategory | undefined,
        q: args.q as string | undefined,
        genre: args.genre as string | undefined,
        status: args.status as EventStatus | undefined,
        cursor: args.cursor as string | undefined,
        limit: (args.limit as number | undefined) ?? 50,
      });
      return result === null ? fail(`No published edition for year ${String(args.year)}`) : ok(result);
    },
  );

  server.tool(
    'get_event',
    'Get full detail for one event (description, links, embeds, alerts) by id.',
    { eventId: z.string().uuid() },
    async (args): Promise<ToolResult> => {
      const result = await getEventDetail(args.eventId as string);
      return result === null ? fail(`No event ${String(args.eventId)}`) : ok(result);
    },
  );
};

/* Write tools (admin/editor only — gated by the route) */
export const registerWriteTools = (server: McpServer): void => {
  server.tool(
    'create_event',
    'Create one event. Provide editionId and event fields. Returns the new event id.',
    createEventObject.shape,
    async (args): Promise<ToolResult> => {
      const parsed = createEventSchema.safeParse(args);
      if(!parsed.success) {
        return fail(`Validation failed: ${JSON.stringify(parsed.error.issues)}`);
      }
      const id = await createEventWithChildren(parsed.data);
      return ok({ id });
    },
  );

  server.tool(
    'create_events_batch',
    'Create many events in one edition atomically. Validates every event first; if any is invalid, nothing is written. Returns { count, ids }.',
    createEventsBatchSchema.shape,
    async (args): Promise<ToolResult> => {
      const parsed = createEventsBatchSchema.safeParse(args);
      if(!parsed.success) {
        return fail(`Validation failed: ${JSON.stringify(parsed.error.issues)}`);
      }
      const ids = await createEventsBatch(parsed.data.editionId, parsed.data.events);
      return ok({ count: ids.length, ids });
    },
  );

  server.tool(
    'update_event',
    'Update one event by id (replaces all fields). Returns the event id.',
    { id: z.string().uuid(), ...updateEventObject.shape },
    async (args): Promise<ToolResult> => {
      const { id, ...rest } = args;
      const parsed = updateEventSchema.safeParse(rest);
      if(!parsed.success) {
        return fail(`Validation failed: ${JSON.stringify(parsed.error.issues)}`);
      }
      const updated = await updateEventWithChildren(id as string, parsed.data);
      return updated === null ? fail(`No event ${String(id)}`) : ok({ id: updated });
    },
  );

  server.tool(
    'delete_event',
    'Delete one event by id. Returns { deleted: true }.',
    { id: z.string().uuid() },
    async (args): Promise<ToolResult> => {
      const deleted = await deleteEvent(args.id as string);
      return deleted ? ok({ deleted: true }) : fail(`No event ${String(args.id)}`);
    },
  );
};
