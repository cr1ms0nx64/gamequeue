import { db } from '@/lib/db/pool';
import { notFound } from '@/lib/errors';
import type { GamesUser } from '@/lib/types';
export async function setVote(gameId: number, user: GamesUser, value: -1 | 1): Promise<{ score: number; voteCount: number; userVote: number }> {
 const client=await db.connect();
  try {
    await client.query('BEGIN');
    if(!(await client.query('SELECT id FROM games WHERE id=$1 FOR UPDATE',[gameId])).rowCount)throw notFound();
    const existing=await client.query('SELECT value FROM votes WHERE game_id=$1 AND user_ref=$2',[gameId,user.id]);
    let userVote:number=value;
    if(Number(existing.rows[0]?.value)===value) {await client.query('DELETE FROM votes WHERE game_id=$1 AND user_ref=$2',[gameId,user.id]);userVote=0;}
    else await client.query(`INSERT INTO votes(game_id,user_ref,value) VALUES($1,$2,$3) ON CONFLICT(game_id,user_ref) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()`,[gameId,user.id,value]);
    const aggregate=(await client.query("SELECT COALESCE(SUM(v.value),0)::int AS score,COUNT(*)::int AS vote_count FROM votes v JOIN app_users u ON v.user_ref=u.id WHERE v.game_id=$1 AND NOT u.disabled",[gameId])).rows[0];
    await client.query('COMMIT'); return {score:Number(aggregate.score),voteCount:Number(aggregate.vote_count),userVote};
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}

