import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
export class AppError extends Error {
  constructor(public code: string, public status: number, public publicMessage: string) {
    super(publicMessage); this.name = 'AppError';
  }
}
export const unauthenticated = () => new AppError('UNAUTHENTICATED', 401, 'Bitte zuerst anmelden.');
export const forbidden = () => new AppError('FORBIDDEN', 403, 'Keine Berechtigung.');
export const notFound = () => new AppError('NOT_FOUND', 404, 'Der Eintrag wurde nicht gefunden.');
export const rateLimited = () => new AppError('RATE_LIMITED', 429, 'Zu viele Anfragen. Bitte später erneut versuchen.');
export const validation = (message = 'Bitte die Eingaben prüfen.') => new AppError('VALIDATION', 400, message);
export const conflict = (message = 'Der Eintrag ist bereits vorhanden.') => new AppError('CONFLICT', 409, message);
export const upstream = (message = 'Der externe Dienst ist vorübergehend nicht erreichbar.') => new AppError('UPSTREAM', 502, message);
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
export function positiveId(value: string): number {
  if (!/^\d+$/.test(value)) throw validation('Ungültige ID.');
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1 || id > 2147483647) throw validation('Ungültige ID.');
  return id;
}
