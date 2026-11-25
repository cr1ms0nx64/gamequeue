import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { authLimit, createLocalUser } from '@/lib/accounts';
import { sameOrigin, authError, clientKey, sessionResponse } from '@/lib/auth-http';
import { digest } from '@/lib/passwords';
const schema = z.object({ username: z.string().regex(/^[a-zA-Z0-9_]{3,32}$/).refine(value => !value.toLowerCase().startsWith('steam_')), password: z.string().min(12).max(128), setupToken: z.string().min(32).max(256) });
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    if (!await authLimit('setup', clientKey(request), 5)) throw new Error('RATE_LIMIT');
    const input = schema.parse(await request.json());
    const expected = process.env.SETUP_TOKEN || '';
    if (expected.length < 32 || !timingSafeEqual(Buffer.from(digest(input.setupToken)), Buffer.from(digest(expected)))) throw new Error('FORBIDDEN');
    const user = await createLocalUser({ ...input, setup: true });
    return sessionResponse(user.id);
  } catch (error) { return authError(error); }
}
