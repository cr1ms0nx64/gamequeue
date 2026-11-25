import { db } from '@/lib/db/pool';
import type { PoolClient } from 'pg';
import { digest } from '@/lib/passwords';
import { validation } from '@/lib/app-error';
export async function transaction<T>(run: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    // Serialize changes to setup, admission rules, invites and administrator access.
    await client.query('SELECT pg_advisory_xact_lock(619405781)');
    const result = await run(client);
    await client.query('COMMIT');
    return result;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
export async function admit(client: PoolClient, invite: string, alreadyHashed = false) {
  const mode = (await client.query('SELECT registration FROM app_settings WHERE id=TRUE')).rows[0].registration;
  if (mode === 'closed') throw validation('Die Registrierung ist geschlossen.');
  if (invite) {
    const result = await client.query(`UPDATE app_invites SET used_at=NOW() WHERE token_hash=$1 AND used_at IS NULL AND NOT revoked AND expires_at>NOW() RETURNING token_hash`, [alreadyHashed ? invite : digest(invite)]);
    if (!result.rowCount) throw validation('Einladung ungültig oder abgelaufen.');
  } else if (mode === 'invite') throw validation('Eine Einladung ist erforderlich.');
}
