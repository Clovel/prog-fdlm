/* Framework imports ----------------------------------- */
import { createMcpHandler } from 'mcp-handler';

/* Module imports (project) ---------------------------- */
import { registerReadTools } from 'mcp/tools';

/* Public read-only MCP server ------------------------- */
const handler = createMcpHandler(
  (server) => {
    registerReadTools(server as never);
  },
  {},
  { basePath: '/api/mcp' },
);

export { handler as GET, handler as POST, handler as DELETE };
