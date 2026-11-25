import assert from 'node:assert/strict';
import { Pool } from 'pg';
// Requires a fresh, disposable database and a running app pointing at that database.
// Never truncates data or resets an existing installation.
const base = process.env.TEST_BASE_URL;
const origin = process.env.PUBLIC_ORIGIN;
const setupToken = process.env.TEST_SETUP_TOKEN;
if (!base || !origin || !setupToken || !process.env.DATABASE_URL || !process.env.TEST_DATABASE_DISPOSABLE) throw new Error('Set TEST_BASE_URL, PUBLIC_ORIGIN, TEST_SETUP_TOKEN, DATABASE_URL and TEST_DATABASE_DISPOSABLE=1. Use a fresh test database.');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const query = (sql, args) => pool.query(sql, args);
let checks = 0;
async function request(path, data, cookie = '', expected = 200, requestOrigin = origin) {
  const response = await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', origin: requestOrigin, cookie }, body: JSON.stringify(data), redirect: 'manual' });
  const result = await response.json();
  assert.equal(response.status, expected, `${path}: ${JSON.stringify(result)}`); checks++;
  return { ...result, cookie: response.headers.get('set-cookie')?.split(';')[0] || '' };
}
const credentials = { username: 'testadmin', password: 'Integration-test-only-123!' };
try {
  const health = await fetch(base + '/api/health'); assert.equal(health.status, 200); checks++;
  const table = await query("SELECT to_regclass('public.app_users') AS name");
  if (table.rows[0].name && (await query('SELECT 1 FROM app_users LIMIT 1')).rowCount) throw new Error('Refusing to run against a configured database.');
  await request('/api/auth/setup', { ...credentials, setupToken }, '', 403, 'https://evil.test');
  await request('/api/auth/setup', { ...credentials, setupToken: 'x'.repeat(32) }, '', 403);
  const setupRequests = await Promise.all(['testadmin','secondadmin'].map(username => fetch(base + '/api/auth/setup', { method: 'POST', headers: { 'content-type': 'application/json', origin }, body: JSON.stringify({ username, password: credentials.password, setupToken }) })));
  assert.deepEqual(setupRequests.map(response => response.status).sort(), [200,400]); checks++;
  const winner = setupRequests.findIndex(response => response.status === 200);
  credentials.username = winner === 0 ? 'testadmin' : 'secondadmin';
  const admin = { cookie: setupRequests[winner].headers.get('set-cookie').split(';')[0] };
  assert.equal((await query("SELECT COUNT(*)::int AS n FROM app_users WHERE role='ADMIN'")).rows[0].n, 1); checks++;
  await request('/api/auth/setup', { ...credentials, setupToken }, '', 400);
  await request('/api/auth/register', { username: 'noinvite', password: credentials.password }, '', 400);
  await request('/api/admin', { action: 'invite', days: 7 }, '', 401);
  await request('/api/admin', { action: 'user', id: 1, role: 'USER', disabled: false }, admin.cookie, 400);
  const invitation = await request('/api/admin', { action: 'invite', days: 7 }, admin.cookie);
  const invite = new URL(invitation.inviteUrl).searchParams.get('invite');
  const member = await request('/api/auth/register', { username: 'memberone', password: credentials.password, invite });
  await request('/api/auth/register', { username: 'membertwo', password: credentials.password, invite }, '', 400);
  await request('/api/admin', { action: 'settings', registration: 'open' }, member.cookie, 403);
  await request('/api/auth/login', { username: credentials.username, password: 'incorrect-password' }, '', 401);
  const login = await request('/api/auth/login', credentials); assert.ok(login.cookie); checks++;
  await request('/api/auth/logout', {}, login.cookie);
  await request('/api/admin', { action: 'invite', days: 7 }, login.cookie, 401);
  const revoke = await request('/api/admin', { action: 'invite', days: 7 }, admin.cookie);
  const revokedToken = new URL(revoke.inviteUrl).searchParams.get('invite');
  const { createHash } = await import('node:crypto');
  await request('/api/admin', { action: 'revoke', hash: createHash('sha256').update(revokedToken).digest('hex') }, admin.cookie);
  await request('/api/auth/register', { username: 'revokeduser', password: credentials.password, invite: revokedToken }, '', 400);
  const expired = await request('/api/admin', { action: 'invite', days: 7 }, admin.cookie);
  const expiredToken = new URL(expired.inviteUrl).searchParams.get('invite');
  await query("UPDATE app_invites SET expires_at=NOW()-INTERVAL '1 minute' WHERE token_hash=$1", [createHash('sha256').update(expiredToken).digest('hex')]);
  await request('/api/auth/register', { username: 'expireduser', password: credentials.password, invite: expiredToken }, '', 400);
  await request('/api/admin', { action: 'settings', registration: 'open' }, admin.cookie);
  await query('DELETE FROM app_auth_limits');
  const open = await request('/api/auth/register', { username: 'openuser', password: credentials.password });
  await request('/api/auth/register', { username: 'steam_76561198000000000', password: credentials.password }, '', 400);
  await request('/api/admin', { action: 'settings', registration: 'closed' }, admin.cookie);
  await request('/api/auth/register', { username: 'closeduser', password: credentials.password }, '', 400);
  const memberId = (await query("SELECT id FROM app_users WHERE username='memberone'")).rows[0].id;
  await request('/api/admin', { action: 'user', id: memberId, role: 'USER', disabled: true }, admin.cookie);
  await request('/api/account', { displayName: 'blocked' }, member.cookie, 401);
  await request('/api/auth/login', { username: 'memberone', password: credentials.password }, '', 401);
  await request('/api/account', { displayName: 'Updated', currentPassword: credentials.password, password: 'new-password-123456' }, open.cookie);
  await request('/api/account', { displayName: 'old session' }, open.cookie, 401);
  await request('/api/auth/login', { username: 'openuser', password: 'new-password-123456' });
  // Concurrent single-use invitation: exactly one admission succeeds.
  await request('/api/admin', { action: 'settings', registration: 'invite' }, admin.cookie);
  const raced = await request('/api/admin', { action: 'invite', days: 7 }, admin.cookie);
  const raceToken = new URL(raced.inviteUrl).searchParams.get('invite');
  const races = await Promise.all(['raceone','racetwo'].map(username => fetch(base + '/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json', origin }, body: JSON.stringify({ username, password: credentials.password, invite: raceToken }) })));
  assert.deepEqual(races.map(response => response.status).sort(), [200,400]); checks++;
  // Existing community features use the standalone identity namespace.
  const game = (await query("INSERT INTO games(steam_app_id,slug,title,header_image,created_by_user_id) VALUES(620,'integration-portal','Portal 2','https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/620/header.jpg','fixture') RETURNING id")).rows[0].id;
  const vote = await request(`/api/games/${game}/vote`, { value: 1 }, admin.cookie);
  assert.equal(vote.score ?? vote.vote?.score, 1); checks++;
  await request(`/api/games/${game}/comments`, { body: 'Standalone community comment' }, admin.cookie);
  assert.equal((await query('SELECT user_id FROM votes WHERE game_id=$1',[game])).rows[0].user_id, 'local:1'); checks++;
  const foreignVote = await fetch(base + `/api/games/${game}/vote`, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://evil.test', cookie: admin.cookie }, body: JSON.stringify({ value: 1 }) });
  assert.notEqual(foreignVote.status, 200); checks++;
  // Steam start uses the provider and stores browser-bound state, while forged callbacks fail.
  const steam = await fetch(base + '/api/auth/steam', { redirect: 'manual' }); assert.equal(steam.status, 307); checks++;
  assert.equal(new URL(steam.headers.get('location')).origin, 'https://steamcommunity.com'); checks++;
  const forged = await fetch(base + '/api/auth/steam/callback?state=forged', { redirect: 'manual' });
  assert.equal(new URL(forged.headers.get('location')).pathname, '/login'); checks++;
  await query("DELETE FROM app_auth_limits WHERE key IS NOT NULL");
  for (let i=0; i<10; i++) await request('/api/auth/login', { username: 'unknown', password: 'wrong' }, '', 401);
  await request('/api/auth/login', { username: 'unknown', password: 'wrong' }, '', 429);
  console.log(`Passed ${checks} integration checks against a disposable PostgreSQL database.`);
} finally { await pool.end(); }
