/* Framework imports ----------------------------------- */
import { NextResponse } from 'next/server';

/* Module imports (project) ---------------------------- */
import { listEditions } from 'db/queries/listEditions';

export const GET = async (): Promise<NextResponse> => {
  const editions = await listEditions();
  const years = editions.map((e) => `- /${String(e.year)} : programme de l'édition ${String(e.year)}`).join('\n');
  const body = `# Fête de la Musique — Bordeaux

Agenda des concerts et évènements de la Fête de la Musique à Bordeaux.

## Données pour agents IA
- Interface MCP publique (lecture, sans authentification) : /api/mcp/mcp
- Interface MCP admin (écriture, OAuth) : /api/mcp/admin/mcp
- Schéma OpenAPI : /api/openapi.json

## Éditions publiées
${years}
`;
  return new NextResponse(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
