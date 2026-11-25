import { db } from '@/lib/db/pool';
import type { GamesUser } from '@/lib/types';
import { hashPassword } from '@/lib/passwords';
import { transaction,admit } from '@/lib/auth/admission';
import { assertNameAvailable } from '@/lib/names';
import { validation } from '@/lib/errors';
export function asUser(row: Record<string, unknown>): GamesUser {
  return { id: Number(row.id), username: String(row.username), displayName: String(row.display_name), email: null, role: row.role as GamesUser['role'] };
}
export async function isConfigured(): Promise<boolean> {
  return (await db.query('SELECT 1 FROM app_users LIMIT 1')).rowCount !== 0;
}
export async function createLocalUser(input: { username: string; password: string; invite?: string; setup?: boolean }) {
  const passwordHash = await hashPassword(input.password);
  return transaction(async client => {
    const exists = (await client.query('SELECT 1 FROM app_users LIMIT 1')).rowCount !== 0;
    if (input.setup) {
      if (exists) throw validation('Das Setup wurde bereits abgeschlossen.');
    } else {
      if (!exists) throw validation('Bitte zuerst das Setup abschließen.');
      await admit(client, input.invite || '');
    }
    await assertNameAvailable(client,input.username,input.setup ? 'ADMIN' : 'USER');
    const result = await client.query(`INSERT INTO app_users(username,display_name,password_hash,role) VALUES($1,$1,$2,$3) RETURNING *`, [input.username, passwordHash, input.setup ? 'ADMIN' : 'USER']);
    return asUser(result.rows[0]);
  });
}
