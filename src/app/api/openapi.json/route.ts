/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';
import { z } from 'zod';

/* Module imports (project) ---------------------------- */
import { createEventSchema, updateEventSchema, createEventsBatchSchema } from 'validation/event';

/* GET — OpenAPI 3.1 document -------------------------- */
export const GET = (): NextResponse => {
  const doc = {
    openapi: '3.1.0',
    info: {
      title: 'Fête de la Musique Bordeaux API',
      version: '1.0.0',
      description: 'Public read API (published editions) + admin write API. See /api/mcp for the agent (MCP) interface.',
    },
    servers: [{ url: '/' }],
    paths: {
      '/api/editions': {
        get: { summary: 'List published editions', responses: { '200': { description: 'OK' } } },
      },
      '/api/editions/{year}': {
        get: {
          summary: 'Get one published edition',
          parameters: [{ name: 'year', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { '200': { description: 'OK' }, '404': { description: 'Not found' } },
        },
      },
      '/api/editions/{year}/events': {
        get: {
          summary: 'List events for a published edition (cursor paginated)',
          parameters: [
            { name: 'year', in: 'path', required: true, schema: { type: 'integer' } },
            { name: 'category', in: 'query', schema: { type: 'string' } },
            { name: 'q', in: 'query', schema: { type: 'string' } },
            { name: 'genre', in: 'query', schema: { type: 'string' } },
            { name: 'status', in: 'query', schema: { type: 'string' } },
            { name: 'cursor', in: 'query', schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'OK' } },
        },
      },
      '/api/events/{eventId}': {
        get: {
          summary: 'Get event detail',
          parameters: [{ name: 'eventId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '200': { description: 'OK' }, '404': { description: 'Not found' } },
        },
      },
      '/api/admin/events': {
        post: {
          summary: 'Create one event (admin/editor)',
          requestBody: { required: true, content: { 'application/json': { schema: z.toJSONSchema(createEventSchema) } } },
          responses: { '201': { description: 'Created' }, '401': { description: 'Unauthorized' }, '403': { description: 'Forbidden' } },
        },
      },
      '/api/admin/events/{id}': {
        patch: {
          summary: 'Update one event (admin/editor)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: { required: true, content: { 'application/json': { schema: z.toJSONSchema(updateEventSchema) } } },
          responses: { '200': { description: 'OK' } },
        },
        delete: {
          summary: 'Delete one event (admin/editor)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '200': { description: 'OK' } },
        },
      },
    },
    'x-mcp': {
      batchEventSchema: z.toJSONSchema(createEventsBatchSchema),
      publicMcpEndpoint: '/api/mcp/mcp',
      adminMcpEndpoint: '/api/mcp/admin/mcp',
    },
  };
  return NextResponse.json(doc);
};
