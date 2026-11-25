import { forbidden, unauthenticated } from '@/lib/errors';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { asUser } from '@/lib/accounts';
import { digest } from '@/lib/passwords';
import type { GamesUser } from '@/lib/types';
export const SESSION_COOKIE = 'crimson_games_session';
export async function currentUser(): Promise<GamesUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const result = await db.query(`SELECT u.* FROM app_sessions s JOIN app_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>NOW() AND NOT u.disabled`, [digest(token)]);
  return result.rows[0] ? asUser(result.rows[0]) : null;
}
export async function requireUser(): Promise<GamesUser> {
  const user = await currentUser();
  if (!user) throw unauthenticated();
  return user;
}
export async function requireAdmin(): Promise<GamesUser> {
  const user = await requireUser();
  if (user.role !== 'ADMIN') throw forbidden();
  return user;
}
