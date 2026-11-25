import { db } from '@/lib/db/pool';
import { isoValue } from '@/lib/db/values';
import type { QueryResultRow } from 'pg';
import type { GameComment,GamesUser } from '@/lib/types';
import { validation,forbidden,notFound } from '@/lib/errors';
export const COMMENT_PAGE_SIZE=25;
function commentFromRow(row: QueryResultRow): GameComment {
  const cursor=Buffer.from(JSON.stringify({at:row.cursor_timestamp,id:String(row.id)})).toString('base64url');
  return {id:Number(row.id),userId:Number(row.user_ref),username:String(row.username),body:String(row.body),createdAt:isoValue(row.created_at),cursor};
}
const cursorTimestamp=`to_char(c.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_timestamp`;
export async function listComments(gameId:number,cursor?:string):Promise<GameComment[]> {

  const values:unknown[]=[gameId];let after='';
  if(cursor) {
    try {
      const parsed=JSON.parse(Buffer.from(cursor,'base64url').toString('utf8'));
      if(typeof parsed.at!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(parsed.at)||!Number.isFinite(Date.parse(parsed.at))||!/^\d{1,18}$/.test(parsed.id))throw validation();
      values.push(parsed.at,parsed.id);after=' AND (c.created_at,c.id)<($2::timestamptz,$3::bigint)';
    }catch{throw validation('Ungültiger Kommentar-Cursor.');}
  }
  const result=await db.query(`SELECT c.id,c.user_ref,u.display_name AS username,c.body,c.created_at,${cursorTimestamp} FROM comments c JOIN app_users u ON u.id=c.user_ref WHERE c.game_id=$1${after} ORDER BY c.created_at DESC,c.id DESC LIMIT ${COMMENT_PAGE_SIZE}`,values);
  return result.rows.map(commentFromRow);
}
export async function addComment(gameId:number,user:GamesUser,body:string):Promise<GameComment> {

  const inserted=await db.query('INSERT INTO comments(game_id,user_ref,body) VALUES($1,$2,$3) RETURNING id',[gameId,user.id,body.trim()]);
  const result=await db.query(`SELECT c.id,c.user_ref,u.display_name AS username,c.body,c.created_at,${cursorTimestamp} FROM comments c JOIN app_users u ON u.id=c.user_ref WHERE c.id=$1`,[inserted.rows[0].id]);
  if(!result.rows[0])throw notFound();
  return commentFromRow(result.rows[0]);
}
export async function deleteComment(gameId:number,commentId:number,user:GamesUser):Promise<void> {

  const result=await db.query('DELETE FROM comments WHERE id=$1 AND game_id=$2 AND (user_ref=$3 OR $4) RETURNING id',[commentId,gameId,user.id,user.role==='ADMIN']);
  if(!result.rowCount){if((await db.query('SELECT 1 FROM comments WHERE id=$1 AND game_id=$2',[commentId,gameId])).rowCount)throw forbidden();throw notFound();}
}

