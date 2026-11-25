import { db } from '@/lib/db';
import type { PoolClient } from 'pg';
import { digest, hashPassword, randomToken } from '@/lib/passwords';
import type { GamesUser } from '@/lib/types';
let ready: Promise<void> | undefined;
export function ensureAccounts() {
  return ready ||= db.query(`
    CREATE TABLE IF NOT EXISTS app_settings (id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id), registration TEXT NOT NULL DEFAULT 'invite' CHECK (registration IN ('open','invite','closed')));
    ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS site_name TEXT NOT NULL DEFAULT 'GameQueue';
    ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS site_icon BYTEA;
    ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS site_icon_hash TEXT;
    INSERT INTO app_settings(id) VALUES(TRUE) ON CONFLICT DO NOTHING;
    CREATE TABLE IF NOT EXISTS app_users (
      id SERIAL PRIMARY KEY, username TEXT NOT NULL, display_name TEXT NOT NULL,
      password_hash TEXT, steam_id TEXT UNIQUE, role TEXT NOT NULL DEFAULT 'USER' CHECK(role IN ('ADMIN','USER')),
      disabled BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS app_users_username ON app_users(lower(username));
    CREATE TABLE IF NOT EXISTS app_sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE, expires_at TIMESTAMPTZ NOT NULL);
    CREATE TABLE IF NOT EXISTS app_invites (token_hash TEXT PRIMARY KEY, created_by INTEGER NOT NULL REFERENCES app_users(id), expires_at TIMESTAMPTZ NOT NULL, used_at TIMESTAMPTZ, revoked BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS app_auth_limits (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires_at TIMESTAMPTZ NOT NULL);
    CREATE TABLE IF NOT EXISTS app_steam_states (token_hash TEXT PRIMARY KEY, invite TEXT NOT NULL DEFAULT '', expires_at TIMESTAMPTZ NOT NULL);
    CREATE TABLE IF NOT EXISTS app_steam_nonces (nonce TEXT PRIMARY KEY, expires_at TIMESTAMPTZ NOT NULL);
  `).then(() => {}).catch(error => { ready = undefined; throw error; });
}
export async function isConfigured(): Promise<boolean> {
  await ensureAccounts();
  return (await db.query('SELECT 1 FROM app_users LIMIT 1')).rowCount !== 0;
}
export async function registrationMode(): Promise<'open' | 'invite' | 'closed'> {
  await ensureAccounts();
  return (await db.query('SELECT registration FROM app_settings WHERE id=TRUE')).rows[0].registration;
}
export function asUser(row: Record<string, unknown>): GamesUser {
  return { id: Number(row.id), username: String(row.username), displayName: String(row.display_name), email: null, role: row.role as GamesUser['role'] };
}
export async function transaction<T>(run: (client: PoolClient) => Promise<T>): Promise<T> {
  await ensureAccounts();
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    // Serialize changes to setup, admission rules, invites and administrator access.
    await client.query('SELECT pg_advisory_xact_lock(619405781)');
    const result = await run(client);
    await client.query('COMMIT');
    return result;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
export async function admit(client: PoolClient, invite: string, alreadyHashed = false) {
  const mode = (await client.query('SELECT registration FROM app_settings WHERE id=TRUE')).rows[0].registration;
  if (mode === 'closed') throw new Error('Die Registrierung ist geschlossen.');
  if (invite) {
    const result = await client.query(`UPDATE app_invites SET used_at=NOW() WHERE token_hash=$1 AND used_at IS NULL AND NOT revoked AND expires_at>NOW() RETURNING token_hash`, [alreadyHashed ? invite : digest(invite)]);
    if (!result.rowCount) throw new Error('Einladung ungültig oder abgelaufen.');
  } else if (mode === 'invite') throw new Error('Eine Einladung ist erforderlich.');
}
export async function createLocalUser(input: { username: string; password: string; invite?: string; setup?: boolean }) {
  const passwordHash = await hashPassword(input.password);
  return transaction(async client => {
    const exists = (await client.query('SELECT 1 FROM app_users LIMIT 1')).rowCount !== 0;
    if (input.setup) {
      if (exists) throw new Error('Das Setup wurde bereits abgeschlossen.');
    } else {
      if (!exists) throw new Error('Bitte zuerst das Setup abschließen.');
      await admit(client, input.invite || '');
    }
    const result = await client.query(`INSERT INTO app_users(username,display_name,password_hash,role) VALUES($1,$1,$2,$3) RETURNING *`, [input.username, passwordHash, input.setup ? 'ADMIN' : 'USER']);
    return asUser(result.rows[0]);
  });
}
export async function newSession(userId: number): Promise<string> {
  const token = randomToken();
  await db.query(`DELETE FROM app_sessions WHERE expires_at < NOW()`);
  await db.query(`INSERT INTO app_sessions(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '14 days')`, [digest(token), userId]);
  return token;
}
// Database-backed limits work across workers and restarts. Configure a trusted proxy before trusting forwarded IPs.
export async function authLimit(scope: string, identity: string, maximum = 10): Promise<boolean> {
  await ensureAccounts();
  const key = digest(`${scope}:${identity}`);
  const result = await db.query(`INSERT INTO app_auth_limits(key,attempts,expires_at) VALUES($1,1,NOW()+INTERVAL '15 minutes')
    ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN app_auth_limits.expires_at<NOW() THEN 1 ELSE app_auth_limits.attempts+1 END,
    expires_at=CASE WHEN app_auth_limits.expires_at<NOW() THEN NOW()+INTERVAL '15 minutes' ELSE app_auth_limits.expires_at END RETURNING attempts`, [key]);
  await db.query('DELETE FROM app_auth_limits WHERE expires_at<NOW()');
  return result.rows[0].attempts <= maximum;
}
