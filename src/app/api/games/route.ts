import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { sameOrigin } from '@/lib/auth-http';
import { submitGame } from '@/lib/db';
import { authLimit } from '@/lib/accounts';
import { fetchSteamGame, parseSteamAppId } from '@/lib/steam';
import { rateLimited, validation, toResponse } from '@/lib/errors';
const schema=z.object({steamUrl:z.string().trim().min(1).max(500)});
export async function POST(request:Request) {
  try {sameOrigin(request);const user=await requireUser();
    if(!await authLimit('game-submit',String(user.id),10,3600))throw rateLimited();
    const input=schema.parse(await request.json());const id=parseSteamAppId(input.steamUrl);
    if(!id)throw validation('Der Steam-Link oder die App-ID ist ungültig.');
    const imported=await fetchSteamGame(id),result=await submitGame(imported,user);
    return NextResponse.json({ok:true,game:{...result,title:imported.title}});
  }catch(error){return toResponse(error);}
}
