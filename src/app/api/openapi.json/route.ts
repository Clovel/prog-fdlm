/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createDocument } from 'zod-openapi';

/* Module imports (project) ---------------------------- */
import { createEventObject, updateEventObject } from 'validation/event';
import { createEditionEmbedSchema, updateEditionEmbedSchema } from 'validation/editionEmbed';

/* Response DTO schemas (mirror db/queries/types.ts) --- */
const editionDto = z.object({
  id: z.uuid(),
  year: z.number().int(),
  description: z.string().nullable(),
}).meta({ id: 'Edition' });

const generalAlertDto = z.object({
  id: z.uuid(),
  variant: z.enum(['default', 'destructive', 'warning', 'success']),
  title: z.string().nullable(),
  content: z.string(),
  position: z.number().int(),
}).meta({ id: 'GeneralAlert' });

const editionEmbedDto = z.object({
  id: z.uuid(),
  platform: z.enum(['instagram', 'facebook']),
  url: z.url(),
}).meta({ id: 'EditionEmbed' });

const editionWithAlertsDto = z.object({
  id: z.uuid(),
  year: z.number().int(),
  description: z.string().nullable(),
  dayOfFestival: z.string(),
  generalAlerts: z.array(generalAlertDto),
  embedLinks: z.array(editionEmbedDto),
}).meta({ id: 'EditionWithAlerts' });

const eventSummaryDto = z.object({
  id: z.uuid(),
  editionId: z.uuid(),
  name: z.string().nullable(),
  category: z.string().nullable(),
  status: z.enum(['canceled', 'postponed', 'rescheduled']).nullable(),
  genres: z.array(z.string()).nullable(),
  artists: z.array(z.string()).nullable(),
  startTime: z.iso.datetime({ offset: true }),
  endTime: z.iso.datetime({ offset: true }).nullable(),
  priceText: z.string().nullable(),
  location: z.object({ name: z.string(), address: z.string().nullable() }),
  hasDescription: z.boolean(),
  linkCount: z.number().int(),
  embedCount: z.number().int(),
  alertCount: z.number().int(),
  favoriteCount: z.number().int(),
  forKids: z.boolean(),
}).meta({ id: 'EventSummary' });

const eventListDto = z.object({
  events: z.array(eventSummaryDto),
  nextCursor: z.string().nullable(),
}).meta({ id: 'EventList' });

const topFavoritedEventDto = z.object({
  id: z.uuid(),
  name: z.string().nullable(),
  category: z.string().nullable(),
  startTime: z.iso.datetime({ offset: true }),
  favoriteCount: z.number().int(),
}).meta({ id: 'TopFavoritedEvent' });

const topFavoritesListDto = z.object({
  events: z.array(topFavoritedEventDto),
}).meta({ id: 'TopFavoritesList' });

const eventDetailDto = z.object({
  id: z.uuid(),
  editionId: z.uuid(),
  description: z.string().nullable(),
  links: z.array(z.object({ url: z.url(), label: z.string() })),
  embedLinks: z.array(z.object({ platform: z.enum(['instagram', 'facebook']), url: z.url() })),
  alerts: z.array(z.object({
    variant: z.enum(['default', 'destructive', 'warning', 'success']),
    title: z.string().nullable(),
    content: z.string(),
  })),
  favoriteCount: z.number().int(),
}).meta({ id: 'EventDetail' });

/* Request body schemas — the ACTUAL validators (truth) */
const createEventBody = createEventObject.meta({ id: 'CreateEvent' });
const updateEventBody = updateEventObject.meta({ id: 'UpdateEvent' });
const createEditionEmbedBody = createEditionEmbedSchema.meta({ id: 'CreateEditionEmbed' });
const updateEditionEmbedBody = updateEditionEmbedSchema.meta({ id: 'UpdateEditionEmbed' });
const createEventsBatchBody = z.object({
  editionId: z.uuid(),
  events: z.array(updateEventObject).min(1).max(100),
}).meta({ id: 'CreateEventsBatch' });

const idResponse = z.object({ id: z.uuid() });

