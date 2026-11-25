import { sameOrigin } from '@/lib/auth-http';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { addComment } from '@/lib/db';
import { rateLimit, requestKey } from '@/lib/rate-limit';

const schema = z.object({ body: z.string().trim().min(1).max(1000) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    sameOrigin(request);
    const user = await requireUser();
    const gameId = Number((await params).id);
    if (!Number.isInteger(gameId) || gameId < 1) {
      return NextResponse.json({ ok: false, error: 'Ungültiges Spiel.' }, { status: 400 });
    }
    if (!rateLimit(requestKey(request, `comment:${gameId}`, user.id), 8, 60 * 1000)) {
      return NextResponse.json({ ok: false, error: 'Zu viele Kommentare. Bitte kurz warten.' }, { status: 429 });
    }
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: 'Der Kommentar muss zwischen 1 und 1000 Zeichen lang sein.' }, { status: 400 });
    }
    return NextResponse.json({ ok: true, comment: await addComment(gameId, user, parsed.data.body) });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ ok: false, error: 'Bitte zuerst anmelden.' }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: 'Kommentar konnte nicht gespeichert werden.' }, { status: 500 });
  }
}

