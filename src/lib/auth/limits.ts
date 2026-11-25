import { db } from '@/lib/db/pool';
import { digest } from '@/lib/passwords';
// Database-backed limits work across workers and restarts.
export const LOGIN_PAIR_LIMIT = 10;
export const LOGIN_USERNAME_LIMIT = 50;
export const LOGIN_IP_LIMIT = 60;
export const AUTH_WINDOW_SECONDS = 15 * 60;
const limitState=globalThis as typeof globalThis & { gameQueueNextLimitCleanup?:number };
async function cleanupLimits() {
  if (Date.now() < (limitState.gameQueueNextLimitCleanup||0)) return;
  limitState.gameQueueNextLimitCleanup = Date.now() + 60_000;
  try { await db.query('DELETE FROM app_auth_limits WHERE expires_at<NOW()'); }
  catch(error){console.error('GameQueue: Limit-Aufräumen fehlgeschlagen',error);}
}
export async function checkLimit(scope: string, identity: string, maximum = 10): Promise<boolean> {
  const row = (await db.query('SELECT attempts FROM app_auth_limits WHERE key=$1 AND expires_at>NOW()', [digest(`${scope}:${identity}`)])).rows[0];
  return !row || row.attempts < maximum;
}
export async function recordFailure(scope: string, identity: string, windowSeconds = AUTH_WINDOW_SECONDS): Promise<number> {
  const result = await db.query(`INSERT INTO app_auth_limits(key,attempts,expires_at) VALUES($1,1,NOW()+($2 * INTERVAL '1 second'))
    ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN app_auth_limits.expires_at<=NOW() THEN 1 ELSE app_auth_limits.attempts+1 END,
    expires_at=CASE WHEN app_auth_limits.expires_at<=NOW() THEN NOW()+($2 * INTERVAL '1 second') ELSE app_auth_limits.expires_at END RETURNING attempts`, [digest(`${scope}:${identity}`), windowSeconds]);
  await cleanupLimits();
  return Number(result.rows[0].attempts);
}
export async function resetLimit(scope: string, identity: string) {
  await db.query('DELETE FROM app_auth_limits WHERE key=$1', [digest(`${scope}:${identity}`)]);
}
export async function authLimit(scope: string, identity: string, maximum = 10, windowSeconds = AUTH_WINDOW_SECONDS): Promise<boolean> {
  return await recordFailure(scope, identity, windowSeconds) <= maximum;
}
