import { Pool } from 'pg';
import { createHash, randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';
export async function resetAdmin(username) {
  if(!username||!process.env.DATABASE_URL||!process.env.PUBLIC_ORIGIN) throw new Error('Aufruf: npm run reset-admin -- <username>; DATABASE_URL und PUBLIC_ORIGIN setzen.');
  const origin=new URL(process.env.PUBLIC_ORIGIN);
  if(!['http:','https:'].includes(origin.protocol)||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw new Error('PUBLIC_ORIGIN muss eine HTTP(S)-Origin sein.');
  const pool=new Pool({connectionString:process.env.DATABASE_URL}); const client=await pool.connect();
  try {
    await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(619405781)');
    const user=(await client.query("SELECT id,password_hash FROM app_users WHERE lower(username)=lower($1) AND role='ADMIN' FOR UPDATE",[username])).rows[0];
    if(!user?.password_hash)throw new Error('Kein lokales Admin-Konto mit diesem Benutzernamen gefunden.');
    const token=randomBytes(32).toString('base64url'), hash=createHash('sha256').update(token).digest('hex');
    await client.query('UPDATE app_password_resets SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL',[user.id]);
    await client.query("INSERT INTO app_password_resets(token_hash,user_id,created_by,expires_at) VALUES($1,$2,$2,NOW()+INTERVAL '24 hours')",[hash,user.id]);
    await client.query('COMMIT');return `${origin.origin}/reset?token=${token}`;
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();await pool.end();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  try{console.log(await resetAdmin(process.argv[2]));}catch(error){console.error(error instanceof Error?error.message:'Zurücksetzen fehlgeschlagen.');process.exitCode=1;}
}
