// Headless verification of the public read MCP endpoint.
// Connects via Streamable HTTP, lists tools, calls list_editions.
const SDK = 'node_modules/.pnpm/@modelcontextprotocol+sdk@1.29.0_zod@4.4.3/node_modules/@modelcontextprotocol/sdk/dist/esm';
const { Client } = await import(`${process.cwd()}/${SDK}/client/index.js`);
const { StreamableHTTPClientTransport } = await import(`${process.cwd()}/${SDK}/client/streamableHttp.js`);

const url = process.argv[2] ?? 'http://localhost:3000/api/mcp/mcp';
const client = new Client({ name: 'verify', version: '1.0.0' }, { capabilities: {} });
const transport = new StreamableHTTPClientTransport(new URL(url));

try {
  await client.connect(transport);
  const tools = await client.listTools();
  console.log('TOOLS:', tools.tools.map((t) => t.name).join(', '));
  const res = await client.callTool({ name: 'list_editions', arguments: {} });
  const text = res.content?.[0]?.text ?? '';
  console.log('list_editions ok, isError=', res.isError === true, 'len=', text.length);
  console.log('SAMPLE:', text.slice(0, 300));
  await client.close();
  console.log('VERIFY_OK');
} catch (e) {
  console.error('VERIFY_FAIL', e?.message ?? e);
  process.exit(1);
}
