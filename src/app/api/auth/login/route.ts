import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authLimit } from '@/lib/accounts';
import { sameOrigin, authError, clientKey, sessionResponse } from '@/lib/auth-http';
import { hashPassword, verifyPassword } from '@/lib/passwords';
const schema = z.object({ username: z.string().min(1).max(64), password: z.string().min(1).max(128) });
const dummyHash = hashPassword('dummy-password-for-timing');
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    if (!await authLimit('login-ip', clientKey(request), 60)) throw new Error('RATE_LIMIT');
    const input = schema.parse(await request.json());
    if (!await authLimit('login-user', input.username.toLowerCase(), 10)) throw new Error('RATE_LIMIT');
    const row = (await db.query('SELECT * FROM app_users WHERE lower(username)=lower($1)', [input.username])).rows[0];
    const valid = await verifyPassword(input.password, row?.password_hash || await dummyHash);
    if (!row || row.disabled || !row.password_hash || !valid) return NextResponse.json({ ok: false, error: 'Benutzername oder Passwort ungültig.' }, { status: 401 });
    return sessionResponse(Number(row.id));
  } catch (error) { return authError(error); }
}
