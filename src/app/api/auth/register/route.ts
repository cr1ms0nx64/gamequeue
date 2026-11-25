import { z } from 'zod';
import { authLimit, createLocalUser } from '@/lib/accounts';
import { sameOrigin, authError, clientKey, sessionResponse } from '@/lib/auth-http';
const schema = z.object({ username: z.string().regex(/^[a-zA-Z0-9_]{3,32}$/).refine(value => !value.toLowerCase().startsWith('steam_')), password: z.string().min(12).max(128), invite: z.string().max(128).optional() });
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    if (!await authLimit('register', clientKey(request), 10)) throw new Error('RATE_LIMIT');
    const user = await createLocalUser(schema.parse(await request.json()));
    return sessionResponse(user.id);
  } catch (error) { return authError(error); }
}
