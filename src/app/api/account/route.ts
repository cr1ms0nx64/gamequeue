import { forbidden, rateLimited } from '@/lib/errors';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { assertNameAvailable } from '@/lib/names';
import { authLimit, transaction } from '@/lib/accounts';
import { sameOrigin, authError } from '@/lib/auth-http';
import { hashPassword, verifyPassword } from '@/lib/passwords';
const schema = z.object({ displayName: z.string().trim().min(1).max(64), currentPassword: z.string().max(128).optional(), password: z.string().min(12).max(128).optional() });
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const user = await requireUser();
    if (!await authLimit('account', String(user.id), 10)) throw rateLimited();
    const input = schema.parse(await request.json());
    await transaction(async client=>{
      const row=(await client.query('SELECT * FROM app_users WHERE id=$1 FOR UPDATE',[user.id])).rows[0];
      if(!row || row.disabled)throw forbidden();
      await assertNameAvailable(client,input.displayName,row.role,user.id);
      if(input.password) {
        if(!row.password_hash || !await verifyPassword(input.currentPassword||'',row.password_hash))throw forbidden();
        await client.query('UPDATE app_users SET password_hash=$2,display_name=$3 WHERE id=$1',[user.id,await hashPassword(input.password),input.displayName]);
        await client.query('DELETE FROM app_sessions WHERE user_id=$1',[user.id]);
      }else await client.query('UPDATE app_users SET display_name=$2 WHERE id=$1',[user.id,input.displayName]);
    });
    return NextResponse.json({ ok: true, passwordChanged: Boolean(input.password) });
  } catch (error) { return authError(error); }
}
