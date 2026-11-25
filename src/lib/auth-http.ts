import { forbidden } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { newSession } from '@/lib/accounts';
import { SESSION_COOKIE } from '@/lib/auth';
import { publicOrigin } from '@/lib/origins';
export function sameOrigin(request: Request) {
  if (request.headers.get('origin') !== publicOrigin()) throw forbidden();
}
export { clientKey } from '@/lib/proxy';
export const cookieOptions = () => ({ httpOnly: true, secure: publicOrigin().startsWith('https:'), sameSite: 'lax' as const, path: '/' });
export async function sessionResponse(userId: number, response: NextResponse = NextResponse.json({ ok: true })) {
  response.cookies.set(SESSION_COOKIE, await newSession(userId), { ...cookieOptions(), maxAge: 14 * 86400 });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
export { toResponse as authError } from '@/lib/errors';
