import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, randomToken, digest } from '../src/lib/passwords';
import { safeNext } from '../src/lib/navigation';
import { OPENID_NS, STEAM_ENDPOINT, steamCallback, validateSteamAssertion, verifySteamAssertion } from '../src/lib/steam-auth';
process.env.PUBLIC_ORIGIN = 'http://localhost:3000';
function assertion() {
  return new URLSearchParams({ 'state': 'state', 'openid.ns': OPENID_NS, 'openid.mode': 'id_res', 'openid.op_endpoint': STEAM_ENDPOINT, 'openid.return_to': steamCallback('state'), 'openid.identity': 'https://steamcommunity.com/openid/id/76561198000000000', 'openid.claimed_id': 'https://steamcommunity.com/openid/id/76561198000000000', 'openid.signed': 'op_endpoint,return_to,response_nonce,claimed_id,identity', 'openid.response_nonce': new Date().toISOString().replace(/\.\d{3}Z$/, 'Z') + 'unique', 'openid.sig': 'test-signature' });
}
test('salted password hashes and constant-time verification reject wrong passwords', async () => {
  const first = await hashPassword('correct-password-123');
  assert.notEqual(first, await hashPassword('correct-password-123'));
  assert.equal(await verifyPassword('correct-password-123', first), true);
  assert.equal(await verifyPassword('wrong-password-123', first), false);
  assert.equal(await verifyPassword('password', 'malformed'), false);
  assert.equal(digest(randomToken()).length, 64);
});
test('redirects stay on the local origin', () => {
  for (const value of ['https://evil.test', '//evil.test', '/\\evil.test', '/\nevil.test']) assert.equal(safeNext(value), '/');
  assert.equal(safeNext('/submit?from=login'), '/submit?from=login');
});
test('Steam assertion requires exact provider, callback, signed identity and fresh nonce', () => {
  assert.equal(validateSteamAssertion(assertion(), 'state').steamId, '76561198000000000');
  const mutations = [
    ['openid.op_endpoint','https://evil.test'], ['openid.return_to','https://evil.test'], ['openid.ns','invalid'],
    ['openid.identity','https://steamcommunity.com/openid/id/76561198000000001'], ['openid.signed','return_to'],
    ['openid.response_nonce','2001-01-01T00:00:00Zstale'], ['openid.claimed_id','https://evil.test/id/76561198000000000']
  ];
  for (const [key,value] of mutations) { const params = assertion(); params.set(key,value); assert.throws(() => validateSteamAssertion(params,'state')); }
  const duplicate = assertion(); duplicate.append('state','second'); assert.throws(() => validateSteamAssertion(duplicate,'state'));
  assert.throws(() => validateSteamAssertion(assertion(),'other-state'));
});
test('Steam signature is verified at the fixed HTTPS provider and fails closed', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(url, STEAM_ENDPOINT); assert.equal(init?.method, 'POST');
      assert.equal((init?.body as URLSearchParams).get('openid.mode'), 'check_authentication');
      return new Response('ns:http://specs.openid.net/auth/2.0\nis_valid:true\n');
    };
    await verifySteamAssertion(assertion());
    globalThis.fetch = async () => new Response('is_valid:false\n');
    await assert.rejects(verifySteamAssertion(assertion()));
    globalThis.fetch = async () => { throw new Error('network unavailable'); };
    await assert.rejects(verifySteamAssertion(assertion()));
  } finally { globalThis.fetch = original; }
});
