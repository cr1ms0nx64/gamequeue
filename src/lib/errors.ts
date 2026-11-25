import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError,validation,conflict,notFound } from '@/lib/app-error';
export * from '@/lib/app-error';
export function toResponse(error: unknown): NextResponse {
  let known: AppError;
  if (error instanceof AppError) known = error;
  else if (error instanceof ZodError || error instanceof SyntaxError) known = validation();
  else if (error && typeof error === 'object' && 'code' in error && error.code === '23505') known = conflict();
  else if (error && typeof error === 'object' && 'code' in error && error.code === '23503') known = notFound();
  else { console.error('GameQueue: Anfrage fehlgeschlagen', error); known = new AppError('INTERNAL', 500, 'Die Anfrage konnte nicht verarbeitet werden.'); }
  return NextResponse.json({ ok: false, code: known.code, error: known.publicMessage }, {
    status: known.status, headers: { 'Cache-Control':'no-store', ...(known.status === 429 ? {'Retry-After':'60'} : {}) }
  });
}
