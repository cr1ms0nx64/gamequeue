import type { PoolClient } from 'pg';
import { digest, randomToken } from '@/lib/passwords';
import { notFound, validation } from '@/lib/errors';
import { publicOrigin } from '@/lib/origins';
export async function createPasswordReset(client: PoolClient, userId: number, actorId: number) {
  const row=(await client.query('SELECT password_hash FROM app_users WHERE id=$1 FOR UPDATE',[userId])).rows[0];
  if (!row) throw notFound();
  if (!row.password_hash) throw validation('Steam-Konten setzen ihr Passwort ausschließlich bei Steam zurück.');
  await client.query('UPDATE app_password_resets SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL',[userId]);
  const token=randomToken();
  await client.query("INSERT INTO app_password_resets(token_hash,user_id,created_by,expires_at) VALUES($1,$2,$3,NOW()+INTERVAL '24 hours')",[digest(token),userId,actorId]);
  return `${publicOrigin()}/reset?token=${token}`;
}
