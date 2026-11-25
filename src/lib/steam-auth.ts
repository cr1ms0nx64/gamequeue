import { publicOrigin } from '@/lib/origins';
export const STEAM_ENDPOINT = 'https://steamcommunity.com/openid/login';
export const OPENID_NS = 'http://specs.openid.net/auth/2.0';
export function steamCallback(state: string) { return `${publicOrigin()}/api/auth/steam/callback?state=${encodeURIComponent(state)}`; }
export function steamLoginUrl(state: string) {
  const url = new URL(STEAM_ENDPOINT);
  const params = { 'openid.ns': OPENID_NS, 'openid.mode': 'checkid_setup', 'openid.return_to': steamCallback(state), 'openid.realm': publicOrigin(), 'openid.identity': `${OPENID_NS}/identifier_select`, 'openid.claimed_id': `${OPENID_NS}/identifier_select` };
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url;
}
export function validateSteamAssertion(params: URLSearchParams, state: string, now = Date.now()) {
  for (const key of new Set(params.keys())) if (params.getAll(key).length !== 1) throw new Error('Duplicate assertion field');
  if (params.get('openid.ns') !== OPENID_NS || params.get('openid.mode') !== 'id_res' || params.get('openid.op_endpoint') !== STEAM_ENDPOINT || params.get('openid.return_to') !== steamCallback(state)) throw new Error('Invalid Steam response');
  const claimed = params.get('openid.claimed_id') || '';
  if (claimed !== params.get('openid.identity') || !/^https:\/\/steamcommunity\.com\/openid\/id\/\d{17}$/.test(claimed)) throw new Error('Invalid Steam identity');
  const signed = new Set((params.get('openid.signed') || '').split(','));
  for (const field of ['op_endpoint','return_to','response_nonce','claimed_id','identity']) if (!signed.has(field)) throw new Error('Unsigned Steam field');
  const nonce = params.get('openid.response_nonce') || '';
  const timestamp = Date.parse(nonce.slice(0, 20));
  if (!Number.isFinite(timestamp) || Math.abs(now - timestamp) > 5 * 60_000 || nonce.length > 255) throw new Error('Expired Steam response');
  return { steamId: claimed.split('/').pop()!, nonce };
}
export async function verifySteamAssertion(params: URLSearchParams) {
  const body = new URLSearchParams();
  for (const [key, value] of params) if (key.startsWith('openid.')) body.set(key, value);
  body.set('openid.mode', 'check_authentication');
  const response = await fetch(STEAM_ENDPOINT, { method: 'POST', body, redirect: 'error', signal: AbortSignal.timeout(10_000), cache: 'no-store' });
  const result = await response.text();
  if (!response.ok || !result.split(/\r?\n/).includes('is_valid:true')) throw new Error('Steam verification failed');
}
