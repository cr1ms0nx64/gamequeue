import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Pool } from 'pg';
export async function migrationFiles(directory=join(process.cwd(),'migrations')) {
  const names=(await readdir(directory)).filter(name=>/^\d{4}_.+\.sql$/.test(name)).sort();
  if(!names.length)throw new Error('Keine GameQueue-Migrationen gefunden.');
  return Promise.all(names.map(async name=>{
    const sql=await readFile(join(directory,name),'utf8');
    return {version:Number(name.slice(0,4)),name,sql,checksum:createHash('sha256').update(sql).digest('hex')};
  }));
}
export async function migrate(connectionString=process.env.DATABASE_URL,directory?:string) {
  if(!connectionString)throw new Error('DATABASE_URL ist für Migrationen erforderlich.');
  const files=await migrationFiles(directory);const pool=new Pool({connectionString,max:1,connectionTimeoutMillis:10000});
  try {
    const client=await pool.connect();
    try {
      await client.query('SELECT pg_advisory_lock(619405782)');
      await client.query('CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY,name TEXT NOT NULL,applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),checksum TEXT NOT NULL)');
      const applied=(await client.query('SELECT version,name,checksum FROM schema_migrations')).rows;
      for(const row of applied) {const file=files.find(file=>file.version===row.version);if(!file||file.name!==row.name||file.checksum!==row.checksum)throw new Error(`Migration ${row.name}: Prüfsumme oder Version stimmt nicht. Start abgebrochen.`);}
      for(const file of files) {
        if(applied.some(row=>row.version===file.version))continue;
        await client.query('BEGIN');
        try {
          await client.query(file.sql);
          await client.query('INSERT INTO schema_migrations(version,name,checksum) VALUES($1,$2,$3)',[file.version,file.name,file.checksum]);
          await client.query('COMMIT');console.info(`Migration ${file.name} angewendet.`);
        }catch(error){await client.query('ROLLBACK');throw error;}
      }
      const orphans=(await client.query('SELECT source_table,COUNT(*)::int AS count FROM legacy_orphans GROUP BY source_table')).rows;
      if(orphans.length)console.info('Archivierte Alt-Datensätze:',orphans);
    }finally{await client.query('SELECT pg_advisory_unlock(619405782)').catch(()=>{});client.release();}
  }finally{await pool.end();}
}
export async function migrationsApplied(pool:Pool):Promise<boolean> {
  const files=await migrationFiles();
  if(!(await pool.query("SELECT to_regclass('public.schema_migrations') AS name")).rows[0].name)return false;
  const applied=(await pool.query('SELECT version,name,checksum FROM schema_migrations')).rows;
  return applied.length===files.length&&files.every(file=>applied.some(row=>row.version===file.version&&row.name===file.name&&row.checksum===file.checksum));
}
