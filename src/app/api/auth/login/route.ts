import { rateLimited } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { checkLimit, recordFailure, resetLimit, LOGIN_PAIR_LIMIT, LOGIN_USERNAME_LIMIT, LOGIN_IP_LIMIT } from '@/lib/accounts';
import { sameOrigin, authError, clientKey, sessionResponse } from '@/lib/auth-http';
import { hashPassword, verifyPassword } from '@/lib/passwords';
const schema = z.object({ username: z.string().min(1).max(64), password: z.string().min(1).max(128) });
const dummyHash = hashPassword('dummy-password-for-timing');
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const input = schema.parse(await request.json());
    const ip = clientKey(request), name = input.username.trim().toLowerCase();
    const pair = JSON.stringify([name, ip]);
    if (!await checkLimit('login-user-ip', pair, LOGIN_PAIR_LIMIT) ||
        !await checkLimit('login-user', name, LOGIN_USERNAME_LIMIT) ||
        !await checkLimit('login-ip', ip, LOGIN_IP_LIMIT)) throw rateLimited();
    const row = (await db.query('SELECT * FROM app_users WHERE lower(username)=lower($1)', [input.username])).rows[0];
    const valid = await verifyPassword(input.password, row?.password_hash || await dummyHash);
    if (!row || row.disabled || !row.password_hash || !valid) {
      await Promise.all([recordFailure('login-user-ip', pair), recordFailure('login-user', name), recordFailure('login-ip', ip)]);
      return NextResponse.json({ ok: false, error: 'Benutzername oder Passwort ungültig.' }, { status: 401 });
    }
    await Promise.all([resetLimit('login-user-ip', pair), resetLimit('login-user', name), resetLimit('login-ip', ip)]);
    return sessionResponse(Number(row.id));
  } catch (error) { return authError(error); }
}
