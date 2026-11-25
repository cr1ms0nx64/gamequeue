import { z } from 'zod';
import { NextResponse } from 'next/server';
import { authLimit, transaction } from '@/lib/accounts';
import { sameOrigin, clientKey } from '@/lib/auth-http';
import { digest, hashPassword } from '@/lib/passwords';
import { rateLimited, toResponse, validation } from '@/lib/errors';
const schema=z.object({token:z.string().min(32).max(128),password:z.string().min(12).max(128)});
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    if (!await authLimit('password-reset',clientKey(request),10)) throw rateLimited();
    const input=schema.parse(await request.json());
    const passwordHash=await hashPassword(input.password);
    await transaction(async client=>{
      const result=await client.query(`UPDATE app_password_resets SET used_at=NOW() WHERE token_hash=$1 AND used_at IS NULL AND expires_at>NOW() RETURNING user_id`,[digest(input.token)]);
      if (!result.rows[0]) throw validation('Der Link ist ungültig oder abgelaufen.');
      const userId=Number(result.rows[0].user_id);
      await client.query('UPDATE app_users SET password_hash=$2 WHERE id=$1 AND password_hash IS NOT NULL',[userId,passwordHash]);
      await client.query('DELETE FROM app_sessions WHERE user_id=$1',[userId]);
      await client.query('UPDATE app_password_resets SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL',[userId]);
    });
    return NextResponse.json({ok:true});
  } catch(error) {return toResponse(error);}
}
