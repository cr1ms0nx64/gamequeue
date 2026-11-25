import { AppError, toResponse } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { migrationsApplied } from '@/lib/db/migrate';
import { db } from '@/lib/db';

export async function GET() {
  try {
  
    await db.query('SELECT 1');
    if(!await migrationsApplied(db))throw new AppError('MIGRATIONS_PENDING',503,'Migrationen fehlen oder wurden verändert.');
    return NextResponse.json({ ok: true, service: 'gamequeue', database: 'ok' });
  } catch (error) {
    console.error("GameQueue: Healthcheck fehlgeschlagen", error);
    return toResponse(new AppError('UNAVAILABLE', 503, 'Die Datenbank ist nicht verfügbar.'));
  }
}

