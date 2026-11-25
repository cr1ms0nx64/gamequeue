import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomBytes } from 'node:crypto';
import { readFile,cp,mkdtemp,appendFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrate } from '../src/lib/db/migrate.ts';
test('upgrade 1.2.0 preserves mapped data and archives every orphan, then is idempotent',async()=>{
  if(process.env.TEST_DATABASE_DISPOSABLE!=='1'||!process.env.DATABASE_URL)throw new Error('Nur für explizit freigegebene Wegwerf-Datenbanken.');
  const name='gq_upgrade_'+randomBytes(8).toString('hex');
  const root=new Pool({connectionString:process.env.DATABASE_URL});const url=new URL(process.env.DATABASE_URL);url.pathname='/'+name;
  let pool;const directory=await mkdtemp(join(tmpdir(),'gamequeue-migrations-'));
  try {
    await root.query(`CREATE DATABASE "${name}"`);pool=new Pool({connectionString:url.toString()});
    await pool.query(await readFile('migrations/0001_baseline.sql','utf8'));
    await pool.query("INSERT INTO app_users(username,display_name,password_hash,role) VALUES('firstadmin','Admin','fixture','ADMIN'),('memberone','Member','fixture','USER'),('legacyuser','MEMBERONE','fixture','USER')");
    await pool.query("INSERT INTO games(steam_app_id,slug,title,header_image,created_by_user_id,release_date) VALUES(620,'portal','Portal','image','local:1','Demnächst'),(570,'dota','Dota','image','77','2026')");
    await pool.query("INSERT INTO votes(game_id,user_id,username,value) VALUES(1,'local:1','Original',1),(1,'77','Hub',-1),(1,'local:999','Missing',1),(1,'local:01','Alias',-1)");
    await pool.query("INSERT INTO submissions(game_id,user_id,username) VALUES(1,'local:1','Original'),(1,'77','Hub'),(1,'local:999','Missing'),(1,'local:01','Alias')");
    await pool.query("INSERT INTO comments(game_id,user_id,username,body) VALUES(1,'local:1','Original','Mapped'),(1,'77','Hub','Archived Hub'),(1,'local:999','Missing','Archived missing')");
    await migrate(url.toString());
    assert.equal((await pool.query('SELECT user_ref FROM votes')).rows[0].user_ref,1);
    assert.equal((await pool.query('SELECT user_ref FROM submissions')).rows[0].user_ref,1);
    assert.equal((await pool.query('SELECT COUNT(*)::int AS n FROM comments')).rows[0].n,1);
    const orphans=Object.fromEntries((await pool.query('SELECT source_table,COUNT(*)::int AS n FROM legacy_orphans GROUP BY source_table')).rows.map(row=>[row.source_table,row.n]));
    assert.deepEqual(orphans,{votes:3,submissions:3,comments:2,'games.created_by_user_id':1,'app_users.names':1});
    assert.equal((await pool.query('SELECT COUNT(*)::int AS n FROM games')).rows[0].n,2);
    assert.equal((await pool.query('SELECT coming_soon FROM games WHERE id=1')).rows[0].coming_soon,true);
    assert.equal((await pool.query('SELECT username FROM app_users WHERE id=3')).rows[0].username,'legacyuser');
    assert.notEqual((await pool.query('SELECT display_name FROM app_users WHERE id=3')).rows[0].display_name,'MEMBERONE');
    const applied=(await pool.query('SELECT * FROM schema_migrations ORDER BY version')).rows;
    await migrate(url.toString());assert.deepEqual((await pool.query('SELECT * FROM schema_migrations ORDER BY version')).rows,applied);
    await cp('migrations',directory,{recursive:true});await appendFile(join(directory,'0001_baseline.sql'),'\n-- changed\n');
    await assert.rejects(migrate(url.toString(),directory),/Prüfsumme/);
    assert.deepEqual((await pool.query('SELECT * FROM schema_migrations ORDER BY version')).rows,applied);
    await pool.query('DELETE FROM app_users WHERE id=1');
    assert.equal((await pool.query('SELECT created_by FROM games WHERE id=1')).rows[0].created_by,null);
    assert.equal((await pool.query('SELECT COUNT(*)::int AS n FROM votes')).rows[0].n,0);
  }finally {
    if(pool)await pool.end();
    await root.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);await root.end();await rm(directory,{recursive:true,force:true});
  }
});
