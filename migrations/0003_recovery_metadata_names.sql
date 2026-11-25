CREATE TABLE IF NOT EXISTS app_password_resets (
  token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  created_by INTEGER REFERENCES app_users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL, used_at TIMESTAMPTZ
);
ALTER TABLE games ADD COLUMN IF NOT EXISTS coming_soon BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE games SET coming_soon=TRUE WHERE release_date ~* '^(Demn|Coming soon|TBA|Q[1-4])';
-- Keep all login names; archive original profile data before resolving display collisions.
DO $$
DECLARE r RECORD; candidate TEXT; suffix INTEGER;
BEGIN
  FOR r IN SELECT * FROM app_users ORDER BY id LOOP
    IF trim(r.display_name)='' OR r.display_name ~ '[[:cntrl:]]' OR length(r.display_name)>64
      OR (lower(r.display_name) IN ('admin','administrator') AND r.role<>'ADMIN')
      OR EXISTS(SELECT 1 FROM app_users u WHERE u.id<>r.id AND (lower(u.username)=lower(r.display_name) OR lower(u.display_name)=lower(r.display_name))) THEN
      INSERT INTO legacy_orphans(source_table,legacy_key,reason,data) VALUES('app_users.names',r.id::text,'display namespace collision',to_jsonb(r)) ON CONFLICT DO NOTHING;
      candidate:='Mitglied '||r.id; suffix:=1;
      WHILE EXISTS(SELECT 1 FROM app_users u WHERE u.id<>r.id AND (lower(u.username)=lower(candidate) OR lower(u.display_name)=lower(candidate))) LOOP
        candidate:='Mitglied '||r.id||' ('||suffix||')'; suffix:=suffix+1;
      END LOOP;
      UPDATE app_users SET display_name=candidate WHERE id=r.id;
    END IF;
  END LOOP;
END $$;
CREATE UNIQUE INDEX app_users_display_name ON app_users(lower(display_name));
