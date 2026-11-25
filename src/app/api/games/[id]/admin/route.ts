import { authLimit } from '@/lib/accounts';
import { fetchSteamGame } from '@/lib/steam';
import { getGame, refreshGame } from '@/lib/db';
import { notFound, positiveId, rateLimited } from '@/lib/errors';
import { toResponse } from '@/lib/errors';
import { sameOrigin } from '@/lib/auth-http';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { deleteGame, updateGame } from '@/lib/db';

const schema = z.object({
  status: z.enum(['submitted', 'planned', 'playing', 'played', 'rejected']),
  ownerScore: z.number().int().min(0).max(10).nullable()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    sameOrigin(request);
    await requireAdmin();
    const gameId = Number((await params).id);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!Number.isInteger(gameId) || gameId < 1 || !parsed.success) {
      return NextResponse.json({ ok: false, error: 'Ungültige Verwaltungsdaten.' }, { status: 400 });
    }
    await updateGame(gameId, parsed.data.status, parsed.data.ownerScore);
    return NextResponse.json({ ok: true });
  } catch (error) { return toResponse(error); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    sameOrigin(request);
    await requireAdmin();
    const gameId = Number((await params).id);
    if (!Number.isInteger(gameId) || gameId < 1) {
      return NextResponse.json({ ok: false, error: 'Ungültiges Spiel.' }, { status: 400 });
    }
    await deleteGame(gameId);
    return NextResponse.json({ ok: true });
  } catch (error) { return toResponse(error); }
}

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
  try {sameOrigin(request);const admin=await requireAdmin();if(!await authLimit('steam-refresh',String(admin.id),20,3600))throw rateLimited();
    const id=positiveId((await params).id),game=await getGame(id);if(!game)throw notFound();
    await refreshGame(id,await fetchSteamGame(game.steamAppId));return NextResponse.json({ok:true});
  }catch(error){return toResponse(error);}
}
