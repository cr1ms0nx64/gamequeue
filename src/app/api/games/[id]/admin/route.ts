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
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const status = message === 'UNAUTHENTICATED' ? 401 : message === 'FORBIDDEN' ? 403 : 500;
    return NextResponse.json({ ok: false, error: status === 403 ? 'Keine Berechtigung.' : 'Änderung fehlgeschlagen.' }, { status });
  }
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
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const status = message === 'UNAUTHENTICATED' ? 401 : message === 'FORBIDDEN' ? 403 : 500;
    return NextResponse.json({ ok: false, error: status === 403 ? 'Keine Berechtigung.' : 'Löschen fehlgeschlagen.' }, { status });
  }
}

