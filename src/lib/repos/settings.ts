import { db } from '@/lib/db/pool';
export async function registrationMode(): Promise<'open' | 'invite' | 'closed'> {
  return (await db.query('SELECT registration FROM app_settings WHERE id=TRUE')).rows[0].registration;
}