/* Document (generated from Zod — single source of truth) */
const document = createDocument({
  openapi: '3.1.0',
  info: {
    title: 'Fête de la Musique Bordeaux API',
    version: '1.0.0',
    description: 'Public read API (published editions only) + admin write API. '
      + 'AI agents should prefer the MCP interface: public read at /api/mcp/mcp, '
      + 'admin write (OAuth) at /api/mcp/admin/mcp. Interactive docs at /api/docs.',
  },
  servers: [{ url: '/' }],
  paths: {
    '/api/editions': {
      get: {
        summary: 'List published editions',
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: z.array(editionDto) } } },
        },
      },
    },
    '/api/editions/{year}': {
      get: {
        summary: 'Get one published edition (with published general alerts)',
        requestParams: { path: z.object({ year: z.coerce.number().int() }) },
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: editionWithAlertsDto } } },
          '404': { description: 'Not found' },
        },
      },
    },
    '/api/editions/{year}/events': {
      get: {
        summary: 'List events for a published edition (cursor paginated)',
        requestParams: {
          path: z.object({ year: z.coerce.number().int() }),
          query: z.object({
            category: z.string().optional(),
            q: z.string().optional(),
            genre: z.string().optional(),
            status: z.enum(['canceled', 'postponed', 'rescheduled']).optional(),
            cursor: z.string().optional(),
          }),
        },
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: eventListDto } } },
          '404': { description: 'Not found' },
        },
      },
    },
    '/api/editions/{year}/top-favorites': {
      get: {
        summary: 'Top events of a published edition by favorite count',
        requestParams: {
          path: z.object({ year: z.coerce.number().int() }),
          query: z.object({ limit: z.coerce.number().int().min(1).max(50).optional() }),
        },
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: topFavoritesListDto } } },
          '404': { description: 'Not found' },
        },
      },
    },
    '/api/events/{eventId}': {
      get: {
        summary: 'Get event detail',
        requestParams: { path: z.object({ eventId: z.uuid() }) },
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: eventDetailDto } } },
          '404': { description: 'Not found' },
        },
      },
    },
    '/api/admin/events': {
      post: {
        summary: 'Create one event (admin/editor)',
        requestBody: { content: { 'application/json': { schema: createEventBody } } },
        responses: {
          '201': { description: 'Created', content: { 'application/json': { schema: idResponse } } },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
        },
      },
    },
    '/api/admin/events/{id}': {
      patch: {
        summary: 'Update one event (admin/editor)',
        requestParams: { path: z.object({ id: z.uuid() }) },
        requestBody: { content: { 'application/json': { schema: updateEventBody } } },
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: idResponse } } },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Not found' },
        },
      },
      delete: {
        summary: 'Delete one event (admin/editor)',
        requestParams: { path: z.object({ id: z.uuid() }) },
        responses: {
          '200': { description: 'OK' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Not found' },
        },
      },
    },
    '/api/admin/embeds': {
      post: {
        summary: 'Add a social embed to an edition (admin)',
        requestBody: { content: { 'application/json': { schema: createEditionEmbedBody } } },
        responses: {
          '201': { description: 'Created', content: { 'application/json': { schema: idResponse } } },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
        },
      },
    },
    '/api/admin/embeds/{id}': {
      patch: {
        summary: 'Update one edition embed (admin)',
        requestParams: { path: z.object({ id: z.uuid() }) },
        requestBody: { content: { 'application/json': { schema: updateEditionEmbedBody } } },
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: idResponse } } },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Not found' },
        },
      },
      delete: {
        summary: 'Delete one edition embed (admin)',
        requestParams: { path: z.object({ id: z.uuid() }) },
        responses: {
          '200': { description: 'OK' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Not found' },
        },
      },
    },
  },
  /* Documented for the MCP create_events_batch tool (shares this body shape). */
  components: {
    schemas: {
      CreateEventsBatch: createEventsBatchBody,
    },
  },
});

/* GET — generated OpenAPI 3.1 document ---------------- */
export const GET = (): NextResponse => NextResponse.json(document);
