import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { admit, isConfigured, transaction } from '@/lib/accounts';
import { cookieOptions, sessionResponse } from '@/lib/auth-http';
import { publicOrigin } from '@/lib/origins';
import { digest } from '@/lib/passwords';
import { validateSteamAssertion, verifySteamAssertion } from '@/lib/steam-auth';
export async function GET(request: Request) {
  try {
    if (process.env.STEAM_AUTH_ENABLED !== 'true' || !await isConfigured()) throw new Error('Disabled');
    const params = new URL(request.url).searchParams;
    const state = params.get('state') || '';
    if (!state || state !== (await cookies()).get('games_steam_state')?.value) throw new Error('State mismatch');
    const pending = await db.query('DELETE FROM app_steam_states WHERE token_hash=$1 AND expires_at>NOW() RETURNING invite', [digest(state)]);
    if (!pending.rows[0]) throw new Error('Expired state');
    const { steamId, nonce } = validateSteamAssertion(params, state);
    await verifySteamAssertion(params);
    const id = await transaction(async client => {
      await client.query('DELETE FROM app_steam_nonces WHERE expires_at<NOW()');
      await client.query(`INSERT INTO app_steam_nonces(nonce,expires_at) VALUES($1,NOW()+INTERVAL '10 minutes')`, [nonce]);
      const existing = (await client.query('SELECT id,disabled FROM app_users WHERE steam_id=$1', [steamId])).rows[0];
      if (existing) {
        if (existing.disabled) throw new Error('Disabled account');
        return Number(existing.id);
      }
      await admit(client, pending.rows[0].invite, true);
      // SteamID is the identity; a matching display name never links an existing local account.
      const row = (await client.query(`INSERT INTO app_users(username,display_name,steam_id) VALUES($1,$2,$3) RETURNING id`, [`steam_${steamId}`, `Steam ${steamId.slice(-6)}`, steamId])).rows[0];
      return Number(row.id);
    });
    const response = await sessionResponse(id, NextResponse.redirect(`${publicOrigin()}/`));
    response.cookies.set('games_steam_state', '', { ...cookieOptions(), maxAge: 0 });
    return response;
  } catch {
    const response = NextResponse.redirect(`${publicOrigin()}/login?error=steam`);
    response.cookies.set('games_steam_state', '', { ...cookieOptions(), maxAge: 0 });
    return response;
  }
}
