import { NextResponse } from 'next/server';
import { newSession } from '@/lib/accounts';
import { SESSION_COOKIE } from '@/lib/auth';
import { publicOrigin } from '@/lib/origins';
export function sameOrigin(request: Request) {
  if (request.headers.get('origin') !== publicOrigin()) throw new Error('FORBIDDEN');
}
export function clientKey(request: Request): string {
  return process.env.TRUST_PROXY === 'true' ? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown' : 'shared';
}
export const cookieOptions = () => ({ httpOnly: true, secure: publicOrigin().startsWith('https:'), sameSite: 'lax' as const, path: '/' });
export async function sessionResponse(userId: number, response: NextResponse = NextResponse.json({ ok: true })) {
  response.cookies.set(SESSION_COOKIE, await newSession(userId), { ...cookieOptions(), maxAge: 14 * 86400 });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
export function authError(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (message === 'RATE_LIMIT') return NextResponse.json({ ok: false, error: 'Zu viele Versuche. Bitte in 15 Minuten erneut versuchen.' }, { status: 429 });
  if (message === 'UNAUTHENTICATED' || message === 'FORBIDDEN') return NextResponse.json({ ok: false, error: 'Zugriff verweigert.' }, { status: message === 'UNAUTHENTICATED' ? 401 : 403 });
  if (error && typeof error === 'object' && 'code' in error && error.code === '23505') return NextResponse.json({ ok: false, error: 'Dieser Benutzername ist bereits vergeben.' }, { status: 409 });
  const allowed = ['Die Registrierung ist geschlossen.', 'Einladung ungültig oder abgelaufen.', 'Eine Einladung ist erforderlich.', 'Bitte zuerst das Setup abschließen.', 'Das Setup wurde bereits abgeschlossen.', 'Der letzte aktive Admin muss erhalten bleiben.'];
  return NextResponse.json({ ok: false, error: allowed.includes(message) ? message : 'Die Anfrage konnte nicht verarbeitet werden.' }, { status: 400 });
}
