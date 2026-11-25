CREATE TABLE IF NOT EXISTS legacy_orphans (
  id BIGSERIAL PRIMARY KEY, source_table TEXT NOT NULL, legacy_key TEXT NOT NULL,
  reason TEXT NOT NULL, data JSONB NOT NULL, archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source_table,legacy_key)
);
ALTER TABLE votes ADD COLUMN IF NOT EXISTS user_ref INTEGER REFERENCES app_users(id) ON DELETE CASCADE;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS user_ref INTEGER REFERENCES app_users(id) ON DELETE CASCADE;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS user_ref INTEGER REFERENCES app_users(id) ON DELETE CASCADE;
ALTER TABLE games ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES app_users(id) ON DELETE SET NULL;
UPDATE votes v SET user_ref=u.id FROM app_users u WHERE CASE WHEN v.user_id ~ '^local:[0-9]{1,10}$' THEN substring(v.user_id FROM 7)::bigint END=u.id;
UPDATE comments c SET user_ref=u.id FROM app_users u WHERE CASE WHEN c.user_id ~ '^local:[0-9]{1,10}$' THEN substring(c.user_id FROM 7)::bigint END=u.id;
UPDATE submissions s SET user_ref=u.id FROM app_users u WHERE CASE WHEN s.user_id ~ '^local:[0-9]{1,10}$' THEN substring(s.user_id FROM 7)::bigint END=u.id;
UPDATE games g SET created_by=u.id FROM app_users u WHERE CASE WHEN g.created_by_user_id ~ '^local:[0-9]{1,10}$' THEN substring(g.created_by_user_id FROM 7)::bigint END=u.id;
INSERT INTO legacy_orphans(source_table,legacy_key,reason,data) SELECT 'votes',game_id||':'||user_id,'unmapped user',to_jsonb(v) FROM votes v WHERE user_ref IS NULL ON CONFLICT DO NOTHING;
INSERT INTO legacy_orphans(source_table,legacy_key,reason,data) SELECT 'comments',id::text,'unmapped user',to_jsonb(c) FROM comments c WHERE user_ref IS NULL ON CONFLICT DO NOTHING;
INSERT INTO legacy_orphans(source_table,legacy_key,reason,data) SELECT 'submissions',id::text,'unmapped user',to_jsonb(s) FROM submissions s WHERE user_ref IS NULL ON CONFLICT DO NOTHING;
INSERT INTO legacy_orphans(source_table,legacy_key,reason,data) SELECT 'games.created_by_user_id',id::text,'unmapped creator',to_jsonb(g) FROM games g WHERE created_by IS NULL ON CONFLICT DO NOTHING;
DELETE FROM votes WHERE user_ref IS NULL;
DELETE FROM comments WHERE user_ref IS NULL;
DELETE FROM submissions WHERE user_ref IS NULL;
-- Preserve aliases such as local:01 before replacing the uniqueness constraints.
WITH ranked AS (SELECT v.*,row_number() OVER(PARTITION BY game_id,user_ref ORDER BY (user_id='local:'||user_ref::text) DESC,updated_at DESC,user_id) n FROM votes v)
INSERT INTO legacy_orphans(source_table,legacy_key,reason,data) SELECT 'votes',game_id||':'||user_id,'duplicate user reference',to_jsonb(r)-'n' FROM ranked r WHERE n>1 ON CONFLICT DO NOTHING;
WITH ranked AS (SELECT game_id,user_id,row_number() OVER(PARTITION BY game_id,user_ref ORDER BY (user_id='local:'||user_ref::text) DESC,updated_at DESC,user_id) n FROM votes)
DELETE FROM votes v USING ranked r WHERE r.n>1 AND v.game_id=r.game_id AND v.user_id=r.user_id;
WITH ranked AS (SELECT s.*,row_number() OVER(PARTITION BY game_id,user_ref ORDER BY (user_id='local:'||user_ref::text) DESC,created_at,id) n FROM submissions s)
INSERT INTO legacy_orphans(source_table,legacy_key,reason,data) SELECT 'submissions',id::text,'duplicate user reference',to_jsonb(r)-'n' FROM ranked r WHERE n>1 ON CONFLICT DO NOTHING;
WITH ranked AS (SELECT id,row_number() OVER(PARTITION BY game_id,user_ref ORDER BY (user_id='local:'||user_ref::text) DESC,created_at,id) n FROM submissions)
DELETE FROM submissions s USING ranked r WHERE r.n>1 AND s.id=r.id;
ALTER TABLE votes DROP CONSTRAINT votes_pkey;
ALTER TABLE submissions DROP CONSTRAINT submissions_game_id_user_id_key;
ALTER TABLE votes ALTER COLUMN user_ref SET NOT NULL;
ALTER TABLE comments ALTER COLUMN user_ref SET NOT NULL;
ALTER TABLE submissions ALTER COLUMN user_ref SET NOT NULL;
ALTER TABLE votes DROP COLUMN user_id, DROP COLUMN username, ADD PRIMARY KEY(game_id,user_ref);
ALTER TABLE comments DROP COLUMN user_id, DROP COLUMN username;
ALTER TABLE submissions DROP COLUMN user_id, DROP COLUMN username, ADD UNIQUE(game_id,user_ref);
ALTER TABLE games DROP COLUMN created_by_user_id;
CREATE INDEX idx_votes_user_ref ON votes(user_ref);
CREATE INDEX idx_comments_user_ref ON comments(user_ref);
CREATE INDEX idx_submissions_user_ref ON submissions(user_ref);
ALTER TABLE app_invites ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE app_invites DROP CONSTRAINT app_invites_created_by_fkey;
ALTER TABLE app_invites ADD CONSTRAINT app_invites_created_by_fkey FOREIGN KEY(created_by) REFERENCES app_users(id) ON DELETE SET NULL;
