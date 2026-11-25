import { z } from 'zod';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { transaction, authLimit } from '@/lib/accounts';
import { authError, sameOrigin } from '@/lib/auth-http';
import { randomToken, digest } from '@/lib/passwords';
import { publicOrigin } from '@/lib/origins';
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('settings'), registration: z.enum(['open','invite','closed']) }),
  z.object({ action: z.literal('invite'), days: z.number().int().min(1).max(30) }),
  z.object({ action: z.literal('revoke'), hash: z.string().regex(/^[a-f0-9]{64}$/) }),
  z.object({ action: z.literal('user'), id: z.number().int().positive(), role: z.enum(['ADMIN','USER']), disabled: z.boolean() })
]);
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const admin = await requireAdmin();
    if (!await authLimit('admin', String(admin.id), 100)) throw new Error('RATE_LIMIT');
    const input = schema.parse(await request.json());
    return await transaction(async client => {
      // Recheck under the same lock as role updates to reject concurrent revocations.
      const actor = (await client.query('SELECT role,disabled FROM app_users WHERE id=$1', [admin.id])).rows[0];
      if (!actor || actor.disabled || actor.role !== 'ADMIN') throw new Error('FORBIDDEN');
      if (input.action === 'settings') await client.query('UPDATE app_settings SET registration=$1 WHERE id=TRUE', [input.registration]);
      if (input.action === 'invite') {
        const token = randomToken();
        await client.query(`INSERT INTO app_invites(token_hash,created_by,expires_at) VALUES($1,$2,NOW()+($3 * INTERVAL '1 day'))`, [digest(token), admin.id, input.days]);
        return NextResponse.json({ ok: true, inviteUrl: `${publicOrigin()}/register?invite=${token}` });
      }
      if (input.action === 'revoke') await client.query('UPDATE app_invites SET revoked=TRUE WHERE token_hash=$1', [input.hash]);
      if (input.action === 'user') {
        const target = (await client.query('SELECT role,disabled FROM app_users WHERE id=$1', [input.id])).rows[0];
        if (!target) throw new Error('FORBIDDEN');
        if (target.role === 'ADMIN' && !target.disabled && (input.role !== 'ADMIN' || input.disabled)) {
          const count = (await client.query("SELECT COUNT(*)::int AS count FROM app_users WHERE role='ADMIN' AND NOT disabled")).rows[0].count;
          if (count <= 1) throw new Error('Der letzte aktive Admin muss erhalten bleiben.');
        }
        await client.query('UPDATE app_users SET role=$2,disabled=$3 WHERE id=$1', [input.id, input.role, input.disabled]);
        await client.query('DELETE FROM app_sessions WHERE user_id=$1', [input.id]);
      }
      return NextResponse.json({ ok: true });
    });
  } catch (error) { return authError(error); }
}
