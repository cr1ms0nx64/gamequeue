import { toResponse } from '@/lib/errors';
import { sameOrigin } from '@/lib/auth-http';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { submitGame } from '@/lib/db';
import { rateLimit, requestKey } from '@/lib/rate-limit';
import { fetchSteamGame, parseSteamAppId } from '@/lib/steam';

const schema = z.object({
  steamUrl: z.string().trim().min(1).max(500)
});

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const user = await requireUser();
    if (!rateLimit(requestKey(request, 'game-submit', user.id), 10, 60 * 60 * 1000)) {
      return NextResponse.json({ ok: false, error: 'Zu viele Vorschläge. Bitte später erneut versuchen.' }, { status: 429 });
    }

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: 'Bitte einen gültigen Steam-Link oder eine App-ID eingeben.' }, { status: 400 });
    }
    const appId = parseSteamAppId(parsed.data.steamUrl);
    if (!appId) {
      return NextResponse.json({ ok: false, error: 'Der Steam-Link oder die App-ID ist ungültig.' }, { status: 400 });
    }

    const imported = await fetchSteamGame(appId);
    const result = await submitGame(imported, user);
    return NextResponse.json({
      ok: true,
      game: { ...result, title: imported.title }
    });
  } catch (error) { return toResponse(error); }
}

