// Authenticated admin-MCP smoke test.
// Mints a raw oauth_access_token for the admin user (getMcpSession matches by
// raw value), exercises the admin MCP route end-to-end (auth + role + expiry
// guard + write tools + batch create + delete), then cleans everything up.
// All artifacts (oauth rows + the one test event) are removed before exit.
import postgres from 'postgres';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const SDK = `${process.cwd()}/node_modules/.pnpm/@modelcontextprotocol+sdk@1.29.0_zod@4.4.3/node_modules/@modelcontextprotocol/sdk/dist/esm`;
const { Client } = await import(`${SDK}/client/index.js`);
const { StreamableHTTPClientTransport } = await import(`${SDK}/client/streamableHttp.js`);

const ORIGIN = process.argv[2] ?? 'http://localhost:3000';
const env = readFileSync('.env.local', 'utf8');
const url = env.split('\n').find((l) => l.startsWith('DATABASE_URL=')).slice('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '');
const sql = postgres(url, { prepare: false });

const log = (...a) => console.log(...a);
let pass = 0, fail = 0;
const check = (name, ok) => { if(ok){ pass++; log('  ✅', name); } else { fail++; log('  ❌', name); } };

const adminClient = (token) => {
  const c = new Client({ name: 'admin-test', version: '1.0.0' }, { capabilities: {} });
  const t = new StreamableHTTPClientTransport(new URL(`${ORIGIN}/api/mcp/admin/mcp`), {
    requestInit: { headers: { Authorization: `Bearer ${token}` } },
  });
  return { c, t };
};

const CLIENT_ID = `smoketest_${randomUUID()}`;
const GOOD_TOKEN = `mcptest_good_${randomUUID()}`;
const EXPIRED_TOKEN = `mcptest_exp_${randomUUID()}`;
let createdEventIds = [];

try {
  // ---- fixtures ----
  const admin = (await sql`select id from "user" where role='admin' limit 1`)[0];
  if(!admin) throw new Error('no admin user found');
  const edition = (await sql`select id, year from editions where is_published = true order by year desc limit 1`)[0];
  if(!edition) throw new Error('no published edition found');
  log(`Using admin ${admin.id} and edition ${edition.year} (${edition.id})`);

  await sql`insert into oauth_application (name, client_id, redirect_urls, type, disabled)
            values ('smoke-test', ${CLIENT_ID}, 'http://localhost/cb', 'public', false)`;
  const future = new Date(Date.now() + 3600_000);
  const past = new Date(Date.now() - 3600_000);
  await sql`insert into oauth_access_token
            (access_token, refresh_token, access_token_expires_at, refresh_token_expires_at, client_id, user_id, scopes)
            values (${GOOD_TOKEN}, ${`r_${GOOD_TOKEN}`}, ${future}, ${future}, ${CLIENT_ID}, ${admin.id}, 'openid')`;
  await sql`insert into oauth_access_token
            (access_token, refresh_token, access_token_expires_at, refresh_token_expires_at, client_id, user_id, scopes)
            values (${EXPIRED_TOKEN}, ${`r_${EXPIRED_TOKEN}`}, ${past}, ${future}, ${CLIENT_ID}, ${admin.id}, 'openid')`;

  // ---- test: valid admin token ----
  log('\n[admin token — happy path]');
  {
    const { c, t } = adminClient(GOOD_TOKEN);
    await c.connect(t);
    const tools = (await c.listTools()).tools.map((x) => x.name);
    check('admin sees write tools', ['create_event', 'create_events_batch', 'update_event', 'delete_event'].every((n) => tools.includes(n)));
    check('admin sees read tools too', tools.includes('list_editions'));

    const ev = {
      locationName: '__MCP_SMOKE_TEST__ (safe to delete)',
      startTime: '2026-06-21T18:00:00+02:00',
      genres: [], artists: [], links: [], embedLinks: [], alerts: [],
    };
    const res = await c.callTool({ name: 'create_events_batch', arguments: { editionId: edition.id, events: [ev] } });
    const out = JSON.parse(res.content[0].text ?? '{}');
    check('batch create returned 1 id', res.isError !== true && out.count === 1 && out.ids?.length === 1);
    createdEventIds = out.ids ?? [];

    if(createdEventIds.length) {
      const inDb = (await sql`select id, name, location_name from events where id = ${createdEventIds[0]}`)[0];
      check('event persisted in DB', !!inDb && inDb.location_name === ev.locationName);

      const del = await c.callTool({ name: 'delete_event', arguments: { id: createdEventIds[0] } });
      check('delete_event ok', del.isError !== true);
      const gone = (await sql`select id from events where id = ${createdEventIds[0]}`).length === 0;
      check('event removed from DB', gone);
      if(gone) createdEventIds = [];
    }

    // invalid batch -> rejected, nothing written
    const bad = await c.callTool({ name: 'create_events_batch', arguments: { editionId: edition.id, events: [{ genres: [], artists: [], links: [], embedLinks: [], alerts: [] }] } });
    check('invalid batch rejected (isError)', bad.isError === true);
    await c.close();
  }

  // ---- test: expired token ----
  log('\n[expired token — must be rejected]');
  {
    const { c, t } = adminClient(EXPIRED_TOKEN);
    let rejected = false;
    try {
      await c.connect(t);
      await c.listTools();
    } catch(e) { rejected = true; }
    check('expired token rejected (403/connect fails)', rejected);
    try { await c.close(); } catch { /* noop */ }
  }

  log(`\nRESULT: ${pass} passed, ${fail} failed`);
} catch(e) {
  console.error('TEST ERROR:', e?.message ?? e);
  fail++;
} finally {
  // cleanup — always
  for(const id of createdEventIds) { await sql`delete from events where id = ${id}`.catch(() => {}); }
  await sql`delete from oauth_access_token where client_id = ${CLIENT_ID}`;
  await sql`delete from oauth_application where client_id = ${CLIENT_ID}`;
  await sql.end();
  log('cleanup done');
  process.exit(fail > 0 ? 1 : 0);
}
