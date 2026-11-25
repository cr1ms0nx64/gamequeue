import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authLimit, isConfigured } from '@/lib/accounts';
import { clientKey, cookieOptions, authError } from '@/lib/auth-http';
import { randomToken, digest } from '@/lib/passwords';
import { steamLoginUrl } from '@/lib/steam-auth';
export async function GET(request: Request) {
  try {
    if (process.env.STEAM_AUTH_ENABLED !== 'true' || !await isConfigured()) throw new Error('FORBIDDEN');
    if (!await authLimit('steam-start', clientKey(request), 30)) throw new Error('RATE_LIMIT');
    const invite = new URL(request.url).searchParams.get('invite') || '';
    if (invite.length > 128) throw new Error('FORBIDDEN');
    const state = randomToken();
    await db.query('DELETE FROM app_steam_states WHERE expires_at<NOW()');
    await db.query(`INSERT INTO app_steam_states(token_hash,invite,expires_at) VALUES($1,$2,NOW()+INTERVAL '10 minutes')`, [digest(state), invite ? digest(invite) : '']);
    const response = NextResponse.redirect(steamLoginUrl(state));
    response.cookies.set('games_steam_state', state, { ...cookieOptions(), maxAge: 600 });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) { return authError(error); }
}
