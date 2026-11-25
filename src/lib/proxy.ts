import { isIP } from 'node:net';
const state = globalThis as typeof globalThis & { gameQueueProxyWarning?: boolean };
export function proxyMisconfigured(): boolean { return state.gameQueueProxyWarning === true; }
export function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (process.env.TRUST_PROXY !== 'true') {
    if (forwarded !== null && !state.gameQueueProxyWarning) {
      state.gameQueueProxyWarning = true;
      console.warn('SICHERHEITSWARNUNG: X-Forwarded-For erkannt, aber TRUST_PROXY=false. Hinter einem Reverse Proxy muss TRUST_PROXY=true gesetzt und direkter Zugriff auf die App gesperrt werden.');
    }
    return 'shared';
  }
  const hops = Number(process.env.TRUSTED_PROXY_HOPS || '1');
  if (!Number.isInteger(hops) || hops < 1 || hops > 32) return 'unknown';
  const chain = forwarded?.split(',').map(part => part.trim()) || [];
  const address = chain[chain.length - hops];
  return address && isIP(address) ? address.toLowerCase() : 'unknown';
}
