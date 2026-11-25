import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { SESSION_COOKIE } from '@/lib/auth';
import { sameOrigin, authError, cookieOptions } from '@/lib/auth-http';
import { digest } from '@/lib/passwords';
export async function POST(request: Request) {
  try {
    sameOrigin(request);
      const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (token) await db.query('DELETE FROM app_sessions WHERE token_hash=$1', [digest(token)]);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, '', { ...cookieOptions(), maxAge: 0 });
    return response;
  } catch (error) { return authError(error); }
}
