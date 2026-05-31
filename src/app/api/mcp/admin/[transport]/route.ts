/* Framework imports ----------------------------------- */
import { createMcpHandler } from 'mcp-handler';
import { withMcpAuth } from 'better-auth/plugins';
import { eq } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { auth } from 'auth/config';
import { db } from 'db';
import { user } from 'db/schema';
import { registerReadTools, registerWriteTools } from 'mcp/tools';

/* MCP handler (read + write tools) -------------------- */
const buildHandler = (req: Request): Promise<Response> =>
  createMcpHandler(
    (server) => {
      registerReadTools(server as never);
      registerWriteTools(server as never);
    },
    {},
    { basePath: '/api/mcp/admin' },
  )(req);

const forbidden = (): Response =>
  new Response(JSON.stringify({ error: 'forbidden' }), {
    status: 403,
    headers: { 'content-type': 'application/json' },
  });

/* Admin MCP server (OAuth-gated, admin/editor) -------- */
const handler = withMcpAuth(auth, async(req, session): Promise<Response> => {
  const userId = session.userId;
  if(userId === undefined || userId === null) {
    return forbidden();
  }
  const rows = await db.select({ role: user.role }).from(user).where(eq(user.id, userId)).limit(1);
  const role = rows[0]?.role;
  if(role !== 'admin' && role !== 'editor') {
    return forbidden();
  }
  return buildHandler(req);
});

export { handler as GET, handler as POST, handler as DELETE };
