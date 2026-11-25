import { db } from '@/lib/db/pool';
import { digest,randomToken } from '@/lib/passwords';
export async function newSession(userId: number): Promise<string> {
  const token = randomToken();
  await db.query(`DELETE FROM app_sessions WHERE expires_at < NOW()`);
  await db.query(`INSERT INTO app_sessions(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '14 days')`, [digest(token), userId]);
  return token;
}
