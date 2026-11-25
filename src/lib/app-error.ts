export class AppError extends Error {
  code:string;status:number;publicMessage:string;
  constructor(code:string,status:number,publicMessage:string) {
    super(publicMessage); this.name = 'AppError';this.code=code;this.status=status;this.publicMessage=publicMessage;
  }
}
export const unauthenticated = () => new AppError('UNAUTHENTICATED', 401, 'Bitte zuerst anmelden.');
export const forbidden = () => new AppError('FORBIDDEN', 403, 'Keine Berechtigung.');
export const notFound = () => new AppError('NOT_FOUND', 404, 'Der Eintrag wurde nicht gefunden.');
export const rateLimited = () => new AppError('RATE_LIMITED', 429, 'Zu viele Anfragen. Bitte später erneut versuchen.');
export const validation = (message = 'Bitte die Eingaben prüfen.') => new AppError('VALIDATION', 400, message);
export const conflict = (message = 'Der Eintrag ist bereits vorhanden.') => new AppError('CONFLICT', 409, message);
export const upstream = (message = 'Der externe Dienst ist vorübergehend nicht erreichbar.') => new AppError('UPSTREAM', 502, message);
export function positiveId(value: string): number {
  if (!/^\d+$/.test(value)) throw validation('Ungültige ID.');
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1 || id > 2147483647) throw validation('Ungültige ID.');
  return id;
}
