import { AppError, toResponse } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { db, ensureSchema } from '@/lib/db';

export async function GET() {
  try {
    await ensureSchema();
    await db.query('SELECT 1');
    return NextResponse.json({ ok: true, service: 'gamequeue', database: 'ok' });
  } catch (error) {
    console.error("GameQueue: Healthcheck fehlgeschlagen", error);
    return toResponse(new AppError('UNAVAILABLE', 503, 'Die Datenbank ist nicht verfügbar.'));
  }
}

