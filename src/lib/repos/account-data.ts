import type { PoolClient } from 'pg';
import { db } from '@/lib/db/pool';
import { digest } from '@/lib/passwords';
import { notFound, validation } from '@/lib/errors';
export async function exportAccount(userId:number) {
  const result=await db.query(`SELECT jsonb_build_object(
    'profile',(SELECT to_jsonb(p) FROM (SELECT id,username,display_name,steam_id,role,disabled,created_at FROM app_users WHERE id=$1) p),
    'submissions',COALESCE((SELECT jsonb_agg(to_jsonb(s)) FROM submissions s WHERE user_ref=$1),'[]'::jsonb),
    'votes',COALESCE((SELECT jsonb_agg(to_jsonb(v)) FROM votes v WHERE user_ref=$1),'[]'::jsonb),
    'comments',COALESCE((SELECT jsonb_agg(to_jsonb(c)) FROM comments c WHERE user_ref=$1),'[]'::jsonb),
    'legacyArchive',COALESCE((SELECT jsonb_agg(to_jsonb(o)-'data'||jsonb_build_object('data',o.data-'password_hash')) FROM legacy_orphans o WHERE (source_table='app_users.names' AND legacy_key=$1::text) OR data->>'user_ref'=$1::text),'[]'::jsonb)
  ) AS data`,[userId]);
  const data=result.rows[0].data;if(!data.profile)throw notFound();return data;
}
export async function deleteAccount(client:PoolClient,userId:number,confirmation:string) {
  const target=(await client.query('SELECT id,username,role,disabled FROM app_users WHERE id=$1 FOR UPDATE',[userId])).rows[0];
  if(!target)throw notFound();if(confirmation!==target.username)throw validation('Bitte den Benutzernamen zur Bestätigung eingeben.');
  if(target.role==='ADMIN'&&!target.disabled) {
    const count=(await client.query("SELECT COUNT(*)::int AS n FROM app_users WHERE role='ADMIN' AND NOT disabled")).rows[0].n;
    if(count<=1)throw validation('Der letzte aktive Admin muss erhalten bleiben.');
  }
  await client.query("DELETE FROM legacy_orphans WHERE (source_table='app_users.names' AND legacy_key=$1::text) OR data->>'user_ref'=$1::text",[userId]);
  const scopes=['account','admin','vote','comment','comment-delete','game-submit','steam-refresh','account-export','account-delete'];
  await client.query('DELETE FROM app_auth_limits WHERE key=ANY($1::text[])',[scopes.map(scope=>digest(`${scope}:${userId}`))]);
  await client.query('DELETE FROM app_auth_limits WHERE key=$1',[digest(`login-user:${target.username.toLowerCase()}`)]);
  await client.query('DELETE FROM app_users WHERE id=$1',[userId]);
}
