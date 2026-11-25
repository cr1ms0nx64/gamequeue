import { sameOrigin } from '@/lib/auth-http';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { setVote } from '@/lib/db';
import { rateLimit, requestKey } from '@/lib/rate-limit';

const schema = z.object({ value: z.union([z.literal(-1), z.literal(1)]) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    sameOrigin(request);
    const user = await requireUser();
    const gameId = Number((await params).id);
    if (!Number.isInteger(gameId) || gameId < 1) {
      return NextResponse.json({ ok: false, error: 'Ungültiges Spiel.' }, { status: 400 });
    }
    if (!rateLimit(requestKey(request, `vote:${gameId}`, user.id), 30, 60 * 1000)) {
      return NextResponse.json({ ok: false, error: 'Bitte kurz warten.' }, { status: 429 });
    }
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ ok: false, error: 'Ungültige Bewertung.' }, { status: 400 });
    return NextResponse.json({ ok: true, vote: await setVote(gameId, user, parsed.data.value) });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ ok: false, error: 'Bitte zuerst anmelden.' }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: 'Bewertung konnte nicht gespeichert werden.' }, { status: 500 });
  }
}

