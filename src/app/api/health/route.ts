import { NextResponse } from 'next/server';
import { db, ensureSchema } from '@/lib/db';

export async function GET() {
  try {
    await ensureSchema();
    await db.query('SELECT 1');
    return NextResponse.json({ ok: true, service: 'crimson-games', database: 'ok' });
  } catch {
    return NextResponse.json({ ok: false, service: 'crimson-games', database: 'unavailable' }, { status: 503 });
  }
}

