import type { PoolClient } from 'pg';
import { conflict, validation } from '@/lib/app-error';
export const validName = (name: string) => name.trim().length > 0 && name.length <= 64 && !/[\p{Cc}\p{Cf}]/u.test(name);
export async function assertNameAvailable(client: PoolClient, name: string, role: string, excludeId = 0) {
  if (!validName(name)) throw validation('Der Name darf keine Steuerzeichen enthalten und muss 1 bis 64 Zeichen lang sein.');
  if (['admin','administrator'].includes(name.toLowerCase()) && role !== 'ADMIN') throw validation('Dieser Name ist für Administratoren reserviert.');
  const result=await client.query('SELECT 1 FROM app_users WHERE id<>$2 AND (lower(username)=lower($1) OR lower(display_name)=lower($1)) LIMIT 1',[name,excludeId]);
  if(result.rowCount)throw conflict('Dieser Name ist bereits vergeben.');
}
