import { NextResponse } from 'next/server';
import { ensureAccounts } from '@/lib/accounts';
import { db } from '@/lib/db';
import { publicOrigin } from '@/lib/origins';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  await ensureAccounts();
  const row = (await db.query('SELECT site_icon,site_icon_hash FROM app_settings WHERE id=TRUE')).rows[0];
  if (!row.site_icon) {
    const response = NextResponse.redirect(`${publicOrigin()}/icon.png`);
    response.headers.set('Cache-Control','no-store');
    return response;
  }
  const currentVersion = new URL(request.url).searchParams.get('v') === row.site_icon_hash;
  return new Response(new Uint8Array(row.site_icon), { headers: {
    'Content-Type':'image/png', 'X-Content-Type-Options':'nosniff',
    'Cache-Control': currentVersion ? 'public, max-age=31536000, immutable' : 'no-store',
    'ETag': `"${row.site_icon_hash}"`
  } });
}
